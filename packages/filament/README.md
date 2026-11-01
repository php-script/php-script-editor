# php-script/editor-filament

[![Packagist](https://img.shields.io/packagist/v/php-script/editor-filament?label=packagist)](https://packagist.org/packages/php-script/editor-filament)
[![Downloads](https://img.shields.io/packagist/dt/php-script/editor-filament?label=downloads)](https://packagist.org/packages/php-script/editor-filament)

Documentation: https://php-script.github.io/php-script-editor/packages/filament.html

[Filament](https://filamentphp.com) 5 form field for the `<php-script-editor>` web component (Monaco based
editor for [php-script](https://github.com/php-script/php-script) v2). Built on
[`php-script/editor-laravel`](../laravel/README.md) (`EditorConfig`, `LintResponse`, `ValidPhpScript`, config).

Requirements: PHP 8.4+, Laravel 12 or 13, Filament ^5.0, php-script ^2.0.

## Installation

```bash
composer require php-script/editor-filament
php artisan vendor:publish --tag=php-script-editor-assets --force   # -> public/vendor/php-script-editor/
```

The service provider is auto-discovered. The field loads the editor published by `php-script/editor-laravel`
with a dynamic `import()` the first time it is shown, so other panel pages don't pay for it. It is not a
Filament asset: `filament:assets` copies single files, but the editor loads its Monaco chunk and worker
relative to the entry. The `laravel-assets` tag also publishes it, so add
`@php artisan vendor:publish --tag=laravel-assets --ansi --force` to `post-update-cmd`. If the files are
missing it fails loudly with a `MissingEditorAssetException` in debug mode. The CDN is only used when configured explicitly
(`PHP_SCRIPT_EDITOR_ASSET=cdn`), and `php-script-editor.asset_url` wins over everything.

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

| Method                                                |                                                     |
| ----------------------------------------------------- | --------------------------------------------------- |
| `engine(Engine\|Closure)`                             | Config and validation engine                        |
| `editorConfig(EditorConfig\|array\|Closure)`          | Explicit config instead of `engine()`               |
| `configUrl(string\|Closure)`                          | Load the config via URL (not inlined into the page) |
| `lintUrl()`, `lintDelay()`                            | Live diagnostics                                    |
| `validateScript(bool\|Closure = true)`                | Adds the `ValidPhpScript` rule                      |
| `theme()`, `height()`, `editorOptions()`, `labels()`  |                                                     |
| `disabled()`, `readOnly()`                            | Both make the editor read-only                      |
| `live()`, `live(onBlur: true)`, `live(debounce: 500)` | Respected like other Filament fields                |

The field has no save toolbar; the form saves the state. The view can be published with
`php artisan vendor:publish --tag=php-script-editor-filament-views`.

Theming (CSS custom properties mapped to the panel palette) is described in the
[editor-laravel README](../laravel/README.md#theming).

## Development

This package lives in `packages/filament` of the php-script-editor monorepo and requires
`php-script/editor-laravel` from `../laravel` through a composer path repository. Composer ignores `repositories` and
`minimum-stability` outside the root package, so a released split resolves `php-script/editor-laravel` ^0.1 from Packagist.

```bash
composer install
composer test
```

## License

MIT
