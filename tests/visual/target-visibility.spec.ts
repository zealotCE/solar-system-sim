import { expect, test } from '@playwright/test'

test('selected Halley uses its body without a crosshair overlay', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto(
    '/?visual-test=1#target=halley&date=2026-06-02&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  const label = page.locator('[data-body-id="halley"]')
  await expect(label).toBeVisible({ timeout: 90_000 })
  await expect
    .poll(() => label.getAttribute('data-locator-state'), {
      timeout: 90_000,
    })
    .toBe('hidden')
  await expect
    .poll(() =>
      label.evaluate((element) =>
        Number(element.getAttribute('data-body-diameter-pixels')),
      ),
    )
    .toBeGreaterThan(20)
})

test('Voyager scales its readable core while capping the full boom span', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.goto(
    '/?visual-test=1#target=voyager2&date=2026-01-06&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  const label = page.locator('[data-craft-id="voyager2"]')
  await expect(label).toBeVisible({ timeout: 90_000 })
  await expect(label).toHaveAttribute('data-model-state', 'ready', {
    timeout: 60_000,
  })
  await expect(label).toHaveAttribute('data-proxy-state', 'visible', {
    timeout: 90_000,
  })
  await expect
    .poll(
      () =>
        label.evaluate(
          (element) =>
            Number(element.getAttribute('data-model-core-ratio')) !== 1,
        ),
      { timeout: 90_000 },
    )
    .toBe(true)
  const presentation = await label.evaluate((element) => {
    const corePixels = Number(element.getAttribute('data-proxy-pixels'))
    const coreRatio = Number(
      element.getAttribute('data-model-core-ratio'),
    )
    return {
      corePixels,
      coreRatio,
      fullSpanPixels: corePixels / coreRatio,
    }
  })
  expect(presentation.corePixels).toBeGreaterThanOrEqual(64)
  expect(presentation.coreRatio).toBeGreaterThan(0.3)
  expect(presentation.coreRatio).toBeLessThan(0.6)
  expect(presentation.fullSpanPixels).toBeLessThanOrEqual(156.01)

  const setPhysicalCorePixels = async (targetPixels: number) => {
    await page.evaluate((target) => {
      const label = document.querySelector('[data-craft-id="voyager2"]')
      const currentCorePixels = Number(
        label?.getAttribute('data-physical-core-pixels'),
      )
      const currentDistance = Number(
        document.documentElement.dataset.visualTestCameraDistance,
      )
      const visualWindow = window as typeof window & {
        __solarVisualCameraDistance?: number
      }
      visualWindow.__solarVisualCameraDistance =
        (currentDistance * currentCorePixels) / target
    }, targetPixels)
    await expect
      .poll(
        () =>
          label.evaluate(
            (element, target) =>
              Math.abs(
                Number(
                  element.getAttribute('data-physical-core-pixels'),
                ) - target,
              ),
            targetPixels,
          ),
        { timeout: 90_000 },
      )
      .toBeLessThan(1)
  }

  await setPhysicalCorePixels(39)
  await expect(label).toHaveAttribute('data-proxy-state', 'visible', {
    timeout: 60_000,
  })
  const convergedProxyPixels = Number(
    await label.getAttribute('data-proxy-pixels'),
  )
  expect(convergedProxyPixels).toBeGreaterThanOrEqual(39)
  expect(convergedProxyPixels).toBeLessThan(42)
  const proxyLabelOffset = await label.evaluate((element) =>
    Number.parseFloat(element.style.getPropertyValue('--craft-label-offset')),
  )

  await setPhysicalCorePixels(41)
  await expect(label).toHaveAttribute('data-proxy-state', 'hidden', {
    timeout: 60_000,
  })
  const physicalLabelOffset = await label.evaluate((element) =>
    Number.parseFloat(element.style.getPropertyValue('--craft-label-offset')),
  )
  expect(Math.abs(physicalLabelOffset - proxyLabelOffset)).toBeLessThan(3)
  await setPhysicalCorePixels(33)
  await expect(label).toHaveAttribute('data-proxy-state', 'visible', {
    timeout: 60_000,
  })
})

test('crowded Voyager 2 label remains a full clickable button', async ({
  page,
}) => {
  await page.goto('/?visual-test=1#date=2026-06-02&lang=en', {
    waitUntil: 'domcontentloaded',
  })
  await page.locator('[data-label-mode="primary"]').click()

  const label = page.locator(
    '.scene-label-hit[data-craft-id="voyager2"]',
  )
  await expect(label).toBeVisible({ timeout: 30_000 })
  await expect(label).toHaveCSS('pointer-events', 'auto')
  await expect(label).toHaveAttribute('data-layout-y', /-?\d+/u)
  await label.click()
  await expect(page).toHaveURL(/#target=voyager2(?:&|$)/u)
})

test('Apophis keeps a procedural body if its official model fails', async ({
  page,
}) => {
  await page.route('**/models/apophis.glb', (route) =>
    route.abort('failed'),
  )
  await page.goto(
    '/?visual-test=1#target=apophis&date=2030-03-07&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  const label = page.locator('[data-body-id="apophis"]')
  await expect(label).toBeVisible({ timeout: 90_000 })
  await expect(label).toHaveAttribute('data-model-state', 'fallback', {
    timeout: 30_000,
  })
  await expect(page.locator('canvas').first()).toBeVisible()
})

test('spacecraft proxy waits for and then hands off to the detailed model', async ({
  page,
}) => {
  test.setTimeout(300_000)
  let releaseModel = () => {}
  const modelGate = new Promise<void>((resolve) => {
    releaseModel = resolve
  })
  await page.route('**/models/juno.glb', async (route) => {
    await modelGate
    await route.continue()
  })
  await page.goto(
    '/?visual-test=1#target=juno&date=2030-03-07&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  const label = page.locator('[data-craft-id="juno"]')
  await expect(label).toBeVisible({ timeout: 90_000 })
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(
            Number(
              document.documentElement.dataset.visualTestCameraDistance,
            ) - 0.0024,
          ),
        ),
      { timeout: 90_000 },
    )
    .toBeLessThan(0.001)
  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 4e-10
  })

  await expect(label).toHaveAttribute('data-model-state', 'loading')
  await expect(label).toHaveAttribute('data-proxy-state', 'visible')
  releaseModel()
  await expect(label).toHaveAttribute('data-model-state', 'ready', {
    timeout: 60_000,
  })
  await expect(label).toHaveAttribute('data-proxy-state', 'hidden')

  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 1e-6
  })
  await expect(label).toHaveAttribute('data-proxy-state', 'visible')

  await page.goto(
    '/?visual-test=1#target=juno&date=2030-03-07&lang=en',
    { waitUntil: 'domcontentloaded' },
  )
  await expect(page.locator('[data-craft-id="juno"]')).toHaveAttribute(
    'data-model-state',
    'ready',
    { timeout: 90_000 },
  )
})

test('ISS keeps one local-orbit tangent across the close-up LOD switch', async ({
  page,
}) => {
  await page.goto(
    '/?visual-test=1#target=iss&date=2026-06-02&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(
            Number(
              document.documentElement.dataset.visualTestCameraDistance,
            ) - 0.0024,
          ),
        ),
      { timeout: 90_000 },
    )
    .toBeLessThan(0.001)

  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 1e-6
  })
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.dataset.visualTestPrecisionOrbit,
        ),
      { timeout: 30_000 },
    )
    .toBe('local')

  const tangentDot = await page.evaluate(() => {
    const parse = (value: string | undefined) =>
      value?.split(',').map(Number) ?? []
    const expected = parse(
      document.documentElement.dataset.visualTestArtificialOrbitTangent,
    )
    const actual = parse(
      document.documentElement.dataset.visualTestPrecisionOrbitTangent,
    )
    return expected.reduce(
      (sum, component, index) => sum + component * (actual[index] ?? 0),
      0,
    )
  })
  expect(tangentDot).toBeGreaterThan(0.999999)
})

test('close Pluto system view hides and restores heliocentric orbits', async ({
  page,
}) => {
  await page.goto(
    '/?visual-test=1#target=pluto&date=2030-03-07&scale=true&lang=en',
    { waitUntil: 'domcontentloaded' },
  )

  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.dataset.visualTestFocusedSystem,
        ),
      { timeout: 90_000 },
    )
    .toBe('pluto')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.dataset.visualTestHeliocentricOrbits,
      ),
    )
    .toBe('hidden')

  await page.evaluate(() => {
    const visualWindow = window as typeof window & {
      __solarVisualCameraDistance?: number
    }
    visualWindow.__solarVisualCameraDistance = 0.05
  })
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.dataset.visualTestFocusedSystem,
        ),
      { timeout: 30_000 },
    )
    .toBe('none')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.dataset.visualTestHeliocentricOrbits,
      ),
    )
    .toBe('visible')
})
