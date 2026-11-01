<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use PhpScript\Editor\Filament\PhpScriptEditor;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\MissingEditorAssetException;

afterEach(function (): void {
    File::deleteDirectory(public_path('vendor/php-script-editor'));
});

it('fails loudly when the editor has not been published (debug)', function (): void {
    config(['app.debug' => true]);

    expect(fn () => PhpScriptEditor::make('script')->getScriptSrc())->toThrow(MissingEditorAssetException::class);
});

it('uses the editor published with vendor:publish', function (): void {
    File::ensureDirectoryExists(public_path('vendor/php-script-editor'));
    File::put(public_path('vendor/php-script-editor/php-script-editor.js'), 'export {}');

    expect(PhpScriptEditor::make('script')->getScriptSrc())
        ->toStartWith('http://localhost/vendor/php-script-editor/php-script-editor.js?v=');
});

it('uses the CDN only when it is opted in', function (): void {
    config(['php-script-editor.asset' => 'cdn']);
    expect(PhpScriptEditor::make('script')->getScriptSrc())->toBe(EditorAssets::DEFAULT_CDN_URL);

    config(['php-script-editor.asset_url' => '/build/editor.js']);
    expect(PhpScriptEditor::make('script')->getScriptSrc())->toContain('/build/editor.js');
});
