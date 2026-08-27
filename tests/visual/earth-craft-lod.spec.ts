import { expect, test } from '@playwright/test'

test.describe('near-Earth spacecraft LOD', () => {
  test('overview uses one stable label cluster and selection reveals detail', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const cluster = page.locator('.earth-craft-cluster')
    await expect(cluster).toBeVisible()
    const targetButtons = cluster.locator('[data-craft-id]')
    await expect(targetButtons).toHaveCount(4)
    await expect
      .poll(() =>
        targetButtons.evaluateAll((buttons) =>
          buttons
            .map((button) => button.getAttribute('data-craft-id'))
            .sort(),
        ),
      )
      .toEqual(['hubble', 'iss', 'jwst', 'tiangong'])

    await cluster.locator('[data-craft-id="iss"]').click()
    await expect(cluster).toBeHidden()
    await expect(
      page.locator('.craft-label').filter({ hasText: '国际空间站' }),
    ).toBeVisible()
  })
})
