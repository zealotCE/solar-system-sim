import { expect, test } from '@playwright/test'

test('true-scale focus uses a target-centred precision arc and label', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto(
    '/?visual-test=1#target=halley&date=2026-02-24&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.dataset.visualTestState),
      { timeout: 90_000 },
    )
    .toBe('ready')
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.dataset.visualTestPrecisionOrbit,
        ),
      { timeout: 15_000 },
    )
    .toBe('local')

  const diagnostics = await page.evaluate(() => ({
    centerError: Number(
      document.documentElement.dataset.visualTestPrecisionOrbitCenterError,
    ),
    labelWorld: document.documentElement.dataset.visualTestLabelWorld
      ?.split(',')
      .map(Number),
    targetWorld: document.documentElement.dataset.visualTestTargetWorld
      ?.split(',')
      .map(Number),
  }))
  expect(diagnostics.centerError).toBe(0)
  expect(diagnostics.labelWorld).toEqual(diagnostics.targetWorld)

  const label = page.locator('.planet-label-active')
  await expect(label).toHaveClass(/planet-label--anchored/u)
  const rect = await label.boundingBox()
  const viewport = page.viewportSize()
  if (!rect || !viewport) throw new Error('Missing focused-label bounds')
  expect(rect.x + rect.width / 2).toBeCloseTo(viewport.width / 2, 1)
  expect(rect.y + rect.height / 2).toBeLessThan(viewport.height / 2)
})
