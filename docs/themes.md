---
title: Themes
nav_order: 4
---

# Themes
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Modes

| `theme`          | Effect                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `auto` (default) | Follows the page: `data-theme`, `data-bs-theme` or `data-mode` on `<html>`, then the `dark`/`light` class, then `prefers-color-scheme` |
| `light`, `dark`  | The built-in palettes (GitHub-like colors)                                                                                             |
| a theme object   | See [Theme object](#theme-object)                                                                                                      |

In `auto` mode the editor watches `<html>` and the OS setting and switches when they change.
Call `el.refreshTheme()` after changing CSS variables at runtime.

## CSS custom properties

Set `--php-script-editor-*` variables on the element. Any CSS color works, including `oklch()`,
`color-mix()` and `var()`; the editor converts them for Monaco.

```css
php-script-editor {
  --php-script-editor-background: var(--gray-950);
  --php-script-editor-accent: var(--primary-600);
  --php-script-editor-border: var(--gray-200);
  --php-script-editor-radius: 0.75rem;
  --php-script-editor-height: 20rem;
  --php-script-editor-token-keyword: oklch(0.65 0.2 25);
}
```

**Colors** (`--php-script-editor-<name>`): `background`, `foreground`, `line-highlight`,
`selection`, `cursor`, `line-number`, `line-number-active`, `widget-background`, `widget-border`,
`border`, `accent`, `danger`, `success`.

**Tokens** (`--php-script-editor-token-<name>`): `keyword`, `function`, `variable`, `identifier`,
`string`, `string-escape`, `number`, `comment`, `operator`, `delimiter`.

**UI** (`--php-script-editor-<name>`):

| Variable          | Default                | Description                      |
| ----------------- | ---------------------- | -------------------------------- |
| `height`          | `20rem`                | Element height                   |
| `radius`          | `.5rem`                | Border radius of the element     |
| `button-radius`   | `.375rem`              | Border radius of the save button |
| `ui-font`         | `system-ui,sans-serif` | Font of the toolbar              |
| `focus-ring`      | `transparent`          | Outline color while focused      |
| `accent-contrast` | `#fff`                 | Text color on the save button    |

The element's own styles are injected first into `<head>`, so your CSS overrides them. The status
is reflected as an attribute, for example `php-script-editor[status='error'] { … }`.

## Theme object

Set a theme object as the `theme` property (or as JSON in the attribute):

```js
el.theme = {
  base: 'dark',
  colors: { accent: '#e11d48' },
  tokens: { keyword: '#f472b6' },
  monaco: {
    colors: { 'editorIndentGuide.background1': '#30363d' },
    rules: [{ token: 'comment', fontStyle: 'italic' }],
  },
};
```

| Key      | Description                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `base`   | `light` or `dark`. Defaults to the page mode                                        |
| `colors` | Any of the color names above, in camelCase (`lineHighlight`, `widgetBackground`, …) |
| `tokens` | Any of the token names above, in camelCase (`stringEscape`)                         |
| `monaco` | Raw Monaco theme `colors` and token `rules`                                         |

Precedence, later wins: built-in palette, then CSS variables, then the theme object.

{: .warning }
Monaco themes are global per page. Each editor's background and gutter follow its own colors,
but token colors and widgets (suggest, hover) use the most recently applied theme. Avoid editors
with different token palettes on the same page.

## Filament

Map the variables to Filament's palette in your panel theme CSS:

```css
php-script-editor {
  --php-script-editor-radius: var(--radius-lg);
  --php-script-editor-border: var(--gray-200);
  --php-script-editor-background: var(--color-white);
  --php-script-editor-foreground: var(--gray-950);
  --php-script-editor-line-highlight: var(--gray-50);
  --php-script-editor-line-number: var(--gray-400);
  --php-script-editor-selection: var(--primary-200);
  --php-script-editor-cursor: var(--primary-600);
  --php-script-editor-accent: var(--primary-600);
  --php-script-editor-focus-ring: var(--primary-600);
  --php-script-editor-danger: var(--danger-600);
  --php-script-editor-success: var(--success-600);
  --php-script-editor-token-keyword: var(--primary-700);
}

.dark php-script-editor {
  --php-script-editor-border: color-mix(in oklab, var(--color-white) 10%, transparent);
  --php-script-editor-background: var(--gray-900);
  --php-script-editor-foreground: var(--color-white);
  --php-script-editor-line-highlight: var(--gray-800);
  --php-script-editor-line-number: var(--gray-500);
  --php-script-editor-selection: var(--primary-800);
  --php-script-editor-cursor: var(--primary-400);
  --php-script-editor-accent: var(--primary-500);
  --php-script-editor-focus-ring: var(--primary-500);
  --php-script-editor-token-keyword: var(--primary-400);
}
```
