<?php

declare(strict_types=1);

use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\Facades\File;
use PhpScript\Editor\Filament\FilamentIntegration;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\MissingEditorAssetException;

afterEach(function (): void {
    File::deleteDirectory(public_path('vendor/php-script-editor'));
    File::deleteDirectory(public_path('js/php-script'));
});

it('registers the module as a lazily loaded Filament asset', function (): void {
    if (! EditorAssets::hasDist()) {
        expect(FilamentAsset::getScripts([FilamentIntegration::PACKAGE]))->toBeEmpty();

        return;
    }

    $script = collect(FilamentAsset::getScripts([FilamentIntegration::PACKAGE]))->firstOrFail();

    expect($script->getId())->toBe(FilamentIntegration::ASSET_ID)
        ->and($script->isModule())->toBeTrue()
        ->and($script->isLoadedOnRequest())->toBeTrue()
        ->and($script->getPath())->toBe(EditorAssets::distPath());
});

it('uses the CDN only when it is opted in', function (): void {
    expect(FilamentIntegration::assetPath())->toBe(EditorAssets::hasDist() ? EditorAssets::distPath() : null);

    config(['php-script-editor.asset' => 'cdn']);
    expect(FilamentIntegration::assetPath())->toBe(EditorAssets::DEFAULT_CDN_URL);

    config(['php-script-editor.asset_url' => '/build/editor.js']);
    expect(FilamentIntegration::assetPath())->toBe('/build/editor.js');
});

it('fails loudly when neither filament:assets nor vendor:publish has run (debug)', function (): void {
    config(['app.debug' => true]);

    expect(fn () => FilamentIntegration::scriptSrc())->toThrow(MissingEditorAssetException::class);
});

it('falls back to the file published with vendor:publish', function (): void {
    File::ensureDirectoryExists(public_path('vendor/php-script-editor'));
    File::put(public_path('vendor/php-script-editor/php-script-editor.js'), 'export {}');

    expect(FilamentIntegration::scriptSrc())->toStartWith('http://localhost/vendor/php-script-editor/php-script-editor.js?v=');
});

it('prefers the module copied by filament:assets', function (): void {
    if (! EditorAssets::hasDist()) {
        $this->markTestSkipped('No built module in php-script/editor-laravel (composer build-asset).');
    }

    $script = collect(FilamentAsset::getScripts([FilamentIntegration::PACKAGE]))->firstOrFail();
    File::ensureDirectoryExists(dirname($script->getPublicPath()));
    File::put($script->getPublicPath(), 'export {}');

    expect(FilamentIntegration::scriptSrc())->toStartWith(asset('js/php-script/editor-filament/php-script-editor.js'));
});
