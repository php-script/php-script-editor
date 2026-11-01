<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use JsonSerializable;
use PhpScript\Core\Engine;
use PhpScript\Linter\LintDiagnostic;
use stdClass;

/**
 * The JSON the `<php-script-editor>` element is configured with:
 * `{definition, completions}` from php-script's MonarchLanguageDefinitionService.
 *
 * Return it from a controller to serve a `config-url` endpoint:
 *
 *     return EditorConfig::fromEngine($engine);
 *
 * @implements Arrayable<string, array<string, mixed>>
 */
final readonly class EditorConfig implements Arrayable, Jsonable, JsonSerializable, Responsable
{
    /**
     * @param  array<string, mixed>  $definition  output of getDefinition()
     * @param  array<string, mixed>  $completions  output of getCompletionItems()
     */
    public function __construct(
        public array $definition,
        public array $completions,
    ) {}

    public static function fromEngine(Engine $engine): self
    {
        $service = $engine->monarchLanguageDefinition();

        return new self($service->getDefinition(), $service->getCompletionItems());
    }

    /**
     * Accepts an EditorConfig, an Engine or a `{definition, completions}` array.
     */
    public static function from(self|Engine|array $config): self
    {
        return match (true) {
            $config instanceof self => $config,
            $config instanceof Engine => self::fromEngine($config),
            default => self::fromArray($config),
        };
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public static function fromArray(array $config): self
    {
        $definition = $config['definition'] ?? null;
        $completions = $config['completions'] ?? [];

        if (! is_array($definition) || ! is_array($completions)) {
            throw new InvalidArgumentException('An editor config needs a "definition" array and an optional "completions" array.');
        }

        /** @var array<string, mixed> $definition */
        /** @var array<string, mixed> $completions */
        return new self($definition, $completions);
    }

    /**
     * Lints a script with the engine's allowed functions.
     *
     * @return list<array{rule: string, message: string, line: int, column: int, offset: int, length: int, severity: string}>
     */
    public static function lint(Engine $engine, string $code): array
    {
        return array_values(array_map(
            static fn (LintDiagnostic $diagnostic): array => $diagnostic->toArray(),
            $engine->linter($code)->diagnostics(),
        ));
    }

    /**
     * @return array{definition: array<string, mixed>, completions: array<string, mixed>}
     */
    public function toArray(): array
    {
        return [
            'definition' => $this->definition,
            'completions' => $this->completions,
        ];
    }

    /**
     * Same as toArray(), but an empty `classes` map stays a JSON object (`{}`).
     *
     * @return array{definition: array<string, mixed>, completions: array<string, mixed>}
     */
    public function jsonSerialize(): array
    {
        $completions = $this->completions;

        if (array_key_exists('classes', $completions) && $completions['classes'] === []) {
            $completions['classes'] = new stdClass;
        }

        return [
            'definition' => $this->definition,
            'completions' => $completions,
        ];
    }

    /**
     * @param  int  $options
     */
    public function toJson($options = 0): string
    {
        return json_encode($this, $options | JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public function toResponse($request): JsonResponse
    {
        return new JsonResponse($this, 200, [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
