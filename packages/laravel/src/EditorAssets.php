<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\HtmlString;

/**
 * Resolves the URL of the `<php-script-editor>` ES module and renders its script tag.
 *
 * Bound as a scoped singleton, so "once" means once per request (also under Octane).
 */
final class EditorAssets
{
    public const string PACKAGE = 'php-script/editor-laravel';

    public const string DEFAULT_CDN_URL = 'https://cdn.jsdelivr.net/npm/@php-script/editor@2/dist/standalone/php-script-editor.js';

    private bool $rendered = false;

    public function __construct(private readonly Repository $config) {}

    /**
     * The built editor shipped inside this package (created by `composer build-asset`): the entry
     * module plus the hashed Monaco and worker chunks it loads on demand.
     */
    public static function distDirectory(): string
    {
        return dirname(__DIR__).'/resources/dist';
    }

    /**
     * The entry module inside distDirectory().
     */
    public static function distPath(): string
    {
        return self::distDirectory().'/php-script-editor.js';
    }

    public static function hasDist(): bool
    {
        return is_file(self::distPath());
    }

    /**
     * URL of the module: `asset_url` if set, the CDN only with `asset` = "cdn",
     * otherwise the published file (there is no automatic CDN fallback).
     *
     * @throws MissingEditorAssetException when the file is not published and `app.debug` is on
     *                                     (without debug the error is reported and the URL returned)
     */
    public function url(): string
    {
        $explicit = $this->config->get('php-script-editor.asset_url');

        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        if ($this->usesCdn()) {
            return $this->cdnUrl();
        }

        $published = $this->publishedPath();
        $file = public_path($published);

        if (! is_file($file)) {
            $exception = MissingEditorAssetException::forPath($file);

            if ($this->config->get('app.debug')) {
                throw $exception;
            }

            report($exception);

            return asset($published);
        }

        return asset($published).'?v='.substr(md5((string) filemtime($file).filesize($file)), 0, 8);
    }

    /**
     * Only when configured explicitly: `'asset' => 'cdn'` (PHP_SCRIPT_EDITOR_ASSET=cdn).
     */
    public function usesCdn(): bool
    {
        return $this->config->get('php-script-editor.asset') === 'cdn';
    }

    public function cdnUrl(): string
    {
        $url = $this->config->get('php-script-editor.cdn_url');

        return is_string($url) && $url !== '' ? $url : self::DEFAULT_CDN_URL;
    }

    public function publishedPath(): string
    {
        $path = $this->config->get('php-script-editor.published_path');

        return is_string($path) && $path !== '' ? ltrim($path, '/') : 'vendor/php-script-editor/php-script-editor.js';
    }

    /**
     * Public directory that receives distDirectory(): the entry and its chunks stay side by side.
     */
    public function publishedDirectory(): string
    {
        return dirname($this->publishedPath());
    }

    public function scriptTag(): HtmlString
    {
        $nonce = Vite::cspNonce();

        return new HtmlString(sprintf(
            '<script type="module" src="%s"%s data-php-script-editor></script>',
            e($this->url()),
            $nonce ? ' nonce="'.e($nonce).'"' : '',
        ));
    }

    /**
     * The script tag the first time it is called in a request, an empty string afterwards.
     */
    public function scriptTagOnce(): HtmlString
    {
        if ($this->rendered) {
            return new HtmlString('');
        }

        $this->rendered = true;

        return $this->scriptTag();
    }

    public function markRendered(bool $rendered = true): void
    {
        $this->rendered = $rendered;
    }

    public function wasRendered(): bool
    {
        return $this->rendered;
    }
}
