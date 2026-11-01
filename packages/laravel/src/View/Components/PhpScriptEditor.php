<?php

declare(strict_types=1);

namespace PhpScript\Editor\Laravel\View\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\HtmlString;
use Illuminate\View\Component;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\Support\ElementAttributes;
use PhpScript\Editor\Laravel\Support\Html;

/**
 * `<x-php-script-editor name="script" :value="$script->content" :config="$engine" />`
 */
final class PhpScriptEditor extends Component
{
    /**
     * @param  EditorConfig|Engine|array<string, mixed>|null  $config  an Engine is converted with EditorConfig::fromEngine()
     * @param  string|array<string, mixed>|null  $theme  light|dark|auto or a theme object; defaults to config('php-script-editor.theme')
     * @param  string|int|null  $height  CSS length (int = px); defaults to config('php-script-editor.height')
     * @param  array<string, string>|null  $saveHeaders
     * @param  array<string, mixed>|null  $savePayload
     * @param  array<string, mixed>|null  $options  Monaco editor options
     * @param  array<string, string>|null  $labels
     * @param  bool|null  $script  render the module script tag (once per request); defaults to config('php-script-editor.inject_script')
     */
    public function __construct(
        public ?string $name = null,
        public ?string $value = null,
        public EditorConfig|Engine|array|null $config = null,
        public ?string $configUrl = null,
        public ?string $saveUrl = null,
        public ?string $saveMethod = null,
        public ?string $saveField = null,
        public ?array $saveHeaders = null,
        public ?array $savePayload = null,
        public ?bool $persisted = null,
        public ?string $csrfToken = null,
        public ?string $lintUrl = null,
        public ?int $lintDelay = null,
        public string|array|null $theme = null,
        public bool $readonly = false,
        public string|int|null $height = null,
        public ?array $options = null,
        public ?array $labels = null,
        public bool $noToolbar = false,
        public bool $noSaveShortcut = false,
        public ?bool $script = null,
    ) {}

    public function render(): View
    {
        return view('php-script-editor::components.php-script-editor');
    }

    public function editorAttributes(?string $style = null): HtmlString
    {
        $lintDelay = $this->lintDelay ?? config('php-script-editor.lint_delay');
        $height = $this->height ?? config('php-script-editor.height');

        return Html::attributes([
            ...ElementAttributes::make(
                name: $this->name,
                value: $this->value,
                config: $this->config,
                configUrl: $this->configUrl,
                saveUrl: $this->saveUrl,
                saveMethod: $this->saveMethod,
                saveField: $this->saveField,
                saveHeaders: $this->saveHeaders,
                savePayload: $this->savePayload,
                persisted: $this->persisted,
                csrfToken: $this->csrfToken,
                lintUrl: $this->lintUrl,
                lintDelay: is_numeric($lintDelay) ? (int) $lintDelay : null,
                theme: $this->theme ?? config('php-script-editor.theme'),
                readonly: $this->readonly,
                options: $this->options,
                labels: $this->labels,
                noToolbar: $this->noToolbar,
                noSaveShortcut: $this->noSaveShortcut,
            ),
            'style' => ElementAttributes::style(is_string($height) || is_int($height) ? $height : null, $style),
        ]);
    }

    public function scriptTag(): HtmlString
    {
        $inject = $this->script ?? (bool) config('php-script-editor.inject_script', true);

        return $inject ? app(EditorAssets::class)->scriptTagOnce() : new HtmlString('');
    }
}
