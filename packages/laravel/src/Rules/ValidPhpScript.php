<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\LintResponse;

/**
 * Fails with the first lint error of the script:
 *
 *     $request->validate(['content' => ['required', 'string', new ValidPhpScript($engine)]]);
 *
 * Warnings do not fail validation. Non-string values fail with the `string` message.
 */
final class ValidPhpScript implements ValidationRule
{
    /** @var list<array<string, mixed>> */
    private array $diagnostics = [];

    /**
     * @param  Engine|Closure(): Engine  $engine  a closure is resolved lazily, once per validation
     */
    public function __construct(private readonly Engine|Closure $engine) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $this->diagnostics = [];

        if ($value === null || $value === '') {
            return; // leave emptiness to `required`
        }

        if (! is_string($value)) {
            $fail('validation.string')->translate();

            return;
        }

        $this->diagnostics = EditorConfig::lint($this->resolveEngine(), $value);

        $errors = new LintResponse($this->diagnostics)->errors();

        if ($errors !== []) {
            $fail($errors[0]);
        }
    }

    /**
     * Diagnostics of the last validated value, e.g. to add them to a 422 response.
     *
     * @return list<array<string, mixed>>
     */
    public function diagnostics(): array
    {
        return $this->diagnostics;
    }

    private function resolveEngine(): Engine
    {
        if ($this->engine instanceof Engine) {
            return $this->engine;
        }

        $engine = app()->call($this->engine);

        if (! $engine instanceof Engine) {
            throw new \UnexpectedValueException('The ValidPhpScript closure must return a '.Engine::class.'.');
        }

        return $engine;
    }
}
