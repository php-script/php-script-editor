<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament;

use Closure;
use Filament\Forms\Components\Concerns\CanBeReadOnly;
use Filament\Forms\Components\Field;
use Illuminate\Support\HtmlString;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\Rules\ValidPhpScript;
use PhpScript\Editor\Laravel\Support\ElementAttributes;
use PhpScript\Editor\Laravel\Support\Html;
use UnexpectedValueException;

/**
 * Filament form field for php-script:
 *
 *     PhpScriptEditor::make('script')
 *         ->engine(fn () => app(Engine::class))
 *         ->height('24rem')
 *         ->validateScript()
 */
class PhpScriptEditor extends Field
{
    use CanBeReadOnly;

    protected string $view = 'php-script-editor-filament::php-script-editor';

    protected Engine|Closure|null $engine = null;

    /** @var EditorConfig|array<string, mixed>|Closure|null */
    protected EditorConfig|array|Closure|null $editorConfig = null;

    protected string|Closure|null $configUrl = null;

    protected string|Closure|null $lintUrl = null;

    protected int|Closure|null $lintDelay = null;

    /** @var string|array<string, mixed>|Closure|null */
    protected string|array|Closure|null $theme = null;

    protected string|int|Closure|null $height = null;

    /** @var array<string, mixed>|Closure */
    protected array|Closure $editorOptions = [];

    /** @var array<string, string>|Closure */
    protected array|Closure $labels = [];

    /**
     * Engine used for the language definition (highlighting, completions) and validateScript().
     */
    public function engine(Engine|Closure|null $engine): static
    {
        $this->engine = $engine;

        return $this;
    }

    /**
     * A ready-made config. Takes precedence over engine() for the editor config.
     *
     * @param  EditorConfig|array<string, mixed>|Closure|null  $config
     */
    public function editorConfig(EditorConfig|array|Closure|null $config): static
    {
        $this->editorConfig = $config;

        return $this;
    }

    /**
     * Load the config from a URL instead of inlining it into the page.
     */
    public function configUrl(string|Closure|null $url): static
    {
        $this->configUrl = $url;

        return $this;
    }

    public function lintUrl(string|Closure|null $url): static
    {
        $this->lintUrl = $url;

        return $this;
    }

    public function lintDelay(int|Closure|null $milliseconds): static
    {
        $this->lintDelay = $milliseconds;

        return $this;
    }

    /**
     * @param  string|array<string, mixed>|Closure|null  $theme  light|dark|auto or a theme object
     */
    public function theme(string|array|Closure|null $theme): static
    {
        $this->theme = $theme;

        return $this;
    }

    public function height(string|int|Closure|null $height): static
    {
        $this->height = $height;

        return $this;
    }

    /**
     * Monaco editor options, e.g. `['minimap' => ['enabled' => true]]`.
     *
     * @param  array<string, mixed>|Closure  $options
     */
    public function editorOptions(array|Closure $options): static
    {
        $this->editorOptions = $options;

        return $this;
    }

    /**
     * @param  array<string, string>|Closure  $labels
     */
    public function labels(array|Closure $labels): static
    {
        $this->labels = $labels;

        return $this;
    }

    /**
     * Validate the script with the engine's linter (first error fails the field).
     */
    public function validateScript(bool|Closure $condition = true): static
    {
        return $this->rule(
            fn (): ValidPhpScript => new ValidPhpScript(fn (): Engine => $this->getEngine() ?? throw new UnexpectedValueException(
                sprintf('PhpScriptEditor [%s] needs an engine() to validate scripts.', $this->getName()),
            )),
            $condition,
        );
    }

    public function getEngine(): ?Engine
    {
        $engine = $this->evaluate($this->engine);

        return $engine instanceof Engine ? $engine : null;
    }

    public function getEditorConfig(): ?EditorConfig
    {
        $config = $this->evaluate($this->editorConfig);

        if ($config instanceof EditorConfig || is_array($config) && $config !== []) {
            return EditorConfig::from($config);
        }

        if ($this->getConfigUrl() !== null) {
            return null;
        }

        $engine = $this->getEngine();

        return $engine instanceof Engine ? EditorConfig::fromEngine($engine) : null;
    }

    public function getConfigUrl(): ?string
    {
        return $this->evaluate($this->configUrl);
    }

    public function getLintUrl(): ?string
    {
        return $this->evaluate($this->lintUrl);
    }

    public function getLintDelay(): ?int
    {
        $delay = $this->evaluate($this->lintDelay) ?? config('php-script-editor.lint_delay');

        return is_numeric($delay) ? (int) $delay : null;
    }

    /**
     * @return string|array<string, mixed>|null
     */
    public function getTheme(): string|array|null
    {
        $theme = $this->evaluate($this->theme) ?? config('php-script-editor.theme', 'auto');

        return is_string($theme) || is_array($theme) ? $theme : null;
    }

    public function getHeight(): string|int|null
    {
        $height = $this->evaluate($this->height) ?? config('php-script-editor.height');

        return is_string($height) || is_int($height) ? $height : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function getEditorOptions(): array
    {
        return (array) $this->evaluate($this->editorOptions);
    }

    /**
     * @return array<string, string>
     */
    public function getLabels(): array
    {
        return (array) $this->evaluate($this->labels);
    }

    /**
     * The module published by php-script/editor-laravel. Not a Filament asset: `filament:assets`
     * copies single files, but the editor loads its Monaco chunks relative to the entry.
     */
    public function getScriptSrc(): string
    {
        return app(EditorAssets::class)->url();
    }

    /**
     * Attributes of the `<php-script-editor>` element. The value is bound by Alpine, not rendered.
     */
    public function getEditorAttributesHtml(): HtmlString
    {
        return Html::attributes([
            ...ElementAttributes::make(
                config: $this->getEditorConfig(),
                configUrl: $this->getConfigUrl(),
                lintUrl: $this->getLintUrl(),
                lintDelay: $this->getLintDelay(),
                theme: $this->getTheme(),
                readonly: $this->isDisabled() || $this->isReadOnly(),
                options: $this->getEditorOptions(),
                labels: $this->getLabels(),
                noToolbar: true,
                noSaveShortcut: true,
            ),
            'id' => $this->getId(),
            'style' => ElementAttributes::style($this->getHeight()),
        ]);
    }
}
