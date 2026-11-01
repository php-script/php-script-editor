<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\MissingEditorAssetException;
use PhpScript\Editor\Laravel\PhpScriptEditorServiceProvider;

afterEach(function (): void {
    File::deleteDirectory(public_path('vendor/php-script-editor'));
});

it('fails loudly in debug mode when nothing is published (no CDN fallback)', function (): void {
    config(['app.debug' => true]);

    expect(fn () => app(EditorAssets::class)->url())
        ->toThrow(MissingEditorAssetException::class, 'vendor:publish --tag=php-script-editor-assets');
});

it('reports the missing file without debug and still does not use the CDN', function (): void {
    config(['app.debug' => false]);
    $reported = [];
    app(Illuminate\Contracts\Debug\ExceptionHandler::class)->reportable(function (MissingEditorAssetException $e) use (&$reported): bool {
        $reported[] = $e;

        return false;
    });

    expect(app(EditorAssets::class)->url())->toBe('http://localhost/vendor/php-script-editor/php-script-editor.js')
        ->and($reported)->toHaveCount(1);
});

it('uses the CDN only when opted in', function (): void {
    config(['php-script-editor.asset' => 'cdn']);

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
    config(['php-script-editor.asset' => 'cdn']);
    Vite::useCspNonce('abc"123');

    expect((string) app(EditorAssets::class)->scriptTag())->toContain(' nonce="abc&quot;123"');
});

it('publishes the config and the built editor directory', function (): void {
    $config = ServiceProvider::pathsToPublish(PhpScriptEditorServiceProvider::class, 'php-script-editor-config');
    $assets = ServiceProvider::pathsToPublish(PhpScriptEditorServiceProvider::class, 'php-script-editor-assets');

    expect(array_values($config))->toBe([config_path('php-script-editor.php')]);

    if (EditorAssets::hasDist()) {
        expect($assets)->toBe([EditorAssets::distDirectory() => public_path('vendor/php-script-editor')]);
    } else {
        expect($assets)->toBe([]);
    }
});

it('merges the package config', function (): void {
    expect(config('php-script-editor'))->toMatchArray(['asset' => 'published', 'theme' => 'auto', 'inject_script' => true]);
});
