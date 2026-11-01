import { defineConfig, devices } from '@playwright/test';

// E2E against the generated Laravel 13 + Filament 5 demo (compose service `laravel`), already running:
//   docker compose up -d laravel
//   LARAVEL_URL=http://laravel.php-script-editor.orb.local pnpm test:e2e:laravel
//   docker compose run --rm test-laravel   # same, from the Playwright container
const baseURL = process.env.LARAVEL_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'laravel.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/laravel' }]]
    : 'list',
  outputDir: 'test-results/laravel',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
