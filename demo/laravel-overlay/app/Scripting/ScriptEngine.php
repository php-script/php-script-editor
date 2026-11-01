<?php

declare(strict_types=1);

namespace App\Scripting;

use PhpScript\Core\Engine;

/**
 * The php-script engine of this app: allowed functions and the context scripts see.
 * Bound in AppServiceProvider, so Filament, the Blade page and validation share it.
 */
final class ScriptEngine
{
    public static function make(): Engine
    {
        return new Engine()
            ->allow('strtoupper', 'strtolower', 'count', 'round', 'implode', 'str_contains')
            ->set('user', new Customer, 'The signed-in user')
            ->set('items', [3, 5, 8], 'A list of numbers')
            ->set('taxRate', 0.19, 'VAT rate')
            ->setExecutionTimeLimit(2)
            ->setOperationLimit(100_000);
    }
}
