import { expect, test } from '@playwright/test'

test.describe('static archive routes', () => {
  test('loads a natural body from its indexable path', async ({ page }) => {
    await page.goto(
      '/objects/earth?visual-test=1#date=2028-04-15&lang=en',
      { waitUntil: 'domcontentloaded' },
    )

    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.dataset.visualTestTarget,
          ),
        { timeout: 30_000 },
      )
      .toBe('earth')
    await expect(page).toHaveURL(
      /\/objects\/earth\?visual-test=1#target=earth&lang=en&date=2028-04-15$/u,
    )
    await expect(page).toHaveTitle('Earth | Solar System Observatory')
  })

  test('loads a spacecraft from its mission path', async ({ page }) => {
    await page.goto(
      '/missions/newhorizons?visual-test=1#date=2028-04-15&lang=en',
      { waitUntil: 'domcontentloaded' },
    )

    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.dataset.visualTestTarget,
          ),
        { timeout: 30_000 },
      )
      .toBe('newhorizons')
    await expect(page).toHaveURL(
      /\/missions\/newhorizons\?visual-test=1#target=newhorizons&lang=en&date=2028-04-15$/u,
    )
    await expect(page).toHaveTitle(
      'New Horizons | Solar System Observatory',
    )
  })
})
