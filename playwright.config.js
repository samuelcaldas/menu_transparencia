import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = '/usr/bin/google-chrome';
const chromeExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  || (existsSync(systemChrome) ? systemChrome : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1440, height: 1200 },
    actionTimeout: 10_000,
    trace: 'on-first-retry',
    launchOptions: chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
