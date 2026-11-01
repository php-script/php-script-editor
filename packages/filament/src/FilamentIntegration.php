<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\Filament;

use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use PhpScript\Editor\Laravel\EditorAssets;
use Throwable;

/**
 * Registers the editor module as a Filament asset. Only called when Filament is installed.
 *
 * The asset is `loadedOnRequest()`: Filament does not add it to every panel page.
 * The field view imports it with a dynamic `import()` the first time an editor is shown.
 * Run `php artisan filament:assets` to copy it to public/js/php-script/editor-laravel/.
 *
 * @internal
 */
final class FilamentIntegration
{
    public const string ASSET_ID = 'php-script-editor';

    public static function register(): void
    {
        FilamentAsset::register([
            Js::make(self::ASSET_ID, self::assetPath())->module()->loadedOnRequest(),
        ], EditorAssets::PACKAGE);
    }

    /**
     * The local build when the package ships it, the configured CDN url otherwise
     * (Filament treats http(s) paths as remote and skips them in filament:assets).
     */
    public static function assetPath(): string
    {
        $explicit = config('php-script-editor.asset_url');

        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        if (config('php-script-editor.asset') !== 'cdn' && EditorAssets::hasDist()) {
            return EditorAssets::distPath();
        }

        return app(EditorAssets::class)->cdnUrl();
    }

    /**
     * Public URL of the module. Falls back to the CDN when the Filament asset
     * was registered locally but `php artisan filament:assets` has not copied it yet.
     */
    public static function scriptSrc(): string
    {
        try {
            $js = collect(FilamentAsset::getScripts([EditorAssets::PACKAGE]))
                ->first(fn (Js $asset): bool => $asset->getId() === self::ASSET_ID);
        } catch (Throwable) {
            $js = null;
        }

        if (! $js instanceof Js) {
            return app(EditorAssets::class)->url();
        }

        if ($js->isRemote() || is_file($js->getPublicPath())) {
            return $js->getSrc();
        }

        return app(EditorAssets::class)->url();
    }
}
