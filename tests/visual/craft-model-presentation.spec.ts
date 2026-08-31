import { expect, test } from '@playwright/test'

type AuditMetrics = {
  longestSpan: number
  coreRadius: number
  coreToSpanRatio: number
  triangleCount: number
}

test('every official spacecraft model has a measurable readable core', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto(
    '/?visual-test=1&model-audit=1#target=sun&date=2026-02-10&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.documentElement.dataset
          const actual = Number(root.visualTestModelAuditCount ?? 0)
          const expected = Number(root.visualTestModelAuditExpected ?? 0)
          return expected >= 16 && actual === expected
        }),
      { timeout: 240_000 },
    )
    .toBe(true)

  const { expected, results } = await page.evaluate(() => ({
    expected: Number(
      document.documentElement.dataset.visualTestModelAuditExpected,
    ),
    results: JSON.parse(
      document.documentElement.dataset.visualTestModelAudit ?? '{}',
    ) as Record<string, AuditMetrics | 'error'>,
  }))
  expect(Object.keys(results)).toHaveLength(expected)
  for (const [id, result] of Object.entries(results)) {
    expect(result, `${id} must load and expose geometry`).not.toBe('error')
    if (result === 'error') continue
    expect(result.longestSpan, `${id} full span`).toBeGreaterThan(0)
    expect(result.coreRadius, `${id} core radius`).toBeGreaterThan(0)
    expect(result.coreToSpanRatio, `${id} core ratio`).toBeGreaterThanOrEqual(
      0.08,
    )
    expect(result.coreToSpanRatio, `${id} core ratio`).toBeLessThanOrEqual(1)
    expect(result.triangleCount, `${id} triangle count`).toBeGreaterThan(0)
  }

  expect(
    (results.voyager1 as AuditMetrics).coreToSpanRatio,
  ).toBeLessThan(0.5)
  expect(
    (results.pioneer10 as AuditMetrics).coreToSpanRatio,
  ).toBeLessThan(0.4)
  expect((results.roman as AuditMetrics).triangleCount).toBeGreaterThan(100)
})
