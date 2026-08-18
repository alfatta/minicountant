import { defineConfig } from '@playwright/test'

/**
 * Playwright config (Phase 13 e2e).
 *
 * - Spawns `nuxt dev` as the webServer so the e2e spec exercises the
 *   real app (IndexedDB lives in the browser).
 * - The happy-path spec runs against the dev server; it does not mock.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
})
