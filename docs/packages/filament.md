---
title: Filament
parent: Packages
nav_order: 6
---

# Filament: `php-script/editor-filament`
{: .no_toc }

[![Packagist](https://img.shields.io/packagist/v/php-script/editor-filament?label=packagist)](https://packagist.org/packages/php-script/editor-filament)

A [Filament](https://filamentphp.com) 5 form field for [`<php-script-editor>`](./editor.html). It
builds on the [Laravel package](./laravel.html) (`EditorConfig`, `LintResponse`,
`ValidPhpScript`, config and the published editor).

Requirements: PHP 8.4+, Laravel 12 or 13, Filament ^5.0, `php-script/php-script` ^2.0.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
composer require php-script/editor-filament
php artisan vendor:publish --tag=php-script-editor-assets --force   # -> public/vendor/php-script-editor/
```

This also installs `php-script/editor-laravel`. The service provider is auto-discovered. Add
`@php artisan vendor:publish --tag=laravel-assets --ansi --force` to `post-update-cmd` (Laravel's
default) to keep the published editor up to date.

The field loads the editor with a dynamic `import()` the first time it is shown, so other panel
pages don't pay for it. It is not registered as a Filament asset: `filament:assets` copies single
files, but the editor loads its Monaco chunk and worker relative to the entry. Missing files fail
loudly with a `MissingEditorAssetException` in debug mode. The CDN is used only when configured
explicitly (`PHP_SCRIPT_EDITOR_ASSET=cdn`), and `php-script-editor.asset_url` wins over everything.
See [Laravel configuration](./laravel.html#configuration).

## Usage

```php
use PhpScript\Core\Engine;
use PhpScript\Editor\Filament\PhpScriptEditor;

PhpScriptEditor::make('script')
    ->engine(fn () => app(Engine::class))  // language definition and completions
    ->validateScript()                      // ValidPhpScript with the same engine
    ->height('24rem')
    ->theme('auto')                         // follows Filament's dark mode
    ->lintUrl(route('scripts.lint'))        // optional live diagnostics (LintResponse)
    ->editorOptions(['minimap' => ['enabled' => true]])
    ->columnSpanFull();
```

## Methods

| Method                                                | Description                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `engine(Engine\|Closure)`                             | Engine for the editor config and `validateScript()`             |
| `editorConfig(EditorConfig\|array\|Closure)`          | Explicit config instead of `engine()`                           |
| `configUrl(string\|Closure)`                          | Load the config from a URL instead of inlining it into the page |
| `lintUrl(string\|Closure)`, `lintDelay(int\|Closure)` | Live diagnostics, see [Linting](./editor.html#linting)          |
| `validateScript(bool\|Closure = true)`                | Adds the `ValidPhpScript` rule with the field's engine          |
| `theme(string\|array\|Closure)`                       | `light`, `dark`, `auto` or a theme array                        |
| `height(string\|int\|Closure)`                        | CSS length; integers are pixels                                 |
| `editorOptions(array\|Closure)`                       | Monaco editor options                                           |
| `labels(array\|Closure)`                              | Editor labels                                                   |
| `disabled()`, `readOnly()`                            | Both make the editor read-only                                  |
| `live()`, `live(onBlur: true)`, `live(debounce: 500)` | Respected like other Filament fields                            |

`theme`, `height` and `lintDelay` fall back to the values in `config/php-script-editor.php`.

The field has no save toolbar and no `Ctrl/Cmd+S`; the form saves the state. Publish the view to
customize it:

```bash
php artisan vendor:publish --tag=php-script-editor-filament-views
```

## Theming

`theme('auto')` follows Filament's dark mode (the `dark` class on `<html>`). To match the panel
colors, map the CSS custom properties to Filament's palette in your panel theme CSS. A complete
example is on the [Themes](../themes.html#filament) page.
