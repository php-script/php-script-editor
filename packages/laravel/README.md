# php-script/editor-laravel

Laravel and [Filament](https://filamentphp.com) integration for the `<php-script-editor>` web component
(Monaco based editor for [php-script](https://github.com/php-script/php-script) v2).

- `EditorConfig`: the `{definition, completions}` JSON the editor needs, built from your `Engine`
- `LintResponse` and the `ValidPhpScript` rule: lint endpoints and validation with the engine's linter
- `<x-php-script-editor>` Blade component and `@phpScriptEditorScripts` directive
- `PhpScriptEditor` Filament form field (optional, Filament v4 or v5)

Requirements: PHP 8.4+ (required by php-script v2), Laravel 12 or 13, php-script ^2.0.

## Installation

```bash
composer require php-script/editor-laravel
```

The service provider is auto-discovered. Optionally publish the config:

```bash
php artisan vendor:publish --tag=php-script-editor-config
```

### The editor script

The editor is a single ES module (Monaco, Lit and CSS bundled, about 3.4 MB, about 900 KB gzipped).
By default (`'asset' => 'auto'`) it is loaded from your app when published, otherwise from jsDelivr:

```bash
php artisan vendor:publish --tag=php-script-editor-assets --force
# -> public/vendor/php-script-editor/php-script-editor.js
```

The file is also published with Laravel's `laravel-assets` tag, so the usual
`"post-update-cmd": ["@php artisan vendor:publish --tag=laravel-assets --ansi --force"]` keeps it up to date.

| `config/php-script-editor.php` |                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `asset`                        | `auto` (published file if present, CDN otherwise), `published` or `cdn`                             |
| `asset_url`                    | Explicit URL, wins over everything (e.g. your own Vite build)                                       |
| `cdn_url`                      | Default `https://cdn.jsdelivr.net/npm/@php-script/editor@2/dist/standalone/php-script-editor.js`    |
| `inject_script`                | The Blade component adds the `<script type="module">` tag itself, once per request (default `true`) |
| `theme`                        | Default theme: `light`, `dark` or `auto` (follows `html.dark`)                                      |
| `height`                       | Default height (any CSS length)                                                                     |
| `lint_delay`                   | Debounce of `lint-url` requests in ms                                                               |

If you bundle the editor yourself (`npm i @php-script/editor monaco-editor`, `import '@php-script/editor'`),
set `inject_script` to `false`.

## Building the editor config

```php
use PhpScript\Core\Engine;

$engine = new Engine()
    ->allow('strtoupper', 'round')
    ->set('order', $order, 'The current order'); // objects are reflected for completions
```

```php
use PhpScript\Editor\Laravel\EditorConfig;

$config = EditorConfig::fromEngine($engine);
$config->toArray(); // ['definition' => [...], 'completions' => [...]]
$config->toJson();
return $config;     // Responsable: a JSON response

EditorConfig::lint($engine, $code); // list of LintDiagnostic::toArray()
```

Bind the engine once, so controllers, rules and fields share it:

```php
// AppServiceProvider::register()
$this->app->bind(Engine::class, fn () => new Engine()->allow('strtoupper')->set('order', new Order));
```

## Blade

```blade
<x-php-script-editor
    name="content"
    :value="$script->content"
    :config="$engine"            {{-- Engine, EditorConfig or array --}}
    height="24rem"
/>
```

Inside a normal `<form>` the element is form-associated: the script is submitted as `content`.

| Prop                                                                      | Element attribute                       |                                                                                    |
| ------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `name`                                                                    | `name`                                  | Form field name                                                                    |
| `value`                                                                   | `value`                                 | Initial script                                                                     |
| `config`                                                                  | `config`                                | `Engine` (converted with `EditorConfig::fromEngine()`), `EditorConfig` or array    |
| `config-url`                                                              | `config-url`                            | Load the config from an endpoint instead of inlining it                            |
| `save-url`, `save-method`, `save-field`, `:save-headers`, `:save-payload` | same                                    | Built-in save toolbar (`Ctrl/Cmd+S`)                                               |
| `persisted`                                                               | `persisted`                             | Script exists already: save with `PUT` (default: `true` when `value` is not empty) |
| `csrf-token`                                                              | `csrf-token`                            | Defaults to `<meta name="csrf-token">`                                             |
| `lint-url`, `:lint-delay`                                                 | same                                    | Live diagnostics while typing                                                      |
| `theme`                                                                   | `theme`                                 | `light`, `dark`, `auto` or a theme array (JSON encoded)                            |
| `readonly`, `no-toolbar`, `no-save-shortcut`                              | same                                    |                                                                                    |
| `height`                                                                  | `style="--php-script-editor-height: …"` | CSS length, integers are pixels                                                    |
| `:options`, `:labels`                                                     | same                                    | Monaco options / toolbar labels (JSON encoded)                                     |
| `:script="false"`                                                         |                                         | Do not render the script tag for this editor                                       |

Every other attribute (`class`, `id`, `wire:*`, `x-*`, `data-*` …) is passed through.

**Escaping.** All editor attributes are rendered with `htmlspecialchars(ENT_QUOTES)`, arrays as JSON. The script
content goes into the `value` attribute, not into a child `<script type="text/php-script">`: a script child ends at
the first `</script` in the content and its text is not entity-decoded, so it cannot be escaped safely.
An attribute value can hold any content, and `&amp;` in a script stays `&amp;`.

The script tag is rendered by the first `<x-php-script-editor>` on the page. To put it into your layout instead:

```blade
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @phpScriptEditorScripts {{-- once per request, adds Vite's CSP nonce if set --}}
</head>
```

## Controllers

The element saves JSON `{...savePayload, content: "…"}`: `POST` to `save-url` for new scripts, then `PUT` to the
`Location` of the `201` response. A `422` with Laravel's `errors.content[0]` is shown in the toolbar and
`diagnostics` become editor markers.

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

    // GET /scripts/config  -> <x-php-script-editor config-url="/scripts/config" />
    public function config(): EditorConfig
    {
        return EditorConfig::fromEngine($this->engine);
    }

    // POST /scripts/lint  -> lint-url: 200 {diagnostics: []} or 422 {message, errors, diagnostics}
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
            'content' => ['required', 'string', new ValidPhpScript($this->engine)], // 422, no diagnostics
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

`LintResponse::abortIfInvalid()` returns the diagnostics with the 422 (markers in the editor), the rule only
the message. `ValidPhpScript` accepts an `Engine` or a closure (`new ValidPhpScript(fn () => app(Engine::class))`),
fails with the first error message and ignores warnings and empty values (combine it with `required`).

## Filament

Requires `filament/filament` ^4.0 or ^5.0. The editor module is registered as a Filament asset that is only loaded
on pages that show the field (`loadedOnRequest()`). Publish it with the other Filament assets:

```bash
php artisan filament:assets   # -> public/js/php-script/editor-laravel/php-script-editor.js
```

Until then (or if the package was installed without the built file), the field loads it from the CDN.

```php
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\Filament\PhpScriptEditor;

PhpScriptEditor::make('script')
    ->engine(fn () => app(Engine::class))  // language definition and completions
    ->validateScript()                      // ValidPhpScript with the same engine
    ->height('24rem')
    ->theme('auto')                         // follows Filament's dark mode
    ->lintUrl(route('scripts.lint'))        // optional live diagnostics
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

The field has no save toolbar; the form saves the state.

## Livewire (without Filament)

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

The element fires `input` on every change (value in `event.target.value`), `change` on blur, and `ps-change`,
`ps-saved`, `ps-save-error`, `ps-diagnostics`, `ps-ready` custom events. Use `$entangle('content', true)` for
live updates, or `$wire.$commit()` in a `change` listener to send on blur.

## Theming

`theme="auto"` follows the `dark` class on `<html>` (Filament's dark mode). Colors can be overridden with CSS
custom properties on the element (any CSS color, including `oklch()`), for example mapped to Filament's palette
in your panel theme CSS:

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

Color names: `background`, `foreground`, `line-highlight`, `selection`, `cursor`, `line-number`,
`line-number-active`, `widget-background`, `widget-border`, `border`, `accent`, `danger`, `success`; token colors:
`token-keyword`, `token-function`, `token-variable`, `token-identifier`, `token-string`, `token-string-escape`,
`token-number`, `token-comment`, `token-operator`, `token-delimiter`. A theme array passed to `theme` wins over the
CSS variables: `->theme(['colors' => ['accent' => 'oklch(0.6 0.2 250)']])`. Monaco themes are global, so all
editors on one page share one theme.

## Development

This package lives in the `packages/laravel` directory of the php-script-editor monorepo.

```bash
composer install
composer build-asset            # copies packages/editor/dist/standalone/php-script-editor.js to resources/dist/
php bin/build-asset.php --build # builds the editor first (pnpm --filter @php-script/editor build)
composer test
```

Or by hand from the monorepo root:

```bash
pnpm --filter @php-script/editor build
cp packages/editor/dist/standalone/php-script-editor.js packages/laravel/resources/dist/
```

`resources/dist/` is git-ignored: the built module has to be added in the release step. Without it the package
still works and loads the editor from the CDN (the `php-script-editor-assets` publish tag is then not offered).

Packagist needs the package at the root of a repository: releases are published through a subtree split of
`packages/laravel` into a separate repository (e.g. `php-script/editor-laravel`) that also contains the built
`resources/dist/php-script-editor.js`.

## License

MIT
