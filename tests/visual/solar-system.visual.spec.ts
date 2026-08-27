import { expect, test } from '@playwright/test'

import { captureVisualScene } from './visualTest'

test.describe('solar-system canvas', () => {
  test('Sun texture', async ({ page }) => {
    const screenshot = await captureVisualScene(page, {
      target: 'sun',
      date: '2026-01-01',
    })

    expect(screenshot).toMatchSnapshot('sun.png')
  })

  test('Halley at 1986 perihelion', async ({ page }) => {
    const screenshot = await captureVisualScene(page, {
      target: 'halley',
      date: '1986-02-09',
    })

    expect(screenshot).toMatchSnapshot('halley-1986-02-09.png')
  })

  test('Europa Clipper at Jupiter arrival', async ({ page }) => {
    const screenshot = await captureVisualScene(page, {
      target: 'europaclipper',
      date: '2030-04-11',
    })

    expect(screenshot).toMatchSnapshot('europa-clipper-2030-04-11.png')
  })
})
