import { expect, test } from '@playwright/test';
import { editorReady, typeInto } from './helpers.js';

for (const page of ['react', 'vue', 'svelte'] as const) {
  test.describe(page, () => {
    test.beforeEach(async ({ page: p }) => {
      await p.goto(`/${page}.html`);
    });

    test('two-way binding between framework state and editor', async ({ page: p }) => {
      const host = await editorReady(p);
      await expect(p.getByTestId('mirror')).toContainText('user.isAdult()');
      await typeInto(p, host, 'echo 42;');
      await expect(p.getByTestId('mirror')).toHaveText('echo 42;');
      if (page === 'react') {
        await p.getByTestId('reset').click();
        await expect(host.locator('.view-lines')).toContainText('echo "reset";');
      }
    });

    test('saves POST then PUT', async ({ page: p }) => {
      const host = await editorReady(p);
      await host.getByRole('button', { name: 'Save' }).click();
      await expect(p.getByTestId('status')).toContainText('POST');
      await typeInto(p, host, 'echo 1;');
      await host.getByRole('button', { name: 'Save' }).click();
      await expect(p.getByTestId('status')).toContainText(/PUT .*\/api\/scripts\/[\w-]+ -> 200/);
    });

    test('runs the script', async ({ page: p }) => {
      await editorReady(p);
      await p.getByTestId('run').click();
      await expect(p.getByTestId('output')).toContainText('Hello');
    });
  });
}

test('vue: theme prop switches the Monaco theme', async ({ page }) => {
  await page.goto('/vue.html');
  const host = await editorReady(page);
  await page.getByTestId('theme').selectOption('dark');
  await expect(host.locator('.monaco-editor')).toHaveClass(/vs-dark/);
  await page.getByTestId('theme').selectOption('light');
  await expect(host.locator('.monaco-editor')).not.toHaveClass(/vs-dark/);
});
