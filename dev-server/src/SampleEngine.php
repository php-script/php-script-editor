<?php

declare(strict_types=1);

namespace DevServer;

use PhpScript\Core\Engine;

final class Address
{
    public function __construct(
        public string $city = 'Berlin',
        public string $zip = '10115',
    ) {}
}

final class User
{
    public Address $address;

    public function __construct(
        public string $name = 'Ada',
        public int $age = 36,
    ) {
        $this->address = new Address;
    }

    /** Full greeting for the user. */
    public function greet(string $greeting = 'Hello'): string
    {
        return $greeting . ', ' . $this->name . '!';
    }

    public function isAdult(): bool
    {
        return $this->age >= 18;
    }

    public function address(): Address
    {
        return $this->address;
    }
}

final class SampleEngine
{
    public static function make(): Engine
    {
        return (new Engine)
            ->allow('strtoupper', 'strtolower', 'count', 'round', 'implode', 'str_contains')
            ->set('user', new User, 'The signed-in user')
            ->set('items', [3, 5, 8], 'A list of numbers')
            ->set('taxRate', 0.19, 'VAT rate')
            ->setExecutionTimeLimit(2)
            ->setOperationLimit(100_000);
    }

    /** @return array{definition: array<string, mixed>, completions: array<string, mixed>} */
    public static function config(): array
    {
        $service = self::make()->monarchLanguageDefinition();

        return [
            'definition' => $service->getDefinition(),
            'completions' => $service->getCompletionItems(),
        ];
    }
}
