---
title: Web component
parent: Packages
nav_order: 1
---

# Web component: `@php-script/editor`
{: .no_toc }

The `<php-script-editor>` custom element, built with [Lit](https://lit.dev) and
[Monaco](https://microsoft.github.io/monaco-editor/). Use it directly with vanilla JS, Angular,
Solid, Alpine or Livewire; the React, Vue and Svelte wrappers build on it.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
npm i @php-script/editor monaco-editor
```

`lit` is a dependency, `monaco-editor` (`>=0.55 <1`) a peer dependency, so your bundler dedupes
both.

```js
import '@php-script/editor'; // registers <php-script-editor>
```

| Entry point                     | Contents                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@php-script/editor`            | Registers the element. Exports `PhpScriptEditor`, `defineElement()`, `loadMonaco()` and all types |
| `@php-script/editor/core`       | Monaco-free helpers (config normalization, themes, save client). Safe on the server               |
| `@php-script/editor/standalone` | The [standalone build](#standalone-build) with Lit and the CSS bundled                            |

`defineElement(tag?)` registers the element under another tag name. Registering twice is a no-op,
so two bundles on one page do not clash.

## Initial content

Give the script as the `value` attribute or property, as a `<script type="text/php-script">`
child or as a `<template>` child. Indentation from the surrounding HTML is removed.

```html
<php-script-editor config-url="/php-script/config">
  <script type="text/php-script">
    foreach (order.items as item) {
      echo item.name;
    }
  </script>
</php-script-editor>
```

A `<script>` child ends at the first `</script` in its text, and its content is not
entity-decoded. For content you do not control, set the `value` attribute (escaped) or property.

## Attributes and properties

| Attribute / property             | Default   | Description                                                                                                                                  |
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                          | `''`      | Script content; updates while typing                                                                                                         |
| `config`                         |           | `MonarchLanguageDefinitionService` output (object or JSON string), see [Server](../server.html)                                              |
| `config-url` / `configUrl`       |           | URL returning that JSON; used when `config` is not set                                                                                       |
| `save-url` / `saveUrl`           |           | Save target; enables the toolbar and `Ctrl/Cmd+S`                                                                                            |
| `save-method` / `saveMethod`     | auto      | Forces a method (`PATCH`, …). Auto: `POST` for new scripts, `PUT` once persisted                                                             |
| `persisted`                      | auto      | The script already exists (forces `PUT`). Defaults to true when the initial value is non-empty                                               |
| `save-field` / `saveField`       | `content` | JSON field for the content (also used for linting)                                                                                           |
| `save-payload` / `savePayload`   |           | Extra JSON fields merged into the save body                                                                                                  |
| `save-headers` / `saveHeaders`   |           | Extra request headers (save and lint)                                                                                                        |
| `csrf-token` / `csrfToken`       | `<meta>`  | Sent as `X-CSRF-TOKEN`. Defaults to `<meta name="csrf-token">`                                                                               |
| `lint-url` / `lintUrl`           |           | POST endpoint returning `{ diagnostics: [...] }`                                                                                             |
| `lint-delay` / `lintDelay`       | `400`     | Lint debounce in ms                                                                                                                          |
| `theme`                          | `auto`    | `light`, `dark`, `auto`, or a [theme object](../themes.html#theme-object) (property or JSON)                                                 |
| `readonly`                       | `false`   | Read-only mode                                                                                                                               |
| `name`                           |           | Form field name                                                                                                                              |
| `options`                        |           | Extra [Monaco editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IStandaloneEditorConstructionOptions.html) |
| `labels`                         |           | Toolbar texts: `save`, `saving`, `saved`, `dirty`, `error`                                                                                   |
| `no-toolbar`, `no-save-shortcut` | `false`   | Hide the toolbar; disable `Ctrl/Cmd+S`                                                                                                       |
| `status` (reflected)             | `idle`    | `idle`, `dirty`, `saving`, `saved` or `error`. Useful for styling                                                                            |

Object-valued attributes (`config`, `save-payload`, `save-headers`, `options`, `labels`, `theme`)
take JSON. As properties they take plain objects.

```html
<php-script-editor
  options='{"minimap":{"enabled":true},"fontSize":13}'
  labels='{"save":"Speichern","saved":"Gespeichert"}'
></php-script-editor>
```

Read-only properties:

| Property         | Description                                                                       |
| ---------------- | --------------------------------------------------------------------------------- |
| `editor`         | The Monaco editor instance, `null` before `ps-ready`                              |
| `monaco`         | The Monaco API, `null` until the first editor has mounted (see [Monaco](#monaco)) |
| `dirty`          | `true` when the content differs from the last saved (or initial) content          |
| `resolvedConfig` | The config in use, after normalization                                            |
| `currentTheme`   | The applied theme after merging palette, CSS variables and theme object           |

## Methods

| Method                 | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `save()`               | Saves the script. Resolves to a `SaveResult`, rejects with a `SaveError` |
| `lint()`               | Runs the `lint-url` request now. Resolves to the diagnostics             |
| `setDiagnostics(list)` | Shows the given diagnostics as markers. Pass `[]` to clear them          |
| `reloadConfig()`       | Reloads the language config from `config` or `config-url`                |
| `refreshTheme()`       | Re-reads CSS variables and the theme and applies them                    |
| `whenReady()`          | Resolves to the Monaco editor once it is mounted                         |
| `focus()`              | Focuses the editor                                                       |

```js
const el = document.querySelector('php-script-editor');
const editor = await el.whenReady();
editor.updateOptions({ wordWrap: 'on' });

try {
  const result = await el.save(); // { url, method, status, data, nextUrl }
} catch (error) {
  console.error(error.status, error.data); // SaveError
}
```

## Events

All events are bubbling `CustomEvent`s:

| Event             | `detail`                                        | When                                              |
| ----------------- | ----------------------------------------------- | ------------------------------------------------- |
| `ps-ready`        | `{ editor, monaco }`                            | The editor is mounted                             |
| `ps-change`       | `{ value }`                                     | The content changed                               |
| `ps-save-start`   | `{ url, method, body }`                         | A save is about to start. Cancelable              |
| `ps-saved`        | `{ url, method, status, data, nextUrl, value }` | A save succeeded                                  |
| `ps-save-error`   | `{ error, status, data }`                       | A save failed                                     |
| `ps-diagnostics`  | `{ diagnostics }`                               | New diagnostics are shown                         |
| `ps-config-error` | `{ error }`                                     | The language config could not be loaded or parsed |

Native events fire too: `input` on every change and `change` on blur (when the content changed
since focus). So `x-model`, `wire:model` and plain form handling work out of the box.

```js
el.addEventListener('ps-save-start', (event) => {
  event.detail.body.title = titleInput.value; // add a field
  if (!confirm('Save?')) event.preventDefault(); // or cancel the save
});
```

## Saving

With `save-url` set, the element shows a toolbar with a status text and a save button, and
`Ctrl/Cmd+S` saves.

- The body is JSON: `{ ...savePayload, content: "…" }` (the field name comes from `save-field`).
- Headers: `Content-Type` and `Accept: application/json`, `X-Requested-With: XMLHttpRequest`,
  `X-CSRF-TOKEN` (from `csrf-token` or `<meta name="csrf-token">`), plus `save-headers`.
  Requests use `credentials: 'same-origin'`.
- **New scripts** (empty initial value, or `persisted="false"` as property) are saved with `POST`.
  The `Location` header of the response, or a `url` or `location` field in the JSON body, becomes
  the new `saveUrl`, and `persisted` turns true. Later saves are `PUT` requests to that URL.
- **Existing scripts** (non-empty initial value, or `persisted`) are saved with `PUT`.
- `save-method` forces one method for every save; then `saveUrl` is not changed.
- **Errors:** a failed response sets `status="error"`. The toolbar shows `errors[field][0]` (Laravel's
  validation format) or `message` from the JSON body, and a `diagnostics` array in the body
  becomes editor markers.

A matching server is described in [Server and language config](../server.html#save-endpoints).

## Linting

With `lint-url` set, the element POSTs the content (same body and headers as a save) after each
change, debounced by `lint-delay` ms, and once after mounting when the script is not empty.

The response is `{ "diagnostics": [...] }` with PHP Script's
[`LintDiagnostic::toArray()`](https://php-script.github.io/php-script/php/linting.html) entries.
Both `200` and `422` responses are read; other statuses are logged and ignored.

```json
{
  "diagnostics": [
    {
      "rule": "undefined-function",
      "message": "…",
      "line": 2,
      "column": 5,
      "length": 7,
      "severity": "error"
    }
  ]
}
```

`line` and `column` are 1-based. Without `length` a marker covers one character. You can also
show diagnostics from your own code with `setDiagnostics()`.

## Forms

The element is a form-associated custom element:

- With `name`, the script is submitted with the surrounding `<form>`.
- Resetting the form restores the initial content.
- A disabled `<fieldset>` makes the editor read-only.

```html
<form method="post" action="/scripts">
  <php-script-editor name="content" config-url="/php-script/config"></php-script-editor>
  <button>Save</button>
</form>
```

## Themes

`theme="light"` and `theme="dark"` select the built-in palettes. `auto` (the default) follows
`<html class="dark">`, `data-theme` and then `prefers-color-scheme`. Colors can be changed with
`--php-script-editor-*` CSS custom properties or a theme object. See [Themes](../themes.html).

```css
php-script-editor {
  --php-script-editor-height: 24rem;
  --php-script-editor-accent: #e11d48;
}
```

## Monaco

Monaco is loaded lazily. The element itself is small; the first `<php-script-editor>` that
connects imports a slim Monaco build (the editor API and the editor features a script editor
needs, no bundled languages) and its worker. The page renders before Monaco arrives.

- `el.monaco` is `null` until the first editor has mounted. Use `whenReady()` or the `ps-ready`
  event (its detail contains `monaco`).
- Outside an element, `loadMonaco()` starts loading and resolves to the same Monaco API. Every
  call returns the same promise, and a failed load can be retried.

```js
import { loadMonaco } from '@php-script/editor';

const monaco = await loadMonaco();
monaco.editor.getModels();
```

The worker is a separate file. Vite, webpack 5, Rollup and esbuild resolve it without extra
config. If your page already sets `self.MonacoEnvironment` with `getWorker` or `getWorkerUrl`, the
element keeps it.

{: .warning }
Monaco themes are global per page. Each editor's background and gutter follow its own colors,
but token colors and widgets (suggest, hover) use the most recently applied theme. Avoid editors
with different token palettes on the same page.

## Standalone build

For pages without a bundler (Blade, Alpine, Livewire, plain HTML), the package ships a standalone
build in `dist/standalone/`. It is a directory, not a single file:

```text
dist/standalone/
  php-script-editor.js        entry: Lit, the element and its CSS (stable name)
  chunks/monaco-<hash>.js     Monaco, loaded when the first editor connects
  assets/editor.worker-<hash>.js
```

Copy the whole directory into your public files and load the entry as a module:

```html
<script type="module" src="/vendor/php-script-editor/php-script-editor.js"></script>

<php-script-editor config-url="/php-script/config"></php-script-editor>
```

The entry loads the chunk and the worker relative to its own URL, so keep the directory structure.
The chunk names are content-hashed and can be cached forever. Serve the files from your own app
rather than a public CDN. The [Laravel package](./laravel.html) publishes the directory for you.
If you want a CDN anyway, jsDelivr serves
`https://cdn.jsdelivr.net/npm/@php-script/editor@0.1/dist/standalone/php-script-editor.js`.

The entry also exports the module API, for example
`import { loadMonaco } from '/vendor/php-script-editor/php-script-editor.js'`.

## Other frameworks

React, Vue and Svelte have [wrappers](./index.html). Elsewhere, use the element directly:

- **Angular:** add `CUSTOM_ELEMENTS_SCHEMA`, `import '@php-script/editor'`, then
  `<php-script-editor [value]="code" (ps-change)="code = $event.detail.value">`.
- **Solid:** `<php-script-editor prop:value={code()} on:ps-change={(e) => setCode(e.detail.value)} />`.
- **Alpine:** `<php-script-editor x-model="code" config-url="…">`.
- **Livewire:** `<php-script-editor wire:model="script" config-url="…">`, or see
  [Livewire with Laravel](./laravel.html#livewire).

## TypeScript

The package ships types. `HTMLElementTagNameMap` knows `php-script-editor`, and the editor events
are added to `HTMLElementEventMap`, so `querySelector` and `addEventListener` are typed:

```ts
import type {
  LintDiagnostic,
  PhpScriptConfig,
  PhpScriptTheme,
  SaveResult,
} from '@php-script/editor';

const el = document.querySelector('php-script-editor')!;
el.addEventListener('ps-change', (event) => console.log(event.detail.value));
```
