import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3410',
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: 'bun run start',
    url: 'http://localhost:3410',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
