import { expect, type Locator, type Page } from '@playwright/test';

/** Waits until the Monaco instance inside the element is mounted. */
export async function editorReady(page: Page, selector = 'php-script-editor'): Promise<Locator> {
  const host = page.locator(selector).first();
  await expect(host.locator('.monaco-editor')).toBeVisible();
  await expect(host.locator('.view-line').first()).toBeVisible();
  return host;
}

/** Modifier Monaco expects: it reads the user agent, not the real OS (device presets fake it). */
export async function mod(page: Page): Promise<'Meta' | 'Control'> {
  return (await page.evaluate(() => navigator.userAgent.includes('Macintosh')))
    ? 'Meta'
    : 'Control';
}

/** Replaces the whole content through the keyboard, like a user would. */
export async function typeInto(page: Page, host: Locator, text: string): Promise<void> {
  await host.locator('.view-lines').click();
  await page.keyboard.press(`${await mod(page)}+a`);
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}
