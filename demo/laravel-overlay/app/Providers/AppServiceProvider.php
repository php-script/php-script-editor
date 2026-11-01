<?php

declare(strict_types=1);

namespace App\Providers;

use App\Scripting\ScriptEngine;
use Illuminate\Support\ServiceProvider;
use PhpScript\Core\Engine;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // EditorConfig::fromEngine(), ValidPhpScript and the Filament field all resolve this.
        $this->app->bind(Engine::class, ScriptEngine::make(...));

        // Parallel e2e requests on one SQLite file.
        config([
            'database.connections.sqlite.busy_timeout' => 5000,
            'database.connections.sqlite.journal_mode' => 'wal',
        ]);
    }

    public function boot(): void
    {
        //
    }
}
