import { expect, type Page } from '@playwright/test'

const SETTLE_FRAMES = 60

export type VisualScene = {
  target: string
  date: string
  trueScale?: boolean
}

function sceneUrl(scene: VisualScene): string {
  const hash = new URLSearchParams({
    target: scene.target,
    date: scene.date,
    lang: 'en',
  })
  if (scene.trueScale) hash.set('scale', 'true')
  return `/?visual-test=1#${hash.toString()}`
}

export async function captureVisualScene(page: Page, scene: VisualScene): Promise<Buffer> {
  await page.addInitScript(() => {
    let state = 0x5eed1234
    Math.random = () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 4294967296
    }
    // CameraRig uses 1 - exp(-9 * delta). In the visual harness, snap that
    // damping step to its exact destination instead of stopping within a
    // frame-rate-dependent tolerance band.
    const nativeExp = Math.exp
    Math.exp = (value) => (value < 0 ? 0 : nativeExp(value))
    // The selected mission loads immediately. Suppress unrelated progressive
    // idle loads so they cannot race a baseline capture.
    window.requestIdleCallback = () => 0
    window.cancelIdleCallback = () => undefined
  })

  await page.goto(sceneUrl(scene), { waitUntil: 'domcontentloaded' })

  // Selected trajectories, textures, and models must finish before comparison.
  await expect
    .poll(() =>
      page.evaluate(() => ({
        date: document.documentElement.dataset.visualTestDate,
        state: document.documentElement.dataset.visualTestState,
        target: document.documentElement.dataset.visualTestTarget,
      })),
      { timeout: 45_000 },
    )
    .toEqual({ date: scene.date, state: 'ready', target: scene.target })
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.dataset.visualTestFrame),
      { timeout: 45_000 },
    )
    .toBe('ready')
  await page.waitForLoadState('networkidle', { timeout: 45_000 })

  const canvas = page.locator('.app-shell canvas').first()
  await expect(canvas).toBeVisible()

  const rendering = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const gl = target.getContext('webgl2') ?? target.getContext('webgl')
    if (!gl) throw new Error('Visual regression requires a WebGL context')
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
    return {
      antialias: gl.getContextAttributes()?.antialias ?? false,
      clientHeight: target.clientHeight,
      clientWidth: target.clientWidth,
      devicePixelRatio: window.devicePixelRatio,
      height: target.height,
      renderer,
      samples: Number(gl.getParameter(gl.SAMPLES)),
      width: target.width,
    }
  })

  expect(rendering.devicePixelRatio).toBe(1)
  expect(rendering.width).toBe(rendering.clientWidth)
  expect(rendering.height).toBe(rendering.clientHeight)
  expect(rendering.antialias).toBe(true)
  expect(rendering.samples).toBeGreaterThan(0)
  expect(rendering.renderer).toMatch(/SwiftShader/i)

  // Canvas pixels only: omit DOM labels, controls, fonts, and CSS overlays.
  await canvas.evaluate((element) => {
    element.parentElement?.parentElement?.setAttribute('data-visual-canvas-root', '')
  })
  await page.addStyleTag({
    content: `
      .app-shell > :not([data-visual-canvas-root]) { display: none !important; }
      [data-visual-canvas-root] * { visibility: hidden !important; }
      [data-visual-canvas-root] canvas { visibility: visible !important; }
    `,
  })
  const clip = await canvas.boundingBox()
  if (!clip) throw new Error('Visual regression canvas has no screenshot bounds')

  // Run a fixed number of frames after deterministic refocus. The in-scene
  // frame marker stops requestAnimationFrame at the exact target.
  const stoppedFrame = await page.evaluate((settleFrames) => {
    const visualWindow = window as typeof window & {
      __solarVisualFrameCount?: number
      __solarVisualStopFrame?: number
    }
    const currentFrame = visualWindow.__solarVisualFrameCount ?? 0
    visualWindow.__solarVisualStopFrame = currentFrame + settleFrames
    return currentFrame + settleFrames + 1
  }, SETTLE_FRAMES)
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as typeof window & { __solarVisualFrameCount?: number })
              .__solarVisualFrameCount ?? 0,
        ),
      { timeout: 90_000 },
    )
    .toBeGreaterThanOrEqual(stoppedFrame)
  await page.waitForTimeout(100)

  return page.screenshot({ clip, scale: 'css', type: 'png' })
}
