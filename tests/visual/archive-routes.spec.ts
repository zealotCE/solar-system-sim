import { expect, test } from '@playwright/test'

test.describe('static archive routes', () => {
  test('loads a natural body from its indexable path', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto(
      '/objects/earth?visual-test=1#date=2028-04-15&lang=en',
      { waitUntil: 'domcontentloaded' },
    )

    // Read the harness attribute via CDP. page.evaluate can stall for minutes
    // while SwiftShader owns the main thread after the first WebGL mount.
    await expect(page.locator('html')).toHaveAttribute(
      'data-visual-test-target',
      'earth',
      { timeout: 180_000 },
    )
    await expect(page).toHaveURL(
      /\/objects\/earth\?visual-test=1#target=earth&lang=en&date=2028-04-15$/u,
    )
    await expect(page).toHaveTitle('Earth | Solar System Observatory')
  })

  test('loads a spacecraft from its mission path', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto(
      '/missions/newhorizons?visual-test=1#date=2028-04-15&lang=en',
      { waitUntil: 'domcontentloaded' },
    )

    await expect(page.locator('html')).toHaveAttribute(
      'data-visual-test-target',
      'newhorizons',
      { timeout: 180_000 },
    )
    await expect(page).toHaveURL(
      /\/missions\/newhorizons\?visual-test=1#target=newhorizons&lang=en&date=2028-04-15$/u,
    )
    await expect(page).toHaveTitle(
      'New Horizons | Solar System Observatory',
    )
  })
})
