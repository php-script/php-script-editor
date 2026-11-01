<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use PhpScript\Editor\Laravel\View\Components\PhpScriptEditor;

final class PhpScriptEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/php-script-editor.php', 'php-script-editor');

        $this->app->scoped(EditorAssets::class);
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'php-script-editor');

        Blade::component('php-script-editor', PhpScriptEditor::class);

        Blade::directive('phpScriptEditorScripts', static fn (): string => '<?php echo app('.EditorAssets::class.'::class)->scriptTagOnce(); ?>');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/php-script-editor.php' => config_path('php-script-editor.php'),
            ], 'php-script-editor-config');

            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/php-script-editor'),
            ], 'php-script-editor-views');

            // Only offered when the built editor is present (see README "Development"). The whole
            // directory is published, because the entry loads its Monaco chunks relative to itself.
            if (EditorAssets::hasDist()) {
                $this->publishes([
                    EditorAssets::distDirectory() => public_path($this->app->make(EditorAssets::class)->publishedDirectory()),
                ], ['php-script-editor-assets', 'laravel-assets']);
            }
        }
    }
}
