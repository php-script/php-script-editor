<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use PhpScript\Editor\Laravel\PhpScriptEditorServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [PhpScriptEditorServiceProvider::class];
    }
}
