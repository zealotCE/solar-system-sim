// Dev helper: capture screenshots of the running dev or preview server,
// optionally clicking through UI first.
//
//   node scripts/capture.mjs out.png [action ...]
//
// Actions: click:<text> | wait:<ms> | wheel:<deltaY> | drag:<dx>:<dy> |
//          assert:<visible text> | assert-not:<visible text>
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const [, , outPath = 'preview.png', ...actions] = process.argv
const captureUrl = process.env.CAPTURE_URL ?? 'http://localhost:4317/'
const captureWidth = Number(process.env.CAPTURE_WIDTH) || 1600
const captureHeight = Number(process.env.CAPTURE_HEIGHT) || 1000
const parsedCaptureUrl = new URL(captureUrl)
const visualTestScene = parsedCaptureUrl.searchParams.has('visual-test')
  ? Object.fromEntries(new URLSearchParams(parsedCaptureUrl.hash.slice(1)))
  : null

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--force-color-profile=srgb',
  ],
})

try {
  const page = await browser.newPage({
    viewport: { width: captureWidth, height: captureHeight },
  })
  await page.goto(captureUrl, {
    waitUntil: 'domcontentloaded',
  })
  if (visualTestScene?.target && visualTestScene.date) {
    await page.waitForFunction(
      ({ date, target }) =>
        document.documentElement.dataset.visualTestDate === date &&
        document.documentElement.dataset.visualTestState === 'ready' &&
        document.documentElement.dataset.visualTestTarget === target &&
        document.documentElement.dataset.visualTestFrame === 'ready',
      { date: visualTestScene.date, target: visualTestScene.target },
      { timeout: 90_000 },
    )
    await page.waitForLoadState('networkidle', { timeout: 45_000 })
  }
  await page.waitForTimeout(4500)
  // Real input wakes the compositor: without it the headless shell can leave
  // the page throttled and the WebGL requestAnimationFrame loop never starts.
  await page.mouse.move(720, 420)
  await page.mouse.move(760, 440)
  await page.waitForTimeout(600)

  for (const action of actions) {
    const [kind, ...rest] = action.split(':')
    const value = rest.join(':')
    if (kind === 'click') {
      // Dispatch inside the page: Playwright's click machinery stalls on
      // "scheduled navigations" with this cached headless-shell build.
      const clicked = await page.evaluate((text) => {
        const match = [...document.querySelectorAll('button')].find(
          (button) => button.textContent?.includes(text) || button.title.includes(text),
        )
        if (match) match.click()
        return Boolean(match)
      }, value)
      if (!clicked) throw new Error(`No button matching "${value}"`)
      await page.waitForTimeout(900)
    } else if (kind === 'wheel') {
      await page.mouse.move(700, 400)
      await page.mouse.wheel(0, Number(value) || 500)
      await page.waitForTimeout(700)
    } else if (kind === 'drag') {
      const [deltaX = 0, deltaY = 0] = rest.map(Number)
      await page.mouse.move(700, 400)
      await page.mouse.down()
      await page.mouse.move(700 + deltaX, 400 + deltaY, { steps: 24 })
      await page.mouse.up()
      await page.waitForTimeout(900)
    } else if (kind === 'wait') {
      await page.waitForTimeout(Number(value) || 1000)
    } else if (kind === 'assert' || kind === 'assert-not') {
      const present = await page.evaluate(
        (text) => document.body.innerText.includes(text),
        value,
      )
      const expected = kind === 'assert'
      if (present !== expected) {
        throw new Error(
          expected
            ? `Expected page text "${value}"`
            : `Unexpected page text "${value}"`,
        )
      }
    }
  }

  await page.waitForTimeout(1200)
  // Raw CDP screenshot: page.screenshot() can hang forever on document.fonts.ready
  // when the WebGL rAF loop starves the compositor under software rendering.
  const session = await page.context().newCDPSession(page)
  const { data } = await session.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(outPath, Buffer.from(data, 'base64'))
  console.log('saved', outPath)
} finally {
  await browser.close()
}
