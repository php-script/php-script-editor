<?php

declare(strict_types=1);

use Livewire\Livewire;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Filament\PhpScriptEditor;
use PhpScript\Editor\Filament\Tests\Fixtures\ScriptForm;

afterEach(function (): void {
    ScriptForm::$configure = null;
});

it('can be instantiated with fluent configuration', function (): void {
    $field = PhpScriptEditor::make('script')
        ->engine(fn () => testEngine())
        ->height('24rem')
        ->theme('dark')
        ->lintUrl('/lint')
        ->editorOptions(['minimap' => ['enabled' => true]]);

    expect($field->getName())->toBe('script')
        ->and($field->getHeight())->toBe('24rem')
        ->and($field->getTheme())->toBe('dark')
        ->and($field->getLintUrl())->toBe('/lint')
        ->and($field->getEditorOptions())->toBe(['minimap' => ['enabled' => true]])
        ->and($field->getEditorConfig()?->toArray())->toBe(EditorConfig::fromEngine(testEngine())->toArray());
});

it('does not inline a config when a config url is set', function (): void {
    $field = PhpScriptEditor::make('script')->engine(testEngine())->configUrl('/config');

    expect($field->getEditorConfig())->toBeNull();
});

it('renders the editor bound to the Livewire state', function (): void {
    config(['php-script-editor.asset' => 'cdn']);
    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->height('24rem')->lintUrl('/lint');

    $html = Livewire::test(ScriptForm::class)->html();

    expect($html)->toContain('<php-script-editor x-ref="editor"')
        ->and($html)->toContain('wire:ignore')
        ->and($html)->toContain('$entangle(&#039;data.script&#039;, false)')
        ->and($html)->toContain('lint-url="/lint"')
        ->and($html)->toContain('style="--php-script-editor-height: 24rem"')
        ->and($html)->toContain('no-toolbar')
        ->and($html)->toContain('const isLiveDebounced = false;')
        ->and($html)->toContain("import('https:\\/\\/cdn.jsdelivr.net")
        ->and($html)->not->toContain('value="return order.total;"');

    $document = Dom\HTMLDocument::createFromString('<!doctype html><body>'.$html.'</body>', LIBXML_NOERROR);
    $element = $document->querySelector('php-script-editor');
    $config = json_decode($element->getAttribute('config'), true);

    expect($config['definition']['contextVariables'])->toBe(['order'])
        ->and($element->hasAttribute('readonly'))->toBeFalse();
});

it('entangles live state for live fields', function (): void {
    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->live();
    expect(Livewire::test(ScriptForm::class)->html())->toContain('$entangle(&#039;data.script&#039;, true)');

    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->live(onBlur: true);
    expect(Livewire::test(ScriptForm::class)->html())
        ->toContain('$entangle(&#039;data.script&#039;, false)')
        ->toContain('const isLiveOnBlur = true;');
});

it('is readonly when disabled or read only', function (): void {
    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->disabled();
    expect(Livewire::test(ScriptForm::class)->html())->toMatch('/<php-script-editor[^>]* readonly/');

    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->readOnly();
    expect(Livewire::test(ScriptForm::class)->html())->toMatch('/<php-script-editor[^>]* readonly/');
});

it('saves the state', function (): void {
    Livewire::test(ScriptForm::class)
        ->set('data.script', 'return strtoupper("a");')
        ->call('save')
        ->assertHasNoErrors()
        ->assertSet('saved', ['script' => 'return strtoupper("a");']);
});

it('validates the script with validateScript()', function (): void {
    ScriptForm::$configure = fn (PhpScriptEditor $field) => $field->validateScript();

    Livewire::test(ScriptForm::class)
        ->set('data.script', 'unknown_fn();')
        ->call('save')
        ->assertHasErrors(['data.script'])
        ->assertSet('saved', null);

    Livewire::test(ScriptForm::class)
        ->set('data.script', 'return 1;')
        ->call('save')
        ->assertHasNoErrors();
});
