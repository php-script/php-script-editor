<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament\Tests\Fixtures;

final class Customer
{
    public string $name = 'Ada';

    public function isVip(): bool
    {
        return true;
    }
}
