import { expect, test } from '@playwright/test'

test('true-scale craft supports physical close-up with an anchored label', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto(
    '/?visual-test=1#target=voyager2&date=2026-11-14&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.dataset.visualTestState),
      { timeout: 90_000 },
    )
    .toBe('ready')

  const label = page.locator('[data-craft-id="voyager2"]')
  await expect(label).toBeVisible()
  await expect(label).toHaveClass(/craft-label--anchored/u)
  const labelOffset = await label.evaluate((element) => {
    const transform = getComputedStyle(element).transform
    const matrix = new DOMMatrixReadOnly(transform)
    return { x: matrix.m41, y: matrix.m42 }
  })
  expect(Math.abs(labelOffset.x)).toBeLessThan(0.1)
  expect(labelOffset.y).toBeCloseTo(-29, 1)

  const cameraLimits = await page.evaluate(() => ({
    minDistance: Number(
      document.documentElement.dataset.visualTestCameraMinDistance,
    ),
    near: Number(document.documentElement.dataset.visualTestCameraNear),
  }))
  expect(cameraLimits.minDistance).toBeLessThan(1e-8)
  expect(cameraLimits.near).toBeLessThanOrEqual(1e-12)

  const canvas = page.locator('.app-shell canvas').first()
  const bounds = await canvas.boundingBox()
  if (!bounds) throw new Error('Canvas has no bounds')
  await page.mouse.move(bounds.x + bounds.width * 0.45, bounds.y + bounds.height * 0.45)
  for (let index = 0; index < 90; index += 1) {
    await page.mouse.wheel(0, -120)
  }

  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Number(document.documentElement.dataset.visualTestCameraDistance),
        ),
      { timeout: 15_000 },
    )
    .toBeLessThan(1e-8)
})
