<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use PhpScript\Core\Engine;

/**
 * Response for a `lint-url` endpoint, and the 422 body for store/update endpoints.
 *
 * Valid script:   200 `{"diagnostics": []}`
 * Invalid script: 422 `{"message": "...", "errors": {"content": ["..."]}, "diagnostics": [...]}`
 *
 * The element reads `errors[field][0]` as status text and turns `diagnostics` into markers.
 */
final readonly class LintResponse implements Responsable
{
    /**
     * @param  list<array<string, mixed>>  $diagnostics
     */
    public function __construct(
        public array $diagnostics,
        public string $field = 'content',
    ) {}

    public static function fromEngine(Engine $engine, string $code, string $field = 'content'): self
    {
        return new self(EditorConfig::lint($engine, $code), $field);
    }

    /**
     * Throws a 422 response when the script has errors. Use in store/update actions:
     *
     *     LintResponse::abortIfInvalid($engine, $request->string('content'));
     *
     * @throws HttpResponseException
     */
    public static function abortIfInvalid(Engine $engine, string $code, string $field = 'content'): void
    {
        $response = self::fromEngine($engine, $code, $field);

        if (! $response->isValid()) {
            throw new HttpResponseException($response->toResponse(request()));
        }
    }

    /**
     * Only errors make a script invalid, warnings do not.
     */
    public function isValid(): bool
    {
        return $this->errors() === [];
    }

    /**
     * @return list<string> messages of the diagnostics with severity "error"
     */
    public function errors(): array
    {
        $errors = [];

        foreach ($this->diagnostics as $diagnostic) {
            if (($diagnostic['severity'] ?? 'error') !== 'error') {
                continue;
            }

            $errors[] = is_string($diagnostic['message'] ?? null) ? $diagnostic['message'] : 'Invalid script.';
        }

        return $errors;
    }

    /**
     * @return array{diagnostics: list<array<string, mixed>>}|array{message: string, errors: array<string, list<string>>, diagnostics: list<array<string, mixed>>}
     */
    public function toArray(): array
    {
        if ($this->isValid()) {
            return ['diagnostics' => $this->diagnostics];
        }

        $errors = $this->errors();
        $count = count($errors);

        return [
            'message' => $count > 1 ? sprintf('%s (and %d more %s)', $errors[0], $count - 1, $count === 2 ? 'error' : 'errors') : $errors[0],
            'errors' => [$this->field => $errors],
            'diagnostics' => $this->diagnostics,
        ];
    }

    public function toResponse($request): JsonResponse
    {
        return new JsonResponse($this->toArray(), $this->isValid() ? 200 : 422);
    }
}
