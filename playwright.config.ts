import { defineConfig } from '@playwright/test'

const port = Number(process.env.VISUAL_TEST_PORT ?? 4318)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/visual',
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
    toMatchSnapshot: {
      threshold: 0.1,
      maxDiffPixelRatio: 0.002,
    },
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.1,
      maxDiffPixelRatio: 0.002,
    },
  },
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--force-color-profile=srgb',
      ],
    },
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
