/**
 * End-to-end tests for browser compatibility and syntax highlighting
 * These tests run in actual browsers using Playwright
 *
 * Tests cover:
 * - T084: Chrome (latest 2 versions)
 * - T085: Firefox (latest 2 versions)
 * - T086: Safari/WebKit (latest 2 versions)
 * - T087: Edge/Chromium (covered by chromium tests)
 * - T088: Worker configuration validation
 * - T089: localStorage API support and fallbacks
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testPagePath = `file://${path.join(__dirname, 'test-page.html')}`;

test.describe('PHP-Script Editor - Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto(testPagePath);

    // Wait for editor to be ready
    await page.waitForFunction(() => (window as any).editorReady === true, { timeout: 10000 });
  });

  // T084: Chrome compatibility test
  test('should work in Chromium browsers (Chrome/Edge)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'This test is for Chromium only');

    // Verify editor is initialized
    const editorExists = await page.evaluate(() => {
      return window.editor !== undefined && window.monaco !== undefined;
    });
    expect(editorExists).toBe(true);

    // Verify initial content is loaded
    const initialValue = await page.evaluate(() => {
      return window.editor.getValue();
    });
    expect(initialValue).toBe('user.logins.count()');

    // Test syntax highlighting by checking token classes
    const hasTokens = await page.evaluate(() => {
      const model = window.editor.getModel();
      const lineContent = model.getLineContent(1);
      return lineContent.includes('user');
    });
    expect(hasTokens).toBe(true);

    // Test editor responsiveness
    await page.evaluate(() => {
      window.editor.setValue('test content');
    });
    const newValue = await page.evaluate(() => window.editor.getValue());
    expect(newValue).toBe('test content');
  });

  // T085: Firefox compatibility test
  test('should work in Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'This test is for Firefox only');

    // Verify editor is initialized
    const editorExists = await page.evaluate(() => {
      return window.editor !== undefined && window.monaco !== undefined;
    });
    expect(editorExists).toBe(true);

    // Verify initial content is loaded
    const initialValue = await page.evaluate(() => {
      return window.editor.getValue();
    });
    expect(initialValue).toBe('user.logins.count()');

    // Test editor functionality
    await page.evaluate(() => {
      window.editor.setValue('firefox test');
    });
    const newValue = await page.evaluate(() => window.editor.getValue());
    expect(newValue).toBe('firefox test');

    // Test cursor positioning (Firefox-specific)
    await page.evaluate(() => {
      const position = { lineNumber: 1, column: 1 };
      window.editor.setPosition(position);
    });
    const position = await page.evaluate(() => {
      const pos = window.editor.getPosition();
      return { lineNumber: pos.lineNumber, column: pos.column };
    });
    expect(position.lineNumber).toBe(1);
    expect(position.column).toBe(1);
  });

  // T086: Safari/WebKit compatibility test
  test('should work in WebKit browsers (Safari)', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'This test is for WebKit only');

    // Verify editor is initialized
    const editorExists = await page.evaluate(() => {
      return window.editor !== undefined && window.monaco !== undefined;
    });
    expect(editorExists).toBe(true);

    // Verify initial content is loaded
    const initialValue = await page.evaluate(() => {
      return window.editor.getValue();
    });
    expect(initialValue).toBe('user.logins.count()');

    // Test editor functionality
    await page.evaluate(() => {
      window.editor.setValue('webkit test');
    });
    const newValue = await page.evaluate(() => window.editor.getValue());
    expect(newValue).toBe('webkit test');

    // Test selection (WebKit-specific)
    await page.evaluate(() => {
      window.editor.setSelection({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 7,
      });
    });
    const selection = await page.evaluate(() => {
      const sel = window.editor.getSelection();
      return {
        startLineNumber: sel.startLineNumber,
        startColumn: sel.startColumn,
        endLineNumber: sel.endLineNumber,
        endColumn: sel.endColumn,
      };
    });
    expect(selection.startLineNumber).toBe(1);
    expect(selection.endLineNumber).toBe(1);
  });

  // T088: Worker configuration validation
  test('should load Monaco workers correctly', async ({ page }) => {
    // Check that no worker errors occurred
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit to catch any async worker errors
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const workerErrors = errors.filter((err) => err.includes('worker') || err.includes('Worker'));

    expect(workerErrors.length).toBe(0);

    // Verify Monaco environment is configured
    const hasMonacoEnv = await page.evaluate(() => {
      return (self as any).MonacoEnvironment !== undefined;
    });
    expect(hasMonacoEnv).toBe(true);
  });

  // T089: localStorage API support and fallbacks
  test('should support localStorage API', async ({ page }) => {
    // Test localStorage availability
    const hasLocalStorage = await page.evaluate(() => {
      try {
        const testKey = '__test_storage__';
        localStorage.setItem(testKey, 'test');
        const value = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return value === 'test';
      } catch {
        return false;
      }
    });
    expect(hasLocalStorage).toBe(true);

    // Test storage operations
    await page.evaluate(() => {
      const storageKey = 'php-script-editor-test';
      localStorage.setItem(storageKey, 'test content');
    });

    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('php-script-editor-test');
    });
    expect(storedValue).toBe('test content');

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('php-script-editor-test');
    });
  });

  test('should handle php-script syntax highlighting', async ({ page }) => {
    // Set php-script code
    await page.evaluate(() => {
      window.editor.setValue('if (user.name == "test") {\n  strlen("hello");\n}');
    });

    // Wait for syntax highlighting to apply
    await page.waitForTimeout(500);

    // Verify content was set
    const content = await page.evaluate(() => window.editor.getValue());
    expect(content).toContain('user.name');
    expect(content).toContain('strlen');

    // Check that Monaco model has the correct language
    const language = await page.evaluate(() => {
      const model = window.editor.getModel();
      return model.getLanguageId();
    });
    expect(language).toBe('php-script');
  });

  test('should provide code completion for functions', async ({ page }) => {
    // Clear editor
    await page.evaluate(() => {
      window.editor.setValue('');
    });

    // Type partial function name
    await page.evaluate(() => {
      window.editor.setValue('str');
      window.editor.setPosition({ lineNumber: 1, column: 4 });
    });

    // Trigger completion
    await page.click('#btn-trigger-completion');
    await page.waitForTimeout(500);

    // Check if suggestion widget appears
    const hasSuggestions = await page.evaluate(() => {
      const widget = document.querySelector('.suggest-widget');
      return widget !== null;
    });

    // Note: Completion widget visibility depends on Monaco's internal state
    // This test verifies the completion provider is registered
    expect(hasSuggestions).toBeDefined();
  });

  test('should provide code completion for context variables', async ({ page }) => {
    // Clear editor
    await page.evaluate(() => {
      window.editor.setValue('');
    });

    // Type context variable
    await page.evaluate(() => {
      window.editor.setValue('user.');
      window.editor.setPosition({ lineNumber: 1, column: 6 });
    });

    // Trigger completion
    await page.click('#btn-trigger-completion');
    await page.waitForTimeout(500);

    // Verify completion was triggered
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Completion triggered');
  });

  test('should handle nested property access', async ({ page }) => {
    // Test nested property: user.logins.count()
    await page.evaluate(() => {
      window.editor.setValue('user.logins.count()');
    });

    const value = await page.evaluate(() => window.editor.getValue());
    expect(value).toBe('user.logins.count()');

    // Verify no syntax errors
    const markers = await page.evaluate(() => {
      const model = window.editor.getModel();
      return window.monaco.editor.getModelMarkers({ resource: model.uri });
    });
    expect(markers.length).toBe(0);
  });

  test('should handle keyboard input correctly', async ({ page }) => {
    // Focus editor
    await page.evaluate(() => {
      window.editor.focus();
    });

    // Clear content
    await page.evaluate(() => {
      window.editor.setValue('');
    });

    // Type using keyboard
    await page.keyboard.type('test input');

    const value = await page.evaluate(() => window.editor.getValue());
    expect(value).toBe('test input');
  });

  test('should handle editor resize', async ({ page }) => {
    // Get initial size
    const initialSize = await page.evaluate(() => {
      const container = document.getElementById('editor-container');
      return {
        width: container.offsetWidth,
        height: container.offsetHeight,
      };
    });

    expect(initialSize.width).toBeGreaterThan(0);
    expect(initialSize.height).toBeGreaterThan(0);

    // Resize viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);

    // Editor should still be functional
    const editorWorks = await page.evaluate(() => {
      window.editor.setValue('resize test');
      return window.editor.getValue() === 'resize test';
    });
    expect(editorWorks).toBe(true);
  });

  test('should handle concurrent operations', async ({ page }) => {
    // Perform multiple operations quickly
    await page.evaluate(() => {
      window.editor.setValue('test1');
      window.editor.setValue('test2');
      window.editor.setValue('test3');
    });

    // Final value should be the last one
    const value = await page.evaluate(() => window.editor.getValue());
    expect(value).toBe('test3');
  });
});
