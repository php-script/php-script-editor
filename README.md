# php-script-editor

Documentation: https://php-script.github.io/php-script-editor/

A Monaco-based `<php-script-editor>` web component for [php-script](https://github.com/php-script/php-script) v2,
with thin wrappers for React, Vue and Svelte and an integration package for Laravel and Filament.

- **Server-driven language.** Highlighting and completions come from the JSON that php-script's
  `MonarchLanguageDefinitionService` produces. Pass it inline (`config`) or as a URL (`config-url`).
- **Saving built in.** Set `save-url`. The first save is a `POST`, later saves are `PUT`. The
  method can be overridden, and the CSRF token is taken from Laravel's `<meta name="csrf-token">`.
- **Lint markers.** Pass an optional `lint-url`. A 422 response with diagnostics shows them as
  editor markers.
- **Themes.** Built-in light and dark themes, an `auto` mode (follows `html.dark`, `data-theme` or
  the OS), and an external theme set through CSS custom properties or a theme object.
- **Works in forms.** The element is a form-associated custom element (`name`, reset, disabled).
- **Ships two ways.** An ES module for bundlers (`lit` as a dependency, `monaco-editor` as a peer), and a
  standalone build for Blade, Alpine and Livewire, served from your own app.
- **Loads Monaco lazily.** The element is small; Monaco is imported when the first editor connects,
  and its worker is a separate file.

| Package                                           | For                                            | Version                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@php-script/editor`](packages/editor)           | The web component (vanilla, Angular, Solid)    | [![npm](https://img.shields.io/npm/v/@php-script/editor?label=npm)](https://www.npmjs.com/package/@php-script/editor)                                    |
| [`@php-script/editor-react`](packages/react)      | React 18 and 19                                | [![npm](https://img.shields.io/npm/v/@php-script/editor-react?label=npm)](https://www.npmjs.com/package/@php-script/editor-react)                        |
| [`@php-script/editor-vue`](packages/vue)          | Vue 3 and Nuxt                                 | [![npm](https://img.shields.io/npm/v/@php-script/editor-vue?label=npm)](https://www.npmjs.com/package/@php-script/editor-vue)                            |
| [`@php-script/editor-svelte`](packages/svelte)    | Svelte 5 and SvelteKit                         | [![npm](https://img.shields.io/npm/v/@php-script/editor-svelte?label=npm)](https://www.npmjs.com/package/@php-script/editor-svelte)                      |
| [`php-script/editor-laravel`](packages/laravel)   | Laravel: Blade component, assets, lint, rule   | [![Packagist](https://img.shields.io/packagist/v/php-script/editor-laravel?label=packagist)](https://packagist.org/packages/php-script/editor-laravel)   |
| [`php-script/editor-filament`](packages/filament) | Filament 5 form field (requires the above one) | [![Packagist](https://img.shields.io/packagist/v/php-script/editor-filament?label=packagist)](https://packagist.org/packages/php-script/editor-filament) |

## Quick start

### Server (php-script v2)

```php
use PhpScript\Core\Engine;

$engine = new Engine()->allow('strtoupper')->set('user', $user);
$service = $engine->monarchLanguageDefinition();

header('Content-Type: application/json');
echo json_encode([
    'definition' => $service->getDefinition(),       // Monarch tokenizer
    'completions' => $service->getCompletionItems(), // functions, variables, classes
]);
```

With Laravel, use `EditorConfig::fromEngine($engine)` from `php-script/editor-laravel`. See the
[package README](packages/laravel/README.md).

### Browser

```bash
pnpm add @php-script/editor monaco-editor
```

```html
<script type="module">
  import '@php-script/editor';
</script>

<php-script-editor config-url="/php-script/config" save-url="/scripts" lint-url="/scripts/lint">
  <script type="text/php-script">
    if (user.age > 17) {
      echo strtoupper(user.name);
    }
  </script>
</php-script-editor>
```

You can give the initial content as `value`, as a `<script type="text/php-script">` child or as a
`<template>` child. Indentation from the surrounding HTML is removed. Without a bundler, copy the
`dist/standalone/` directory into your app and load `php-script-editor.js` from there. It includes
Lit and the CSS and loads Monaco from `chunks/` and the worker from `assets/` next to it. The chunk
names are content-hashed, so they can be cached forever. Serve it yourself rather than from a public CDN; the Laravel package publishes it
for you and only uses a CDN when you configure one explicitly.

## Element API

| Attribute / property             | Default   | Description                                                                                 |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `value`                          | `''`      | Script content; updates while typing                                                        |
| `config`                         |           | `MonarchLanguageDefinitionService` output (object or JSON string)                           |
| `config-url` / `configUrl`       |           | URL returning that JSON; used when `config` is not set                                      |
| `save-url` / `saveUrl`           |           | Save target. A `Location` header or `url` field in the POST response becomes the PUT target |
| `save-method` / `saveMethod`     | auto      | Forces a method (`PATCH`, …). Auto: `POST` for new scripts, `PUT` once persisted            |
| `persisted`                      | auto      | Script already exists (forces `PUT`); defaults to true when the initial value is non-empty  |
| `save-field` / `saveField`       | `content` | JSON field for the content                                                                  |
| `save-payload` / `savePayload`   |           | Extra JSON fields merged into the body                                                      |
| `save-headers` / `saveHeaders`   |           | Extra request headers                                                                       |
| `csrf-token` / `csrfToken`       | `<meta>`  | `X-CSRF-TOKEN` header                                                                       |
| `lint-url` / `lintUrl`           |           | POST endpoint returning `{ diagnostics: [...] }`                                            |
| `lint-delay` / `lintDelay`       | `400`     | Debounce in ms                                                                              |
| `theme`                          | `auto`    | `light`, `dark`, `auto` or a theme object (property)                                        |
| `readonly`, `name`               |           | Read-only mode; form field name                                                             |
| `options`                        |           | Extra Monaco editor options                                                                 |
| `labels`                         |           | Toolbar texts, e.g. `{"save":"Speichern","saved":"Gespeichert"}`                            |
| `no-toolbar`, `no-save-shortcut` | `false`   | Hide the toolbar; disable Ctrl/Cmd+S                                                        |
| `status` (reflected)             | `idle`    | `idle`, `dirty`, `saving`, `saved` or `error`. Useful for styling                           |

**Methods:**

| Method                 | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| `save()`               | Saves the script. Resolves to a `SaveResult` and throws `SaveError` on failure. |
| `lint()`               | Runs the linter.                                                                |
| `setDiagnostics(list)` | Shows the given diagnostics as markers.                                         |
| `reloadConfig()`       | Reloads the language config.                                                    |
| `refreshTheme()`       | Reapplies the theme.                                                            |
| `whenReady()`          | Resolves to the Monaco editor.                                                  |
| `focus()`              | Focuses the editor.                                                             |

The Monaco editor instance is available as `editor`, the Monaco API as `monaco` (`null` until the
first editor has mounted). Outside an element, `await loadMonaco()` from `@php-script/editor`
returns the same API and starts loading it.

**Events** (bubbling `CustomEvent`s):

| Event             | When                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `ps-ready`        | The editor is ready.                                                      |
| `ps-change`       | The content changed.                                                      |
| `ps-save-start`   | A save is about to start. Cancelable: call `preventDefault()` to stop it. |
| `ps-saved`        | A save succeeded.                                                         |
| `ps-save-error`   | A save failed.                                                            |
| `ps-diagnostics`  | New diagnostics arrived.                                                  |
| `ps-config-error` | The language config could not be loaded.                                  |

Native `input` and `change` events also fire, so `x-model`, `wire:model` and plain form handling
work out of the box.

## Themes

- `theme="light"` and `theme="dark"` select the built-in palettes.
- `auto` (the default) follows `<html class="dark">`, `[data-theme]` and then `prefers-color-scheme`.

**Matching your UI.** Set CSS custom properties on the element. Any CSS color works, including
`oklch()` and `var()`:

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

Color variables: `background`, `foreground`, `line-highlight`, `selection`, `cursor`, `line-number`,
`line-number-active`, `widget-background`, `widget-border`, `border`, `accent`, `danger`, `success`.

Token variables (`--php-script-editor-token-*`): `keyword`, `function`, `variable`, `identifier`,
`string`, `string-escape`, `number`, `comment`, `operator`, `delimiter`.

UI variables: `height`, `radius`, `button-radius`, `ui-font`, `focus-ring`, `accent-contrast`.

You can also set a theme object as a property:

```js
el.theme = { base: 'dark', colors: { accent: '#e11d48' }, tokens: { keyword: '#f472b6' } };
```

Precedence, later wins: built-in palette, then CSS variables, then the theme object.

> **Caveat:** Monaco themes are global per page. Editor backgrounds and gutters follow each element's
> own colors, but token colors and widgets (suggest, hover) use the most recently applied theme.
> Avoid showing editors with different token palettes on the same page.

## Frameworks

```tsx
// React
import { PhpScriptEditor } from '@php-script/editor-react';

<PhpScriptEditor value={code} onChange={setCode} configUrl="/config" saveUrl="/scripts" />;
```

```vue
<!-- Vue / Nuxt -->
<script setup lang="ts">
import { PhpScriptEditor } from '@php-script/editor-vue';
</script>
<template>
  <PhpScriptEditor v-model="code" config-url="/config" save-url="/scripts" @saved="onSaved" />
</template>
```

```svelte
<!-- Svelte 5 -->
<script lang="ts">
  import { PhpScriptEditor } from '@php-script/editor-svelte';
  let code = $state('');
</script>

<PhpScriptEditor bind:value={code} configUrl="/config" saveUrl="/scripts" />
```

All wrappers load the element on the client only, so they are safe with SSR (Next.js, Nuxt,
SvelteKit). Other frameworks can use the element directly:

- **Angular:** add `CUSTOM_ELEMENTS_SCHEMA`, then `import '@php-script/editor'`, then
  `<php-script-editor [value]="code" (ps-change)="code = $event.detail.value">`.
- **Solid:** `<php-script-editor prop:value={code()} on:ps-change={(e) => setCode(e.detail.value)} />`.
- **Alpine:** `<php-script-editor x-model="code" config-url="…">`.
- **Livewire:** `<php-script-editor wire:model="script" config-url="…">`.
- **Laravel:** use [`php-script/editor-laravel`](packages/laravel/README.md). It provides
  `<x-php-script-editor>`, `@phpScriptEditorScripts`, `EditorConfig`, `LintResponse` and the
  `ValidPhpScript` rule.
- **Filament:** add [`php-script/editor-filament`](packages/filament) for the `PhpScriptEditor`
  form field. It follows Filament's dark mode and colors.

## Development

Requirements: Node 24 (`.nvmrc`) and pnpm 12. PHP 8.4+ (8.5 in Docker) and Composer are needed for the dev server
and the Laravel package. Or use Docker.

```bash
pnpm install
pnpm build          # all packages
pnpm dev            # playground on http://localhost:5173 (needs the PHP dev server)
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e       # Playwright in Chromium, Firefox and WebKit
```

### Docker (Docker Desktop or OrbStack)

```bash
docker compose up -d                            # PHP dev server + playground
docker compose --profile test run --rm test     # typecheck, Vitest, Playwright e2e
docker compose --profile test run --rm test-php # Pest suites of the Laravel and Filament packages
```

The Laravel demo is not checked in. On first start, `docker compose up -d laravel` generates a
Laravel 13 app with Filament 5 into a Docker volume and copies `demo/laravel-overlay` on top. Log in
at `/admin` as `admin@example.com` / `password`. Reset it with
`docker compose rm -sf laravel && docker volume rm php-script-editor_demo-laravel-app`.

| URL                                                                   | Service                      |
| --------------------------------------------------------------------- | ---------------------------- |
| http://localhost:5173 · http://playground.php-script-editor.orb.local | Playground                   |
| http://localhost:8080 · http://php.php-script-editor.orb.local        | php-script v2 dev API server |
| http://localhost:8000 · http://laravel.php-script-editor.orb.local    | Laravel 13 + Filament 5 demo |

### Layout

```text
packages/editor   web component (Lit + Monaco), unit and browser tests
packages/react    React wrapper
packages/vue      Vue wrapper
packages/svelte   Svelte wrapper
packages/laravel  Laravel composer package: Blade, assets, lint, rule (Pest)
packages/filament Filament 5 form field composer package (Pest)
dev-server        plain PHP php-script v2 API for the playground and e2e tests
playground        Vite multi-page app and Playwright e2e tests
demo              overlay for the generated Laravel + Filament demo app
docker            Dockerfiles for compose.yaml
```

## License

MIT
