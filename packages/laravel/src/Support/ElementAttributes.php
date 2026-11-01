<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\Support;

use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorConfig;

/**
 * Builds the attribute map of a `<php-script-editor>` element. Shared by the
 * Blade component and the Filament field.
 *
 * @internal
 */
final class ElementAttributes
{
    /**
     * @param  EditorConfig|Engine|array<string, mixed>|null  $config
     * @param  string|array<string, mixed>|null  $theme  light|dark|auto or a theme object
     * @param  array<string, string>|null  $saveHeaders
     * @param  array<string, mixed>|null  $savePayload
     * @param  array<string, mixed>|null  $options  Monaco editor options
     * @param  array<string, string>|null  $labels
     * @return array<string, mixed>
     */
    public static function make(
        ?string $name = null,
        ?string $value = null,
        EditorConfig|Engine|array|null $config = null,
        ?string $configUrl = null,
        ?string $saveUrl = null,
        ?string $saveMethod = null,
        ?string $saveField = null,
        ?array $saveHeaders = null,
        ?array $savePayload = null,
        ?bool $persisted = null,
        ?string $csrfToken = null,
        ?string $lintUrl = null,
        ?int $lintDelay = null,
        string|array|null $theme = null,
        bool $readonly = false,
        ?array $options = null,
        ?array $labels = null,
        bool $noToolbar = false,
        bool $noSaveShortcut = false,
    ): array {
        return [
            'name' => self::filled($name),
            // The content goes into the `value` attribute (HTML-escaped). A child
            // <script type="text/php-script"> would end at the first `</script` in
            // the content, so it is not used.
            'value' => $value,
            'config' => $config === null || $config === [] ? null : EditorConfig::from($config)->toJson(),
            'config-url' => self::filled($configUrl),
            'save-url' => self::filled($saveUrl),
            'save-method' => self::filled($saveMethod) !== null ? strtoupper((string) $saveMethod) : null,
            'save-field' => self::filled($saveField),
            'save-headers' => $saveHeaders ?: null,
            'save-payload' => $savePayload ?: null,
            'persisted' => $persisted,
            'csrf-token' => self::filled($csrfToken),
            'lint-url' => self::filled($lintUrl),
            'lint-delay' => $lintDelay,
            'theme' => is_array($theme) ? ($theme === [] ? null : $theme) : self::filled($theme),
            'readonly' => $readonly,
            'options' => $options ?: null,
            'labels' => $labels ?: null,
            'no-toolbar' => $noToolbar,
            'no-save-shortcut' => $noSaveShortcut,
        ];
    }

    /**
     * Style declaration for the height custom property, merged with an existing style.
     */
    public static function style(string|int|null $height, ?string $style = null): ?string
    {
        $height = Html::cssLength($height);
        $style = $style !== null ? trim($style) : '';

        if ($height === null) {
            return $style !== '' ? $style : null;
        }

        $declaration = '--php-script-editor-height: '.$height;

        return $style !== '' ? rtrim($style, '; ').'; '.$declaration : $declaration;
    }

    private static function filled(?string $value): ?string
    {
        return $value === null || trim($value) === '' ? null : $value;
    }
}
