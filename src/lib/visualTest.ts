const VISUAL_TEST_PARAMETER = 'visual-test'

type VisualTestWindow = typeof window & {
  __solarVisualFrameCount?: number
  __solarVisualStopFrame?: number
}

/** True only for the opt-in Playwright rendering harness. */
export function isVisualTestMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(VISUAL_TEST_PARAMETER) === '1'
}

/** Small deterministic PRNG for visual geometry that would otherwise use Math.random. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Lets the browser harness distinguish a mounted canvas from a rendered scene. */
export function markVisualTestFrameReady(): void {
  if (isVisualTestMode()) {
    const visualWindow = window as VisualTestWindow
    const frameCount = (visualWindow.__solarVisualFrameCount ?? 0) + 1
    visualWindow.__solarVisualFrameCount = frameCount
    document.documentElement.dataset.visualTestFrame = 'ready'
    document.documentElement.dataset.visualTestFrameCount = String(frameCount)
    if (
      visualWindow.__solarVisualStopFrame !== undefined &&
      frameCount >= visualWindow.__solarVisualStopFrame
    ) {
      window.requestAnimationFrame = () => 0
    }
  }
}
