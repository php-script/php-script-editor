import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 5173);
const PHP_PORT = Number(process.env.PHP_PORT ?? 8080);
// PLAYGROUND_URL: playground already running elsewhere. PHP_SERVER: PHP API already running
// (docker compose `php` service), so only Vite is started here.
const external = Boolean(process.env.PLAYGROUND_URL);
const phpServer = process.env.PHP_SERVER;

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'laravel.spec.ts', // needs the Laravel demo: playwright.laravel.config.ts
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYGROUND_URL ?? `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: external
    ? undefined
    : [
        ...(phpServer
          ? []
          : [
              {
                command: `php -S 127.0.0.1:${PHP_PORT} -t ../dev-server/public ../dev-server/public/index.php`,
                url: `http://127.0.0.1:${PHP_PORT}/health`,
                reuseExistingServer: !process.env.CI,
                env: { SCRIPT_STORAGE: '../dev-server/storage/e2e' },
              },
            ]),
        {
          command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
          url: `http://127.0.0.1:${PORT}/index.html`,
          reuseExistingServer: !process.env.CI,
          env: { PHP_SERVER: phpServer ?? `http://127.0.0.1:${PHP_PORT}` },
        },
      ],
});
