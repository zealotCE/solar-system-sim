// Dev helper: capture screenshots of the running dev server, optionally
// clicking through UI first. Reuses the Playwright-cached headless shell.
//
//   node scripts/capture.mjs out.png [action ...]
//
// Actions: click:<text> | wait:<ms> | wheel:<deltaY>
import { existsSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const [, , outPath = 'preview.png', ...actions] = process.argv

function findHeadlessShell() {
  const root = join(homedir(), 'Library/Caches/ms-playwright')
  const candidates = [
    'chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chromium-1217/chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
  ]
  for (const candidate of candidates) {
    const full = join(root, candidate)
    if (existsSync(full)) return full
  }
  throw new Error('No cached Chromium found under ' + root)
}

const browser = await chromium.launch({
  executablePath: findHeadlessShell(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  await page.goto('http://localhost:4317/', { waitUntil: 'domcontentloaded' })
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
    } else if (kind === 'wait') {
      await page.waitForTimeout(Number(value) || 1000)
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
