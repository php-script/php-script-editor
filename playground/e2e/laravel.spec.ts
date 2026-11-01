import { expect, test, type Locator, type Page } from '@playwright/test';
import { editorReady, mod, typeInto } from './helpers.js';

// Runs against the generated Laravel 13 + Filament 5 demo (docker/laravel-setup.sh + demo/laravel-overlay)
// with packages/laravel and packages/filament as composer path repositories. Config: playwright.laravel.config.ts (LARAVEL_URL).
// /admin signs guests in as admin@example.com (DEMO_AUTO_LOGIN).

const unique = (prefix: string) =>
  `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Class of the first token with the given text; `mtk1` is Monaco's default (unhighlighted) class. */
function tokenClass(host: Locator, text: string): Promise<string> {
  return host
    .locator('.view-line span span')
    .evaluateAll((spans, t) => spans.find((s) => s.textContent === t)?.className ?? 'mtk1', text);
}

async function openCreatePage(page: Page): Promise<Locator> {
  await page.goto('/admin/automations/create');
  await expect(page.getByRole('heading', { name: 'Create Automation' })).toBeVisible();
  return editorReady(page, '.fi-fo-php-script-editor php-script-editor');
}

test.describe('Filament field', () => {
  test('create page shows the editor with php-script highlighting', async ({ page }) => {
    const host = await openCreatePage(page);
    await typeInto(page, host, 'if (user.isAdult()) echo user.name;');
    await expect(host.locator('.view-lines')).toContainText('if (user.isAdult()) echo user.name;');
    await expect.poll(() => tokenClass(host, 'if')).not.toBe('mtk1');
    await expect.poll(() => tokenClass(host, 'echo')).not.toBe('mtk1');
  });

  test('completions come from the bound engine (EditorConfig::fromEngine)', async ({ page }) => {
    const host = await openCreatePage(page);
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

  test('saving the form persists the script', async ({ page }) => {
    const name = unique('E2E create');
    const host = await openCreatePage(page);
    await page.getByLabel('Name').fill(name);
    await typeInto(page, host, 'echo strtoupper(user.name);');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await page.waitForURL(/\/admin\/automations\/\d+\/edit$/);
    await page.reload();
    const edit = await editorReady(page, '.fi-fo-php-script-editor php-script-editor');
    await expect(page.getByLabel('Name')).toHaveValue(name);
    await expect(edit.locator('.view-lines')).toContainText('echo strtoupper(user.name);');

    // Edit and save again: the entangled state goes with the Livewire request.
    await typeInto(page, edit, 'return round(taxRate * 100);');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await page.reload();
    const reloaded = await editorReady(page, '.fi-fo-php-script-editor php-script-editor');
    await expect(reloaded.locator('.view-lines')).toContainText('return round(taxRate * 100);');
  });

  test('an invalid script fails ValidPhpScript and is not saved', async ({ page }) => {
    const host = await openCreatePage(page);
    await page.getByLabel('Name').fill(unique('E2E invalid'));
    await typeInto(page, host, 'echo strtoupper(;');
    // Live diagnostics from the lint route.
    await expect(host.locator('.squiggly-error').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.fi-fo-field-wrp-error-message')).toContainText('Unexpected token');
    await expect(page).toHaveURL(/\/admin\/automations\/create$/);
  });

  test('the seeded record loads into the editor', async ({ page }) => {
    await page.goto('/admin/automations');
    await page.getByRole('link', { name: 'Welcome message' }).first().click();
    const host = await editorReady(page, '.fi-fo-php-script-editor php-script-editor');
    await expect(host.locator('.view-lines')).toContainText('echo user.greet("Welcome");');
    await expect.poll(() => tokenClass(host, 'foreach')).not.toBe('mtk1');
  });

  test("Filament's dark mode switches the editor theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const host = await openCreatePage(page);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    await expect(host.locator('.monaco-editor')).toHaveClass(/\bvs\b/);

    await page.locator('.fi-user-menu-trigger').click();
    await page.getByRole('menuitemradio', { name: /dark/i }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await expect(host.locator('.monaco-editor')).toHaveClass(/vs-dark/);

    await page.locator('.fi-user-menu-trigger').click();
    await page.getByRole('menuitemradio', { name: /light/i }).click();
    await expect(host.locator('.monaco-editor')).not.toHaveClass(/vs-dark/);
  });
});

test.describe('Blade component', () => {
  test('saves with POST first, then PUT to the Location', async ({ page }) => {
    await page.goto('/blade');
    const host = await editorReady(page, '[data-testid=editor]');
    const requests: string[] = [];
    page.on('request', (r) => {
      const { pathname } = new URL(r.url());
      if (pathname.startsWith('/scripts') && pathname !== '/scripts/lint')
        requests.push(`${r.method()} ${pathname}`);
    });

    await typeInto(page, host, 'echo "one";');
    await host.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('log')).toContainText('ps-saved: POST /scripts 201');
    await expect(host).toHaveAttribute('status', 'saved');

    await typeInto(page, host, 'echo "two";');
    await expect(host).toHaveAttribute('status', 'dirty');
    await page.keyboard.press(`${await mod(page)}+s`);
    await expect(page.getByTestId('log')).toContainText(/ps-saved: PUT \/scripts\/\d+ 200/);

    expect(requests[0]).toBe('POST /scripts');
    expect(requests[1]).toMatch(/^PUT \/scripts\/\d+$/);

    const stored = await (await page.request.get(requests[1]!.split(' ')[1]!)).json();
    expect(stored).toMatchObject({ name: 'Saved from Blade', script: 'echo "two";' });
  });

  test('rejects invalid scripts with a 422 and marks the error', async ({ page }) => {
    await page.goto('/blade');
    const host = await editorReady(page, '[data-testid=editor]');
    await typeInto(page, host, 'echo strtoupper(;');
    await host.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('log')).toContainText('ps-save-error: 422');
    await expect(host).toHaveAttribute('status', 'error');
    await expect(host.locator('.squiggly-error').first()).toBeVisible();
  });

  test('the module comes from the local build, not the CDN', async ({ page }) => {
    await page.goto('/blade');
    const src = await page.locator('script[data-php-script-editor]').getAttribute('src');
    expect(new URL(src!).pathname).toBe('/vendor/php-script-editor/php-script-editor.js');
    await editorReady(page, '[data-testid=editor]');
  });
});
