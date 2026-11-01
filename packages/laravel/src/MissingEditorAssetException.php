<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel;

use RuntimeException;

/**
 * The `<php-script-editor>` module is not published to public/ (and the CDN is not opted in).
 */
final class MissingEditorAssetException extends RuntimeException
{
    public static function forPath(string $path): self
    {
        return new self(sprintf(
            'The php-script editor module is missing at [%s]. Publish it with '
            .'`php artisan vendor:publish --tag=php-script-editor-assets --force` (also part of the '
            .'`laravel-assets` tag), or opt in to the CDN with PHP_SCRIPT_EDITOR_ASSET=cdn.%s',
            $path,
            EditorAssets::hasDist() ? '' : ' The package has no built module (resources/dist): run `composer build-asset` in the monorepo.',
        ));
    }
}
