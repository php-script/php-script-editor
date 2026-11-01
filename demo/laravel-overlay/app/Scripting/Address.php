<?php

declare(strict_types=1);

namespace App\Scripting;

final class Address
{
    public function __construct(
        public string $city = 'Berlin',
        public string $zip = '10115',
    ) {}
}
