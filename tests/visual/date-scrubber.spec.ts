import { expect, test } from '@playwright/test'

test('quick date scrubber reaches both model-time boundaries', async ({
  page,
}) => {
  await page.goto('/?visual-test=1', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-date-jump]').click()

  const slider = page.getByRole('slider', {
    name: /1950.*2050/u,
  })
  await expect(slider).toBeVisible()

  await slider.focus()
  await slider.press('End')
  await expect(page.locator('.date-popover-selected')).toHaveText(
    '2050.12.31',
  )
  await expect(page).toHaveURL(/date=2050-12-31/u)

  await slider.press('Home')
  await expect(page.locator('.date-popover-selected')).toHaveText(
    '1950.01.01',
  )
  await expect(page).toHaveURL(/date=1950-01-01/u)
})
