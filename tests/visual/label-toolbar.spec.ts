import { expect, test } from '@playwright/test'

test('label control cycles three modes without widening the toolbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/?visual-test=1', { waitUntil: 'domcontentloaded' })

  const labelControl = page.locator('[data-label-mode]')
  await expect(labelControl).toHaveAttribute('data-label-mode', 'primary')
  const primaryLabelCount = await page.locator('.planet-label').count()

  await labelControl.click()
  await expect(labelControl).toHaveAttribute('data-label-mode', 'all')
  await expect
    .poll(() => page.locator('.planet-label').count())
    .toBeGreaterThan(primaryLabelCount)

  await labelControl.click()
  await expect(labelControl).toHaveAttribute('data-label-mode', 'off')
  await expect(page.locator('.planet-label')).toHaveCount(0)
  await expect(page.locator('.kuiper-belt-label')).toHaveCount(0)

  await labelControl.click()
  await expect(labelControl).toHaveAttribute('data-label-mode', 'primary')

  const deck = page.locator('.control-deck')
  const parameters = page.locator('[data-panel-id="parameters"]')
  await expect(parameters).toBeInViewport()
  const [deckBox, parametersBox] = await Promise.all([
    deck.boundingBox(),
    parameters.boundingBox(),
  ])
  expect(deckBox).not.toBeNull()
  expect(parametersBox).not.toBeNull()
  expect(parametersBox!.x + parametersBox!.width).toBeLessThanOrEqual(
    deckBox!.x + deckBox!.width + 1,
  )

  const panelOverflow = await page.locator('.panel-tools').evaluate(
    (element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }),
  )
  expect(panelOverflow.scrollWidth).toBeLessThanOrEqual(
    panelOverflow.clientWidth + 1,
  )
})
