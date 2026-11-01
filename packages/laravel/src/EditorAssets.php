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
     * The built module shipped inside this package (created by `composer build-asset`).
     */
    public static function distPath(): string
    {
        return dirname(__DIR__).'/resources/dist/php-script-editor.js';
    }

    public static function hasDist(): bool
    {
        return is_file(self::distPath());
    }

    public function url(): string
    {
        $explicit = $this->config->get('php-script-editor.asset_url');

        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        $mode = $this->config->get('php-script-editor.asset', 'auto');

        if ($mode === 'cdn') {
            return $this->cdnUrl();
        }

        $published = $this->publishedPath();
        $file = public_path($published);

        if ($mode === 'published' || is_file($file)) {
            $version = is_file($file) ? '?v='.substr(md5((string) filemtime($file).filesize($file)), 0, 8) : '';

            return asset($published).$version;
        }

        return $this->cdnUrl();
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
