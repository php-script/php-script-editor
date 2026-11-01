<?php

declare(strict_types=1);

use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\Filament\FilamentIntegration;
use PhpScript\Editor\Laravel\PhpScriptEditorServiceProvider;

afterEach(function (): void {
    File::deleteDirectory(public_path('vendor/php-script-editor'));
});

it('falls back to the CDN when nothing is published', function (): void {
    expect(app(EditorAssets::class)->url())->toBe(EditorAssets::DEFAULT_CDN_URL);
});

it('uses the published file when it exists', function (): void {
    File::ensureDirectoryExists(public_path('vendor/php-script-editor'));
    File::put(public_path('vendor/php-script-editor/php-script-editor.js'), 'export {}');

    expect(app(EditorAssets::class)->url())->toStartWith('http://localhost/vendor/php-script-editor/php-script-editor.js?v=');
});

it('respects the asset mode and an explicit url', function (): void {
    File::ensureDirectoryExists(public_path('vendor/php-script-editor'));
    File::put(public_path('vendor/php-script-editor/php-script-editor.js'), 'export {}');

    config(['php-script-editor.asset' => 'cdn', 'php-script-editor.cdn_url' => 'https://cdn.example.com/editor.js']);
    expect(app(EditorAssets::class)->url())->toBe('https://cdn.example.com/editor.js');

    config(['php-script-editor.asset_url' => '/build/editor.js']);
    expect(app(EditorAssets::class)->url())->toBe('/build/editor.js');
});

it('adds the CSP nonce to the script tag', function (): void {
    Vite::useCspNonce('abc"123');

    expect((string) app(EditorAssets::class)->scriptTag())->toContain(' nonce="abc&quot;123"');
});

it('publishes the config and the built module', function (): void {
    $config = ServiceProvider::pathsToPublish(PhpScriptEditorServiceProvider::class, 'php-script-editor-config');
    $assets = ServiceProvider::pathsToPublish(PhpScriptEditorServiceProvider::class, 'php-script-editor-assets');

    expect(array_values($config))->toBe([config_path('php-script-editor.php')]);

    if (EditorAssets::hasDist()) {
        expect($assets)->toBe([EditorAssets::distPath() => public_path('vendor/php-script-editor/php-script-editor.js')]);
    } else {
        expect($assets)->toBe([]);
    }
});

it('merges the package config', function (): void {
    expect(config('php-script-editor'))->toMatchArray(['asset' => 'auto', 'theme' => 'auto', 'inject_script' => true]);
});

it('registers the module as a lazily loaded Filament asset', function (): void {
    $script = collect(FilamentAsset::getScripts([EditorAssets::PACKAGE]))->firstOrFail();

    expect($script->getId())->toBe(FilamentIntegration::ASSET_ID)
        ->and($script->isModule())->toBeTrue()
        ->and($script->isLoadedOnRequest())->toBeTrue()
        ->and($script->getPath())->toBe(EditorAssets::hasDist() ? EditorAssets::distPath() : EditorAssets::DEFAULT_CDN_URL);
});

it('falls back to the CDN when filament:assets has not run', function (): void {
    expect(FilamentIntegration::scriptSrc())->toBe(EditorAssets::DEFAULT_CDN_URL);
});
