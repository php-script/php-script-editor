<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament;

use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use PhpScript\Editor\Laravel\EditorAssets;
use Throwable;

/**
 * Registers the editor module as a Filament asset.
 *
 * The asset is `loadedOnRequest()`: Filament does not add it to every panel page.
 * The field view imports it with a dynamic `import()` the first time an editor is shown.
 * `php artisan filament:assets` copies it to public/js/php-script/editor-filament/.
 *
 * The CDN is only used when configured explicitly (`php-script-editor.asset` = "cdn").
 *
 * @internal
 */
final class FilamentIntegration
{
    public const string PACKAGE = 'php-script/editor-filament';

    public const string ASSET_ID = 'php-script-editor';

    public static function register(): void
    {
        $path = self::assetPath();

        if ($path === null) {
            return; // no built module in php-script/editor-laravel: the field uses EditorAssets::url()
        }

        FilamentAsset::register([
            Js::make(self::ASSET_ID, $path)->module()->loadedOnRequest(),
        ], self::PACKAGE);
    }

    /**
     * `asset_url` or the opted-in CDN url (remote, skipped by filament:assets), otherwise the
     * module shipped in php-script/editor-laravel (resources/dist), null without one.
     */
    public static function assetPath(): ?string
    {
        $explicit = config('php-script-editor.asset_url');

        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        $assets = app(EditorAssets::class);

        if ($assets->usesCdn()) {
            return $assets->cdnUrl();
        }

        return EditorAssets::hasDist() ? EditorAssets::distPath() : null;
    }

    /**
     * Public URL of the module: the Filament asset when it is remote or was copied by
     * `php artisan filament:assets`, otherwise EditorAssets::url() (the file published with
     * `vendor:publish --tag=php-script-editor-assets`, or a MissingEditorAssetException).
     */
    public static function scriptSrc(): string
    {
        try {
            $js = collect(FilamentAsset::getScripts([self::PACKAGE]))
                ->first(fn (Js $asset): bool => $asset->getId() === self::ASSET_ID);
        } catch (Throwable) {
            $js = null;
        }

        if ($js instanceof Js && ($js->isRemote() || is_file($js->getPublicPath()))) {
            return $js->getSrc();
        }

        return app(EditorAssets::class)->url();
    }
}
