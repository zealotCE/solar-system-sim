import { expect, test } from '@playwright/test'

test('historical encounter playback follows the spacecraft', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0
    window.cancelIdleCallback = () => undefined
  })
  await page.goto('/?visual-test=1', { waitUntil: 'domcontentloaded' })

  await page.locator('[data-panel-id="stories"]').click()
  await page
    .locator('[data-story-id="galileo-jupiter-system"]')
    .click()
  await expect(
    page.locator('[data-story-id="galileo-jupiter-system"]'),
  ).toContainText('GALILEO')
  await page.locator('[data-event-id="venus"]').click()
  await page.locator('[data-story-action]').click()

  await expect(page).toHaveURL(/target=galileo/u)
  await expect(page).toHaveURL(/date=1990-02-10/u)
  await expect(page).toHaveURL(/scale=true/u)
  await expect(
    page.locator('.craft-label[data-craft-id="galileo"]'),
  ).toBeVisible({ timeout: 45_000 })
  await expect(
    page.locator('.planet-label-active').filter({ hasText: '金星' }),
  ).toHaveCount(0)
})
