import { expect, test } from '@playwright/test'

import { readHtmlNumber, waitForHtmlNumber, waitForVisualReady } from './visualTest'

test('true-scale craft supports physical close-up with an anchored label', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto(
    '/?visual-test=1#target=voyager2&date=2026-11-14&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  await waitForVisualReady(page, 180_000)

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

  const cameraLimits = {
    minDistance: await waitForHtmlNumber(
      page,
      'data-visual-test-camera-min-distance',
      60_000,
    ),
    near: await waitForHtmlNumber(page, 'data-visual-test-camera-near', 60_000),
  }
  expect(cameraLimits.minDistance).toBeLessThan(1e-8)
  expect(cameraLimits.near).toBeLessThanOrEqual(1e-12)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-visual-test-precision-orbit', 'local', {
    timeout: 30_000,
  })
  await expect(html).toHaveAttribute(
    'data-visual-test-precision-orbit-center-error',
    '0',
    { timeout: 30_000 },
  )

  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 5e-9
  })

  await expect
    .poll(() => readHtmlNumber(page, 'data-visual-test-camera-distance'), {
      timeout: 30_000,
    })
    .toBeLessThan(1e-8)
})
