---
title: Laravel
parent: Packages
nav_order: 5
---

# Laravel: `php-script/editor-laravel`
{: .no_toc }

[![Packagist](https://img.shields.io/packagist/v/php-script/editor-laravel?label=packagist)](https://packagist.org/packages/php-script/editor-laravel)

Laravel integration for [`<php-script-editor>`](./editor.html):

- `EditorConfig`: the `{definition, completions}` JSON the editor needs, built from your `Engine`
- `LintResponse` and the `ValidPhpScript` rule: lint endpoints and validation with the engine's linter
- `<x-php-script-editor>` Blade component and the `@phpScriptEditorScripts` directive
- The built editor, published to `public/vendor/php-script-editor`

Requirements: PHP 8.4+, Laravel 12 or 13, `php-script/php-script` ^2.0. For Filament, add the
[Filament package](./filament.html) on top.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
composer require php-script/editor-laravel
php artisan vendor:publish --tag=php-script-editor-assets --force
```

The service provider is auto-discovered. The second command copies the editor's
[standalone build](./editor.html#standalone-build) to
`public/vendor/php-script-editor/{php-script-editor.js,chunks/,assets/}`. The whole directory is
published, because the entry loads its Monaco chunk and worker relative to itself.

The directory is also part of Laravel's `laravel-assets` tag, so the default `post-update-cmd` of
a Laravel app keeps it up to date after `composer update`:

```json
"post-update-cmd": [
    "@php artisan vendor:publish --tag=laravel-assets --ansi --force"
]
```

There is no silent CDN fallback. If the file is missing, rendering throws a
`MissingEditorAssetException` with the publish command when `APP_DEBUG` is on. With debug off the
exception is reported and the published URL is used anyway.

## Configuration

```bash
php artisan vendor:publish --tag=php-script-editor-config
```

| `config/php-script-editor.php` | Default                                         | Description                                                                        |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `asset`                        | `published` (`PHP_SCRIPT_EDITOR_ASSET`)         | `published` serves the published files; `cdn` opts in to `cdn_url`                 |
| `asset_url`                    | `null` (`PHP_SCRIPT_EDITOR_ASSET_URL`)          | Explicit module URL, wins over everything (e.g. your own Vite build)               |
| `published_path`               | `vendor/php-script-editor/php-script-editor.js` | Entry path below `public/`                                                         |
| `cdn_url`                      | jsDelivr, `@php-script/editor@0.1`              | Used only with `asset` = `cdn`                                                     |
| `inject_script`                | `true`                                          | The Blade component adds the `<script type="module">` tag itself, once per request |
| `theme`                        | `auto`                                          | Default theme: `light`, `dark` or `auto` (follows `html.dark`)                     |
| `height`                       | `null` (element default `20rem`)                | Default height, any CSS length                                                     |
| `lint_delay`                   | `null` (element default `400`)                  | Debounce of `lint-url` requests in ms                                              |

The published URL gets a `?v=` cache buster based on the file. If you bundle the editor yourself
(`npm i @php-script/editor monaco-editor` and `import '@php-script/editor'`), set `inject_script`
to `false`.

## Editor config

Build the engine once and bind it, so controllers, rules and fields share it:

```php
use PhpScript\Core\Engine;

// AppServiceProvider::register()
$this->app->bind(Engine::class, fn () => new Engine()
    ->allow('strtoupper', 'round')
    ->set('order', new Order, 'The current order')); // objects are reflected for completions
```

`EditorConfig` turns it into the editor's JSON (see [Server and language config](../server.html)):

```php
use PhpScript\Editor\Laravel\EditorConfig;

$config = EditorConfig::fromEngine($engine);
$config->toArray(); // ['definition' => [...], 'completions' => [...]]
$config->toJson();
return $config;     // Responsable: a JSON response

EditorConfig::from($engineOrConfigOrArray);
EditorConfig::lint($engine, $code); // list of LintDiagnostic::toArray()
```

## Blade component

{% raw %}
```blade
<x-php-script-editor
    name="content"
    :value="$script->content"
    :config="$engine"            {{-- Engine, EditorConfig or array --}}
    height="24rem"
/>
```
{% endraw %}

Inside a `<form>` the element is form-associated: the script is submitted as `content`.

| Prop                                                                      | Description                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `name`, `value`                                                           | Form field name, initial script                                                 |
| `config`                                                                  | `Engine` (converted with `EditorConfig::fromEngine()`), `EditorConfig` or array |
| `config-url`                                                              | Load the config from an endpoint instead of inlining it                         |
| `save-url`, `save-method`, `save-field`, `:save-headers`, `:save-payload` | Built-in save toolbar, see [Saving](./editor.html#saving)                       |
| `:persisted`                                                              | `false` saves with `POST` first (default: `true` when `value` is not empty)     |
| `csrf-token`                                                              | Defaults to `<meta name="csrf-token">`                                          |
| `lint-url`, `:lint-delay`                                                 | Live diagnostics while typing                                                   |
| `theme`                                                                   | `light`, `dark`, `auto` or a theme array                                        |
| `readonly`, `no-toolbar`, `no-save-shortcut`                              | Flags                                                                           |
| `height`                                                                  | CSS length; integers are pixels                                                 |
| `:options`, `:labels`                                                     | Monaco options, toolbar labels                                                  |
| `:script="false"`                                                         | Do not render the script tag for this editor                                    |

Every other attribute (`class`, `id`, `wire:*`, `x-*`, `data-*`, …) is passed through to the
element. All values are escaped with `htmlspecialchars(ENT_QUOTES)`, arrays are JSON encoded, and
the script goes into the `value` attribute, so any content is safe.

### The script tag

The first `<x-php-script-editor>` on a page renders the module script tag. To put it in your
layout instead:

{% raw %}
```blade
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @phpScriptEditorScripts {{-- once per request, adds Vite's CSP nonce if set --}}
</head>
```
{% endraw %}

## Controllers

The element saves JSON `{...savePayload, content: "…"}`: `POST` to `save-url` for new scripts,
then `PUT` to the `Location` of the `201` response. A `422` with Laravel's `errors.content[0]` is
shown in the toolbar, and `diagnostics` become editor markers.

```php
use App\Models\Script;
use Illuminate\Http\Request;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\LintResponse;
use PhpScript\Editor\Laravel\Rules\ValidPhpScript;

class ScriptController
{
    public function __construct(private Engine $engine) {}

    // GET /scripts/config
    public function config(): EditorConfig
    {
        return EditorConfig::fromEngine($this->engine);
    }

    // POST /scripts/lint: 200 {diagnostics: []} or 422 {message, errors, diagnostics}
    public function lint(Request $request): LintResponse
    {
        return LintResponse::fromEngine($this->engine, $request->string('content')->toString());
    }

    // POST /scripts
    public function store(Request $request)
    {
        $data = $request->validate(['content' => ['required', 'string']]);
        LintResponse::abortIfInvalid($this->engine, $data['content']); // 422 with diagnostics

        $script = Script::create($data);

        return response()->json($script, 201)->header('Location', route('scripts.update', $script));
    }

    // PUT /scripts/{script}
    public function update(Request $request, Script $script)
    {
        $data = $request->validate([
            'content' => ['required', 'string', new ValidPhpScript($this->engine)],
        ]);

        $script->update($data);

        return response()->json($script);
    }
}
```

```blade
<x-php-script-editor
    :value="$script?->content"
    :persisted="$script?->exists"
    :save-url="$script ? route('scripts.update', $script) : route('scripts.store')"
    :lint-url="route('scripts.lint')"
    :config-url="route('scripts.config')"
/>
```

### `LintResponse`

- `LintResponse::fromEngine($engine, $code, $field = 'content')`: `200 {"diagnostics": [...]}` for a
  valid script, `422 {"message", "errors": {"content": [...]}, "diagnostics": [...]}` otherwise.
- `LintResponse::abortIfInvalid($engine, $code)`: throws that 422 response from a store or update
  action, so the editor shows the markers.
- Only errors make a script invalid; warnings do not.

### `ValidPhpScript`

```php
new ValidPhpScript($engine);
new ValidPhpScript(fn () => app(Engine::class)); // resolved lazily
```

The rule fails with the first error message, ignores warnings and empty values (combine it with
`required`), and returns no diagnostics to the editor. Use `LintResponse::abortIfInvalid()` when
you want markers. `$rule->diagnostics()` returns the diagnostics of the last validated value.

## Livewire

Wrap the element in `wire:ignore` and sync it with Alpine:

```blade
<div
    wire:ignore
    x-data="{ state: $wire.$entangle('content') }"
    x-init="
        $refs.editor.value = state ?? '';
        $refs.editor.addEventListener('input', () => state = $refs.editor.value);
        $watch('state', (value) => { if ((value ?? '') !== $refs.editor.value) $refs.editor.value = value ?? '' });
    "
>
    <x-php-script-editor x-ref="editor" :config="$engine" height="20rem" />
</div>
```

The element fires `input` on every change and `change` on blur. Use
`$entangle('content', true)` for live updates, or `$wire.$commit()` in a `change` listener to send
on blur.

## Theming

`theme="auto"` follows the `dark` class on `<html>`. Map the colors to your design with CSS custom
properties; see [Themes](../themes.html), including a [Filament palette](../themes.html#filament).
A theme array passed to `theme` wins over the CSS variables:

```blade
<x-php-script-editor :theme="['colors' => ['accent' => 'oklch(0.6 0.2 250)']]" />
```
