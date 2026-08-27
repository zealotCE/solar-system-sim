import { expect, test } from '@playwright/test'

test.describe('near-Earth spacecraft LOD', () => {
  test('overview uses one stable label cluster and selection reveals detail', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.requestIdleCallback = () => 0
      window.cancelIdleCallback = () => undefined
    })
    await page.goto('/?visual-test=1', { waitUntil: 'domcontentloaded' })

    const cluster = page.locator('.earth-craft-cluster')
    await expect(cluster).toBeVisible()
    await expect(page.locator('.planet-label')).toHaveCount(10)
    await expect(page.locator('.planet-label--minor')).toHaveCount(0)
    await expect(page.locator('.craft-label')).toHaveCount(0)
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

    const clickGeometry = await cluster.evaluate((element) => {
      const clusterRect = element.getBoundingClientRect()
      const anchorRect =
        element.parentElement?.parentElement?.getBoundingClientRect()
      const firstButton = element.querySelector('button')
      return {
        anchor: {
          x: anchorRect?.x ?? 0,
          y: anchorRect?.y ?? 0,
        },
        cluster: {
          bottom: clusterRect.bottom,
          left: clusterRect.left,
          right: clusterRect.right,
          top: clusterRect.top,
        },
        clusterPointerEvents: getComputedStyle(element).pointerEvents,
        targetPointerEvents: firstButton
          ? getComputedStyle(firstButton).pointerEvents
          : '',
      }
    })
    expect(clickGeometry.clusterPointerEvents).toBe('none')
    expect(clickGeometry.targetPointerEvents).toBe('auto')
    expect(
      clickGeometry.anchor.x >= clickGeometry.cluster.left &&
        clickGeometry.anchor.x <= clickGeometry.cluster.right &&
        clickGeometry.anchor.y >= clickGeometry.cluster.top &&
        clickGeometry.anchor.y <= clickGeometry.cluster.bottom,
    ).toBe(false)

    await page.mouse.click(clickGeometry.anchor.x, clickGeometry.anchor.y)
    await expect(
      page.locator('.planet-label-active').filter({ hasText: '地球' }),
    ).toBeVisible()
    await expect(cluster).toBeHidden()

    await page.goto('/?visual-test=1', { waitUntil: 'domcontentloaded' })
    await expect(cluster).toBeVisible()
    await cluster.locator('[data-craft-id="iss"]').click()
    await expect(cluster).toBeHidden()
    await expect(
      page.locator('.craft-label').filter({ hasText: '国际空间站' }),
    ).toBeVisible()
  })
})
