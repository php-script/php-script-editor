<?php

declare(strict_types=1);

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use PhpScript\Editor\Laravel\LintResponse;

it('returns 200 with empty diagnostics for valid scripts', function (): void {
    $response = LintResponse::fromEngine(testEngine(), 'return 1;')->toResponse(Request::create('/'));

    expect($response->getStatusCode())->toBe(200)
        ->and($response->getData(true))->toBe(['diagnostics' => []]);
});

it('returns a Laravel style 422 body with diagnostics', function (): void {
    $response = LintResponse::fromEngine(testEngine(), "foo();\nbar();", 'script')->toResponse(Request::create('/'));
    $data = $response->getData(true);

    expect($response->getStatusCode())->toBe(422)
        ->and($data)->toHaveKeys(['message', 'errors', 'diagnostics'])
        ->and($data['errors'])->toHaveKey('script')
        ->and($data['errors']['script'][0])->toBe($data['diagnostics'][0]['message'])
        ->and($data['diagnostics'][0])->toHaveKeys(['rule', 'message', 'line', 'column', 'offset', 'length', 'severity']);
});

it('does not fail on warnings', function (): void {
    $response = new LintResponse([
        ['rule' => 'x', 'message' => 'Careful', 'line' => 1, 'column' => 1, 'offset' => 0, 'length' => 1, 'severity' => 'warning'],
    ]);

    expect($response->isValid())->toBeTrue()
        ->and($response->toArray()['diagnostics'])->toHaveCount(1);
});

it('summarises several errors in the message', function (): void {
    $error = ['message' => 'First', 'line' => 1, 'column' => 1];
    $data = new LintResponse([$error, ['message' => 'Second', 'line' => 2, 'column' => 1]])->toArray();

    expect($data['message'])->toBe('First (and 1 more error)')
        ->and($data['errors']['content'])->toBe(['First', 'Second']);
});

it('throws a 422 response for invalid scripts', function (): void {
    try {
        LintResponse::abortIfInvalid(testEngine(), 'foo();');
        $this->fail('No exception thrown.');
    } catch (HttpResponseException $exception) {
        expect($exception->getResponse()->getStatusCode())->toBe(422);
    }

    LintResponse::abortIfInvalid(testEngine(), 'return 1;');
});
