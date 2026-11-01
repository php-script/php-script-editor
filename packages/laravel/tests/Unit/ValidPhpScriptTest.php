<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Validator;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\Rules\ValidPhpScript;

it('passes valid scripts', function (): void {
    $validator = Validator::make(
        ['content' => 'return strtoupper(order.customer.name);'],
        ['content' => ['required', new ValidPhpScript(testEngine())]],
    );

    expect($validator->passes())->toBeTrue();
});

it('fails with the first diagnostic message', function (): void {
    $rule = new ValidPhpScript(testEngine());
    $validator = Validator::make(['content' => "x = 1;\nunknown_fn(1);\nif ("], ['content' => [$rule]]);

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->get('content'))->toHaveCount(1)
        ->and($validator->errors()->first('content'))->toBe($rule->diagnostics()[0]['message'])
        ->and($rule->diagnostics())->not->toBeEmpty();
});

it('reports syntax errors', function (): void {
    $validator = Validator::make(['content' => 'if ('], ['content' => [new ValidPhpScript(testEngine())]]);

    expect($validator->errors()->first('content'))->toBe('Unexpected end of input.');
});

it('resolves the engine lazily from a closure', function (): void {
    $calls = 0;
    $rule = new ValidPhpScript(function () use (&$calls): Engine {
        $calls++;

        return testEngine();
    });

    expect($calls)->toBe(0)
        ->and(Validator::make(['content' => 'foo();'], ['content' => [$rule]])->fails())->toBeTrue()
        ->and($calls)->toBe(1);
});

it('leaves empty values to the required rule', function (): void {
    expect(Validator::make(['content' => ''], ['content' => [new ValidPhpScript(testEngine())]])->passes())->toBeTrue()
        ->and(Validator::make([], ['content' => ['required', new ValidPhpScript(testEngine())]])->errors()->first('content'))
        ->toBe('The content field is required.');
});

it('fails non-string values', function (): void {
    $validator = Validator::make(['content' => ['a']], ['content' => [new ValidPhpScript(testEngine())]]);

    expect($validator->errors()->first('content'))->toBe('The content field must be a string.');
});
