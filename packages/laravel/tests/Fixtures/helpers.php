<?php

declare(strict_types=1);

use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\Tests\Fixtures\Order;

function testEngine(): Engine
{
    return new Engine()
        ->allow('strtoupper')
        ->set('order', new Order, 'The current order');
}
