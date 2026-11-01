---
title: Home
layout: home
nav_order: 1
---

# PHP Script Editor

<p>
    <a href="https://github.com/php-script/php-script-editor/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/php-script/php-script-editor/actions/workflows/ci.yml/badge.svg"></a>
    <a href="https://www.npmjs.com/package/@php-script/editor"><img alt="npm" src="https://img.shields.io/npm/v/@php-script/editor"></a>
    <a href="https://packagist.org/packages/php-script/editor-laravel"><img alt="Packagist" src="https://img.shields.io/packagist/v/php-script/editor-laravel"></a>
    <a href="https://www.npmjs.com/package/@php-script/editor"><img alt="License" src="https://img.shields.io/npm/l/@php-script/editor"></a>
</p>

A Monaco-based `<php-script-editor>` web component for [PHP Script](https://php-script.github.io/php-script/)
v2, with thin wrappers for React, Vue and Svelte and integration packages for Laravel and Filament.

```html
<php-script-editor config-url="/php-script/config" save-url="/scripts" lint-url="/scripts/lint">
  <script type="text/php-script">
    if (user.age > 17) {
      echo strtoupper(user.name);
    }
  </script>
</php-script-editor>
```

## Features

- **Server-driven language.** Highlighting and completions come from the JSON that PHP Script's
  `MonarchLanguageDefinitionService` produces, so the editor knows exactly the functions and
  variables your engine allows. See [Server and language config](./server.html).
- **Saving built in.** Set `save-url`. The first save is a `POST`, later saves are `PUT`.
- **Lint markers.** An optional `lint-url` shows the linter's diagnostics as editor markers.
- **Themes.** Light, dark and `auto`, plus your own colors through CSS custom properties or a
  theme object. See [Themes](./themes.html).
- **Works in forms.** The element is a form-associated custom element.
- **Small and lazy.** The element is small; Monaco is loaded when the first editor connects.

## Packages

| Package                                                  | Install                                         | For                                          |
| -------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| [`@php-script/editor`](./packages/editor.html)           | `npm i @php-script/editor monaco-editor`        | The web component (vanilla, Angular, Solid)  |
| [`@php-script/editor-react`](./packages/react.html)      | `npm i @php-script/editor-react monaco-editor`  | React 18 and 19, Next.js                     |
| [`@php-script/editor-vue`](./packages/vue.html)          | `npm i @php-script/editor-vue monaco-editor`    | Vue 3 and Nuxt                               |
| [`@php-script/editor-svelte`](./packages/svelte.html)    | `npm i @php-script/editor-svelte monaco-editor` | Svelte 5 and SvelteKit                       |
| [`php-script/editor-laravel`](./packages/laravel.html)   | `composer require php-script/editor-laravel`    | Laravel: Blade component, assets, lint, rule |
| [`php-script/editor-filament`](./packages/filament.html) | `composer require php-script/editor-filament`   | Filament 5 form field                        |

The npm packages are at 0.1.x and target PHP Script `^2.0`.

## Where to start?

- New here? Read **[Getting started](./getting-started.html)**.
- Using Laravel or Filament? Go straight to **[Laravel](./packages/laravel.html)** or
  **[Filament](./packages/filament.html)**.
- Looking for the language itself? The **[PHP Script documentation](https://php-script.github.io/php-script/)**
  covers the [language](https://php-script.github.io/php-script/language/), the
  [PHP integration](https://php-script.github.io/php-script/php/) and how the
  [editor integration](https://php-script.github.io/php-script/php/editor.html) works under the hood.
