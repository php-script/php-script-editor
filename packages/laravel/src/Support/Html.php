<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\Support;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Support\HtmlString;
use InvalidArgumentException;
use JsonSerializable;

/**
 * Safe attribute rendering for `<php-script-editor>`.
 *
 * Laravel's ComponentAttributeBag trims values and does not HTML-escape
 * attributes passed with `:attr="..."`, so the editor attributes are rendered here.
 *
 * @internal
 */
final class Html
{
    /**
     * Renders ` key="value"` pairs. null/false are skipped, true renders a bare
     * attribute, arrays and JSON-serializable objects are JSON encoded. Every value
     * goes through htmlspecialchars (ENT_QUOTES), so it cannot leave the attribute.
     * Values are not trimmed: script content keeps its whitespace.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function attributes(array $attributes): HtmlString
    {
        $html = '';

        foreach ($attributes as $name => $value) {
            if ($value === null || $value === false) {
                continue;
            }

            if (! preg_match('/^[a-zA-Z_:@][a-zA-Z0-9_:.@-]*$/', $name)) {
                throw new InvalidArgumentException(sprintf('Invalid attribute name [%s].', $name));
            }

            if ($value === true) {
                $html .= ' '.$name;

                continue;
            }

            $html .= ' '.$name.'="'.self::escape(self::stringify($value)).'"';
        }

        return new HtmlString($html);
    }

    public static function json(mixed $value): string
    {
        if ($value instanceof Arrayable && ! $value instanceof JsonSerializable) {
            $value = $value->toArray();
        }

        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public static function escape(string $value): string
    {
        // Encode CR so the HTML parser's newline normalisation does not change the script.
        return str_replace("\r", '&#13;', htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8'));
    }

    /**
     * Validates a CSS length for `--php-script-editor-height`. Integers are pixels.
     */
    public static function cssLength(string|int|null $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            return $value.'px';
        }

        $value = trim($value);

        if (! preg_match('/^[a-zA-Z0-9.%()+*\/,\s-]+$/', $value)) {
            throw new InvalidArgumentException(sprintf('Invalid CSS length [%s] for the editor height.', $value));
        }

        return $value;
    }

    private static function stringify(mixed $value): string
    {
        return match (true) {
            is_string($value) => $value,
            is_int($value), is_float($value) => (string) $value,
            $value instanceof \Stringable => (string) $value,
            default => self::json($value),
        };
    }
}
