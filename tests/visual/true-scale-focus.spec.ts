import { expect, test } from '@playwright/test'

test('true-scale craft supports physical close-up with an anchored label', async ({
  page,
}) => {
  test.setTimeout(180_000)
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
    const intended = Number.parseFloat(
      element.style.getPropertyValue('--craft-label-offset'),
    )
    return { x: matrix.m41, y: matrix.m42, intended }
  })
  expect(Math.abs(labelOffset.x)).toBeLessThan(0.1)
  expect(labelOffset.intended).toBeGreaterThanOrEqual(32)
  expect(labelOffset.y).toBeCloseTo(-labelOffset.intended, 1)

  const cameraLimits = await page.evaluate(() => ({
    minDistance: Number(
      document.documentElement.dataset.visualTestCameraMinDistance,
    ),
    near: Number(document.documentElement.dataset.visualTestCameraNear),
  }))
  expect(cameraLimits.minDistance).toBeLessThan(1e-8)
  expect(cameraLimits.near).toBeLessThanOrEqual(1e-12)
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          centerError: Number(
            document.documentElement.dataset
              .visualTestPrecisionOrbitCenterError,
          ),
          mode:
            document.documentElement.dataset.visualTestPrecisionOrbit,
        })),
      { timeout: 15_000 },
    )
    .toEqual({ centerError: 0, mode: 'local' })

  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 5e-9
  })

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
