import { expect, test } from '@playwright/test';
import { editorReady } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/standalone.html');
});

test('prebuilt bundle registers the element and reads the <script> child', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await expect(host.locator('.view-lines')).toContainText('echo user.address.city;');
  await expect(host.getByRole('button', { name: 'Speichern' })).toBeVisible();
});

test('host CSS tokens (oklch) reach the Monaco theme', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await page.getByTestId('toggle-dark').click();
  await expect(host.locator('.monaco-editor')).toHaveClass(/vs-dark/);
  // gray-950 = oklch(0.13 0.028 261.692), not the built-in dark #0d1117.
  await expect(host.locator('.monaco-editor-background').first()).toHaveCSS(
    'background-color',
    /oklch\(0\.13 |rgb\(\s*[0-5], [0-9], 1[0-9]\)/,
  );
  // Token colors and Monaco widgets get the hex-converted value.
  const theme = await host.evaluate(
    (el: HTMLElement & { currentTheme: { colors: { background: string } } }) =>
      el.currentTheme.colors.background,
  );
  expect(theme).toContain('oklch');
});

test('native input event works for Alpine x-model style binding', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=bound]');
  await host.locator('.view-lines').click();
  await page.keyboard.type('echo taxRate;');
  await expect(page.getByTestId('bound-value')).toHaveText('echo taxRate;');
});
