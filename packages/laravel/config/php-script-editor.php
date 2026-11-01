<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Editor script
    |--------------------------------------------------------------------------
    |
    | Where the <php-script-editor> ES module is loaded from.
    |
    | "published" the file published to public/vendor/php-script-editor
    |             (php artisan vendor:publish --tag=php-script-editor-assets).
    |             When it is missing, an exception tells you so (with app.debug,
    |             otherwise it is reported): there is no silent CDN fallback.
    | "cdn"       opt in: load it from the CDN url below.
    |
    | "asset_url" overrides everything, e.g. a file built by your own Vite setup.
    |
    */

    'asset' => env('PHP_SCRIPT_EDITOR_ASSET', 'published'),

    'asset_url' => env('PHP_SCRIPT_EDITOR_ASSET_URL'),

    'published_path' => 'vendor/php-script-editor/php-script-editor.js',

    'cdn_url' => 'https://cdn.jsdelivr.net/npm/@php-script/editor@0.1/dist/standalone/php-script-editor.js',

    /*
    | The Blade component adds the <script type="module"> tag itself (once per
    | request). Disable it when you load the script with @phpScriptEditorScripts
    | in your layout or bundle it yourself.
    */

    'inject_script' => true,

    /*
    |--------------------------------------------------------------------------
    | Defaults for <x-php-script-editor> and the Filament field
    |--------------------------------------------------------------------------
    */

    // light | dark | auto (auto follows the `dark` class on <html>, like Filament)
    'theme' => 'auto',

    // Any CSS length. null keeps the element default (20rem).
    'height' => null,

    // Debounce in ms for lint-url requests. null keeps the element default (400).
    'lint_delay' => null,

];
