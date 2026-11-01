<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament\Tests\Fixtures;

final class Order
{
    /** Order total in cents */
    public int $total = 1250;

    public function __construct(public Customer $customer = new Customer) {}

    /** Applies a discount */
    public function discount(int $percent): int
    {
        return intdiv($this->total * (100 - $percent), 100);
    }
}
