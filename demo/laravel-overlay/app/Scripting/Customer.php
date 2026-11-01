<?php

declare(strict_types=1);

namespace App\Scripting;

/**
 * The `user` variable scripts can read. Public properties and methods show up as completions.
 */
final class Customer
{
    public Address $address;

    public function __construct(
        public string $name = 'Ada',
        public int $age = 36,
        public bool $vip = true,
    ) {
        $this->address = new Address;
    }

    /** Full greeting for the user. */
    public function greet(string $greeting = 'Hello'): string
    {
        return $greeting.', '.$this->name.'!';
    }

    public function isAdult(): bool
    {
        return $this->age >= 18;
    }
}
