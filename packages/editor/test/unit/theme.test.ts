import { afterEach, describe, expect, it } from 'vitest';
import {
  PALETTES,
  cssVarName,
  detectPageBase,
  parseThemeAttribute,
  readCssOverrides,
  resolveTheme,
  toHexColor,
  toMonacoTheme,
} from '../../src/theme.js';

afterEach(() => {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
});

describe('toHexColor', () => {
  it('normalizes hex and rgb()', () => {
    expect(toHexColor('#ABC')).toBe('#aabbcc');
    expect(toHexColor('#112233')).toBe('#112233');
    expect(toHexColor('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(toHexColor('rgba(0 0 0 / 50%)')).toBe('#00000080');
  });
});

describe('resolveTheme', () => {
  it('merges palette < CSS variables < theme object', () => {
    const resolved = resolveTheme(
      'light',
      { colors: { background: '#000000', foreground: '#111111' } },
      { colors: { background: '#ffffff' } },
    );
    expect(resolved.colors.background).toBe('#ffffff');
    expect(resolved.colors.foreground).toBe('#111111');
    expect(resolved.colors.accent).toBe(PALETTES.light.colors.accent);
  });

  it('lets the theme object pick the base', () => {
    expect(resolveTheme('light', {}, { base: 'dark' }).base).toBe('dark');
  });
});

describe('readCssOverrides', () => {
  it('reads --php-script-editor-* variables', () => {
    const values: Record<string, string> = {
      [cssVarName('colors', 'background')]: ' #222222 ',
      [cssVarName('tokens', 'keyword')]: '#ff0000',
    };
    expect(cssVarName('colors', 'lineHighlight')).toBe('--php-script-editor-line-highlight');
    expect(readCssOverrides((name) => values[name] ?? '')).toEqual({
      colors: { background: '#222222' },
      tokens: { keyword: '#ff0000' },
    });
  });
});

describe('toMonacoTheme', () => {
  it('maps tokens and colors', () => {
    const data = toMonacoTheme(
      resolveTheme(
        'dark',
        {},
        {
          tokens: { keyword: '#ff0000' },
          monaco: { rules: [{ token: 'custom', foreground: '00ff00' }] },
        },
      ),
    );
    expect(data.base).toBe('vs-dark');
    expect(data.rules).toContainEqual(
      expect.objectContaining({ token: 'keyword', foreground: 'ff0000' }),
    );
    expect(data.rules).toContainEqual({ token: 'custom', foreground: '00ff00' });
    expect(data.colors['editor.background']).toMatch(/^#/);
  });
});

describe('page detection', () => {
  it('follows html.dark and data-theme', () => {
    document.documentElement.classList.add('dark');
    expect(detectPageBase()).toBe('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    expect(detectPageBase()).toBe('light');
  });

  it('parses the theme attribute', () => {
    expect(parseThemeAttribute('dark')).toBe('dark');
    expect(parseThemeAttribute(null)).toBe('auto');
    expect(parseThemeAttribute('{"base":"dark"}')).toEqual({ base: 'dark' });
    expect(parseThemeAttribute('{broken')).toBe('auto');
  });
});
