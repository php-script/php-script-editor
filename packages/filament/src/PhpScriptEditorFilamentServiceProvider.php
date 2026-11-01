<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament;

use Illuminate\Support\ServiceProvider;

final class PhpScriptEditorFilamentServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'php-script-editor-filament');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/php-script-editor-filament'),
            ], 'php-script-editor-filament-views');
        }
    }
}
