import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the production build served by `astro preview`.
 * `npm run test` builds first, then Playwright starts the preview server on port 4322
 * (not 4321, so a running dev server never gets tested by mistake).
 *
 * Astro 7 runs `astro preview` as a managed background daemon with a lock file and refuses
 * a second instance. `--ignore-lock` makes it a plain foreground process that Playwright can
 * own and stop. If the port is busy from an earlier daemon, run `npx astro preview stop`.
 */
const PORT = 4322;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --ignore-lock`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
