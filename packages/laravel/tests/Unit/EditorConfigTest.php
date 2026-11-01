<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\Tests\Fixtures\Customer;
use PhpScript\Editor\Laravel\Tests\Fixtures\Order;

it('wraps the monarch definition and completions of an engine', function (): void {
    $engine = testEngine();
    $service = $engine->monarchLanguageDefinition();

    $config = EditorConfig::fromEngine($engine);

    expect($config->toArray())->toBe([
        'definition' => $service->getDefinition(),
        'completions' => $service->getCompletionItems(),
    ]);
});

it('contains allowed functions, context variables and reflected classes', function (): void {
    $config = EditorConfig::fromEngine(testEngine())->toArray();

    expect($config['definition']['allowedFunctions'])->toBe(['strtoupper'])
        ->and($config['definition']['contextVariables'])->toBe(['order'])
        ->and($config['definition']['tokenizer'])->toHaveKey('root')
        ->and(array_column($config['completions']['globalFunctions'], 'label'))->toBe(['strtoupper'])
        ->and($config['completions']['globalVariables'][0])->toMatchArray([
            'label' => 'order',
            'kind' => 'Variable',
            'detail' => Order::class,
            'doc' => 'The current order',
        ])
        ->and($config['completions']['classes'])->toHaveKeys([Order::class, Customer::class])
        ->and(array_column($config['completions']['classes'][Order::class]['methods'], 'label'))->toContain('discount')
        ->and(array_column($config['completions']['classes'][Order::class]['properties'], 'label'))->toContain('total', 'customer');
});

it('serializes to the JSON shape the element expects', function (): void {
    $json = EditorConfig::fromEngine(testEngine())->toJson();
    $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);

    expect($decoded)->toHaveKeys(['definition', 'completions'])
        ->and($decoded['definition']['keywords'])->toContain('foreach')
        ->and($json)->toContain('"PhpScript\\\\Editor\\\\Laravel\\\\Tests\\\\Fixtures\\\\Order"');
});

it('encodes an empty classes map as a JSON object', function (): void {
    $json = EditorConfig::fromEngine(new Engine)->toJson();

    expect($json)->toContain('"classes":{}');
});

it('is a JSON response when returned from a controller', function (): void {
    $response = EditorConfig::fromEngine(testEngine())->toResponse(Request::create('/'));

    expect($response->getStatusCode())->toBe(200)
        ->and($response->headers->get('Content-Type'))->toBe('application/json')
        ->and($response->getData(true))->toHaveKeys(['definition', 'completions']);
});

it('converts engines, arrays and configs with from()', function (): void {
    $config = EditorConfig::fromEngine(testEngine());

    expect(EditorConfig::from($config))->toBe($config)
        ->and(EditorConfig::from(testEngine())->toArray())->toBe($config->toArray())
        ->and(EditorConfig::from($config->toArray())->toArray())->toBe($config->toArray());
});

it('rejects arrays without a definition', function (): void {
    EditorConfig::fromArray(['completions' => []]);
})->throws(InvalidArgumentException::class);

it('lints scripts with the engine', function (): void {
    expect(EditorConfig::lint(testEngine(), 'x = strtoupper(order.customer.name);'))->toBe([]);

    $diagnostics = EditorConfig::lint(testEngine(), "x = 1;\nfoo(1);");

    expect($diagnostics)->toHaveCount(1)
        ->and($diagnostics[0])->toMatchArray(['rule' => 'compile', 'line' => 2, 'column' => 1, 'severity' => 'error'])
        ->and($diagnostics[0]['message'])->toContain('foo');
});
