import { expect, test } from '@playwright/test'

test.describe('near-Earth spacecraft LOD', () => {
  test('English mission names stay inside the adaptive cluster', async ({
    page,
  }) => {
    await page.goto('/?visual-test=1#lang=en&date=2026-08-31', {
      waitUntil: 'domcontentloaded',
    })

    const cluster = page.locator('.earth-craft-cluster')
    await expect(cluster).toBeVisible()
    const names = cluster.locator('.earth-craft-cluster__name')
    await expect(names).toHaveCount(5)
    expect((await names.allTextContents()).sort()).toEqual([
      'Hubble Space Telescope',
      'International Space Station',
      'James Webb Space Telescope',
      'Nancy Grace Roman Space Telescope',
      'Tiangong Space Station',
    ])

    const layout = await cluster.evaluate((element) => {
      const targets = element.querySelector('.earth-craft-cluster__targets')
      const buttons = Array.from(element.querySelectorAll('button'))
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        columns: targets
          ? getComputedStyle(targets).gridTemplateColumns.split(' ').length
          : 0,
        buttonsFit: buttons.every(
          (button) => button.scrollWidth <= button.clientWidth,
        ),
      }
    })
    expect(layout.clientWidth).toBeGreaterThan(176)
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    expect(layout.columns).toBe(2)
    expect(layout.buttonsFit).toBe(true)
  })

  test('overview uses one stable label cluster and selection reveals detail', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.requestIdleCallback = () => 0
      window.cancelIdleCallback = () => undefined
    })
    await page.goto('/?visual-test=1&case=iss#date=2026-08-31', {
      waitUntil: 'domcontentloaded',
    })

    const cluster = page.locator('.earth-craft-cluster')
    await expect(cluster).toBeVisible()
    await expect(page.locator('.planet-label')).toHaveCount(10)
    await expect(page.locator('.planet-label--minor')).toHaveCount(0)
    await expect(page.locator('.craft-label')).toHaveCount(0)
    const targetButtons = cluster.locator('[data-craft-id]')
    await expect(targetButtons).toHaveCount(5)
    await expect
      .poll(() =>
        targetButtons.evaluateAll((buttons) =>
          buttons
            .map((button) => button.getAttribute('data-craft-id'))
            .sort(),
        ),
      )
      .toEqual(['hubble', 'iss', 'jwst', 'roman', 'tiangong'])

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

    await page.goto('/?visual-test=1&case=roman#date=2026-08-31', {
      waitUntil: 'domcontentloaded',
    })
    await expect(cluster).toBeVisible()
    await cluster.locator('[data-craft-id="iss"]').click()
    await expect(cluster).toBeHidden()
    await expect(
      page.locator('.craft-label').filter({ hasText: '国际空间站' }),
    ).toBeVisible()
  })

  test('Roman stays out of the physical scene before launch', async ({
    page,
  }) => {
    await page.goto('/?visual-test=1#date=2026-08-29', {
      waitUntil: 'domcontentloaded',
    })
    const cluster = page.locator('.earth-craft-cluster')
    await expect(cluster).toBeVisible()
    await expect(cluster.locator('[data-craft-id="roman"]')).toHaveCount(0)
  })

  test('Roman appears after launch and loads the NASA model', async ({
    page,
  }) => {
    await page.goto('/?visual-test=1#date=2026-08-31', {
      waitUntil: 'domcontentloaded',
    })
    const romanTarget = page.locator(
      '.earth-craft-cluster [data-craft-id="roman"]',
    )
    await expect(romanTarget).toBeVisible()
    await romanTarget.click()

    const romanLabel = page.locator(
      '.craft-label[data-craft-id="roman"]',
    )
    await expect(romanLabel).toBeVisible()
    await expect(romanLabel).toHaveAttribute('data-model-state', 'ready', {
      timeout: 20_000,
    })
  })
})
