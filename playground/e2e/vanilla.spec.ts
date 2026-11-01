import { expect, test } from '@playwright/test';
import { editorReady, mod, typeInto } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/vanilla.html');
});

test('highlights code with the Monarch definition from the server', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await expect(host.locator('.view-line').first()).toContainText('Context');
  // Keywords get their own token class, not the default one. Tokenizing runs async, so poll.
  await expect
    .poll(() =>
      host
        .locator('.view-line span span')
        .evaluateAll((spans) => spans.find((s) => s.textContent === 'if')?.className ?? 'mtk1'),
    )
    .not.toBe('mtk1');
});

test('suggests context variables and object members', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await typeInto(page, host, 'us');
  await page.keyboard.press('Control+Space');
  const suggest = host.locator('.suggest-widget');
  await expect(suggest).toBeVisible();
  await expect(suggest).toContainText('user');

  await page.keyboard.press('Escape');
  await typeInto(page, host, 'user.');
  await expect(suggest).toBeVisible();
  await expect(suggest).toContainText('greet');
  await expect(suggest).toContainText('address');
});

test('saves with POST first, then PUT to the returned URL', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  const methods: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/scripts'))
      methods.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  await typeInto(page, host, 'echo "one";');
  await host.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('log')).toContainText('ps-saved: POST');
  await expect(host).toHaveAttribute('status', 'saved');

  await typeInto(page, host, 'echo "two";');
  await expect(host).toHaveAttribute('status', 'dirty');
  await page.keyboard.press(`${await mod(page)}+s`);
  await expect(page.getByTestId('log')).toContainText('ps-saved: PUT');

  expect(methods[0]).toBe('POST /api/scripts');
  expect(methods[1]).toMatch(/^PUT \/api\/scripts\/[\w-]+$/);

  const id = methods[1]!.split('/').pop();
  const stored = await (await page.request.get(`/api/scripts/${id}`)).json();
  expect(stored.content).toBe('echo "two";');
});

test('shows lint markers from the lint endpoint', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await typeInto(page, host, 'echo notAllowed();');
  await expect(host.locator('.squiggly-error').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('log')).toContainText('ps-diagnostics');
});

test('rejects invalid scripts on save and marks the error', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await typeInto(page, host, 'echo strtoupper(;');
  await host.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('log')).toContainText('ps-save-error');
  await expect(host).toHaveAttribute('status', 'error');
  await expect(host.locator('.squiggly-error').first()).toBeVisible();
});

test('runs the script on the server', async ({ page }) => {
  await editorReady(page, '[data-testid=editor]');
  await page.getByTestId('run').click();
  await expect(page.getByTestId('log')).toContainText('run: Hello');
});

test('takes part in forms', async ({ page }) => {
  await editorReady(page, 'php-script-editor[name=script]');
  await page.getByRole('button', { name: 'Submit form' }).click();
  await expect(page.getByTestId('form-output')).toHaveText('script=echo user.name;');
});

test('follows html.dark like Filament', async ({ page }) => {
  const host = await editorReady(page, '[data-testid=editor]');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(host.locator('.monaco-editor')).toHaveClass(/vs(?!-dark)/);
  await page.getByTestId('toggle-dark').click();
  await expect(host.locator('.monaco-editor')).toHaveClass(/vs-dark/);
});
