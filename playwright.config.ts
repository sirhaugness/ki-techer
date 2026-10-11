import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  // Fixture flows deliberately share one learner, like a household device.
  // Concurrent resets would overwrite another test's active session.
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3000' },
  webServer: {
    env: {
      APP_URL: '',
      VERCEL_URL: '',
      E2E_LEO_FIXTURE: process.env.E2E_LOCAL_SUPABASE === '1' ? '0' : '1',
    },
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? {
                executablePath:
                  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
                  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
              }
            : undefined,
        viewport: { width: 1024, height: 768 },
      },
    },
  ],
});
