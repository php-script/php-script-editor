---
title: Packages
nav_order: 3
has_children: true
---

# Packages

All packages live in the [php-script-editor](https://github.com/php-script/php-script-editor)
monorepo. The npm packages are released together with the same version.

| Package                                         | Registry  | Depends on                                  |
| ----------------------------------------------- | --------- | ------------------------------------------- |
| [`@php-script/editor`](./editor.html)           | npm       | `lit`, peer `monaco-editor`                 |
| [`@php-script/editor-react`](./react.html)      | npm       | `@php-script/editor`, peer `react`          |
| [`@php-script/editor-vue`](./vue.html)          | npm       | `@php-script/editor`, peer `vue`            |
| [`@php-script/editor-svelte`](./svelte.html)    | npm       | `@php-script/editor`, peer `svelte`         |
| [`php-script/editor-laravel`](./laravel.html)   | Packagist | `php-script/php-script` ^2.0, Laravel 12/13 |
| [`php-script/editor-filament`](./filament.html) | Packagist | `php-script/editor-laravel`, Filament 5     |

The wrappers pass `monaco-editor` through as a peer dependency, so install it next to them if
your package manager does not do that automatically. The Laravel package ships the
[standalone build](./editor.html#standalone-build) of the editor, so Blade, Livewire and
Filament need no npm setup.
