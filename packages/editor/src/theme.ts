/**
 * Themes.
 *
 * Precedence (later wins):
 *   1. built-in palette for the base (`light` / `dark`)
 *   2. CSS custom properties on the element (`--php-script-editor-*`)
 *   3. a theme object passed via the `theme` property
 *
 * Monaco themes are global per page: all editors on one page share the active theme.
 */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeBase = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  foreground: string;
  lineHighlight: string;
  selection: string;
  cursor: string;
  lineNumber: string;
  lineNumberActive: string;
  widgetBackground: string;
  widgetBorder: string;
  /** Toolbar / frame colors used by the element around Monaco. */
  border: string;
  accent: string;
  danger: string;
  success: string;
}

export interface TokenColors {
  keyword: string;
  function: string;
  variable: string;
  identifier: string;
  string: string;
  stringEscape: string;
  number: string;
  comment: string;
  operator: string;
  delimiter: string;
}

/** Theme object accepted by the `theme` property (all keys optional). */
export interface PhpScriptTheme {
  /** Base palette. Defaults to the current mode (`auto` follows the page). */
  base?: ThemeBase;
  colors?: Partial<ThemeColors>;
  tokens?: Partial<TokenColors>;
  /** Raw Monaco theme overrides: extra `editor.*` colors and token rules. */
  monaco?: {
    colors?: Record<string, string>;
    rules?: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  };
}

export interface ResolvedTheme {
  base: ThemeBase;
  colors: ThemeColors;
  tokens: TokenColors;
  monaco: NonNullable<PhpScriptTheme['monaco']>;
}

export const PALETTES: Record<ThemeBase, { colors: ThemeColors; tokens: TokenColors }> = {
  light: {
    colors: {
      background: '#ffffff',
      foreground: '#1f2328',
      lineHighlight: '#f6f8fa',
      selection: '#b6d7ff',
      cursor: '#0969da',
      lineNumber: '#8c959f',
      lineNumberActive: '#1f2328',
      widgetBackground: '#ffffff',
      widgetBorder: '#d0d7de',
      border: '#d0d7de',
      accent: '#0969da',
      danger: '#cf222e',
      success: '#1a7f37',
    },
    tokens: {
      keyword: '#cf222e',
      function: '#8250df',
      variable: '#0550ae',
      identifier: '#1f2328',
      string: '#0a3069',
      stringEscape: '#116329',
      number: '#0550ae',
      comment: '#6e7781',
      operator: '#953800',
      delimiter: '#57606a',
    },
  },
  dark: {
    colors: {
      background: '#0d1117',
      foreground: '#e6edf3',
      lineHighlight: '#161b22',
      selection: '#264f78',
      cursor: '#58a6ff',
      lineNumber: '#6e7681',
      lineNumberActive: '#e6edf3',
      widgetBackground: '#161b22',
      widgetBorder: '#30363d',
      border: '#30363d',
      accent: '#58a6ff',
      danger: '#f85149',
      success: '#3fb950',
    },
    tokens: {
      keyword: '#ff7b72',
      function: '#d2a8ff',
      variable: '#79c0ff',
      identifier: '#e6edf3',
      string: '#a5d6ff',
      stringEscape: '#7ee787',
      number: '#79c0ff',
      comment: '#8b949e',
      operator: '#ffa657',
      delimiter: '#8b949e',
    },
  },
};

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `--php-script-editor-<name>` for colors, `--php-script-editor-token-<name>` for tokens. */
export const cssVarName = (group: 'colors' | 'tokens', key: string) =>
  group === 'colors'
    ? `--php-script-editor-${kebab(key)}`
    : `--php-script-editor-token-${kebab(key)}`;

type ColorReader = (name: string) => string;

/** Reads `--php-script-editor-*` overrides from computed style. Empty values are skipped. */
export function readCssOverrides(read: ColorReader): Pick<PhpScriptTheme, 'colors' | 'tokens'> {
  const colors: Partial<ThemeColors> = {};
  const tokens: Partial<TokenColors> = {};
  for (const key of Object.keys(PALETTES.light.colors) as Array<keyof ThemeColors>) {
    const value = read(cssVarName('colors', key)).trim();
    if (value) colors[key] = value;
  }
  for (const key of Object.keys(PALETTES.light.tokens) as Array<keyof TokenColors>) {
    const value = read(cssVarName('tokens', key)).trim();
    if (value) tokens[key] = value;
  }
  return { colors, tokens };
}

export function resolveTheme(
  base: ThemeBase,
  cssOverrides: Pick<PhpScriptTheme, 'colors' | 'tokens'> = {},
  theme: PhpScriptTheme = {},
): ResolvedTheme {
  const effectiveBase = theme.base ?? base;
  const palette = PALETTES[effectiveBase];
  return {
    base: effectiveBase,
    colors: { ...palette.colors, ...cssOverrides.colors, ...theme.colors },
    tokens: { ...palette.tokens, ...cssOverrides.tokens, ...theme.tokens },
    monaco: { colors: { ...theme.monaco?.colors }, rules: [...(theme.monaco?.rules ?? [])] },
  };
}

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

let canvasContext: CanvasRenderingContext2D | null | undefined;

/**
 * Converts any CSS color (hex, rgb(), hsl(), oklch(), named) to `#rrggbb` or `#rrggbbaa`,
 * which is the only format Monaco accepts. Returns null when the value is not a color.
 */
export function toHexColor(value: string): string | null {
  const input = value.trim();
  if (HEX.test(input)) {
    if (input.length === 4 || input.length === 5) {
      return `#${[...input.slice(1)].map((c) => c + c).join('')}`.toLowerCase();
    }
    return input.toLowerCase();
  }

  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(input);
  if (rgb) return rgbaToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), parseAlpha(rgb[4]));

  if (typeof document === 'undefined') return null;
  if (canvasContext === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      canvasContext = null;
    }
  }
  if (!canvasContext) return null;

  // Paint one pixel: works for every color syntax the browser understands, incl. oklch().
  const ctx = canvasContext;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = input;
  const before = ctx.fillStyle;
  ctx.fillStyle = '#fff';
  ctx.fillStyle = input;
  if (before !== ctx.fillStyle) return null; // the browser rejected the value
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return rgbaToHex(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, (data[3] ?? 255) / 255);
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
}

function rgbaToHex(r: number, g: number, b: number, a = 1): string {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}${a < 1 ? part(a * 255) : ''}`;
}

const tokenHex = (value: string) => (toHexColor(value) ?? '').replace('#', '').slice(0, 6);

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

/** Builds Monaco `IStandaloneThemeData` from a resolved theme. Invalid colors are dropped. */
export function toMonacoTheme(theme: ResolvedTheme): MonacoThemeData {
  const { colors: c, tokens: t } = theme;
  const rule = (token: string, color: string, fontStyle?: string) => {
    const foreground = tokenHex(color);
    return foreground ? [{ token, foreground, ...(fontStyle ? { fontStyle } : {}) }] : [];
  };

  const editorColors: Record<string, string> = {
    'editor.background': c.background,
    'editor.foreground': c.foreground,
    'editor.lineHighlightBackground': c.lineHighlight,
    'editor.lineHighlightBorder': c.lineHighlight,
    'editor.selectionBackground': c.selection,
    'editorCursor.foreground': c.cursor,
    'editorLineNumber.foreground': c.lineNumber,
    'editorLineNumber.activeForeground': c.lineNumberActive,
    'editorGutter.background': c.background,
    'editorWidget.background': c.widgetBackground,
    'editorWidget.border': c.widgetBorder,
    'editorSuggestWidget.background': c.widgetBackground,
    'editorSuggestWidget.border': c.widgetBorder,
    'editorSuggestWidget.selectedBackground': c.selection,
    'editorHoverWidget.background': c.widgetBackground,
    'editorHoverWidget.border': c.widgetBorder,
    focusBorder: c.accent,
    'editorError.foreground': c.danger,
    ...theme.monaco.colors,
  };

  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(editorColors)) {
    const hex = toHexColor(value);
    if (hex) colors[key] = hex;
  }

  return {
    base: theme.base === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      ...rule('', t.identifier),
      ...rule('keyword', t.keyword, 'bold'),
      ...rule('predefined', t.function),
      ...rule('variable.predefined', t.variable),
      ...rule('identifier', t.identifier),
      ...rule('string', t.string),
      ...rule('string.quote', t.string),
      ...rule('string.escape', t.stringEscape),
      ...rule('number', t.number),
      ...rule('comment', t.comment, 'italic'),
      ...rule('operator', t.operator),
      ...rule('delimiter', t.delimiter),
      ...(theme.monaco.rules ?? []),
    ],
    colors,
  };
}

/**
 * Detects dark mode the way common UIs signal it:
 * `class="dark"` (Tailwind, Filament), `data-theme`/`data-bs-theme`/`data-mode`, else the OS setting.
 */
export function detectPageBase(
  root: Element | null = globalThis.document?.documentElement ?? null,
): ThemeBase {
  if (root) {
    const explicit =
      root.getAttribute('data-theme') ??
      root.getAttribute('data-bs-theme') ??
      root.getAttribute('data-mode');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    if (root.classList.contains('dark')) return 'dark';
    if (root.classList.contains('light')) return 'light';
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Calls `onChange` when the page switches between light and dark. Returns a cleanup function. */
export function watchPageBase(onChange: () => void): () => void {
  const root = globalThis.document?.documentElement;
  const observer =
    root && typeof MutationObserver !== 'undefined' ? new MutationObserver(() => onChange()) : null;
  observer?.observe(root!, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-bs-theme', 'data-mode'],
  });
  const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', onChange);
  return () => {
    observer?.disconnect();
    media?.removeEventListener?.('change', onChange);
  };
}

/** Parses the `theme` attribute: a mode keyword or a JSON theme object. */
export function parseThemeAttribute(value: string | null): ThemeMode | PhpScriptTheme {
  const input = (value ?? '').trim();
  if (input === 'light' || input === 'dark' || input === 'auto') return input;
  if (input.startsWith('{')) {
    try {
      return JSON.parse(input) as PhpScriptTheme;
    } catch {
      return 'auto';
    }
  }
  return 'auto';
}
