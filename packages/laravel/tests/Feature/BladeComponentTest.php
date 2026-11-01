<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Blade;
use PhpScript\Editor\Laravel\EditorAssets;
use PhpScript\Editor\Laravel\EditorConfig;

/** Parses the rendered HTML like a browser and returns the <php-script-editor> element. */
function editorElement(string $html): Dom\Element
{
    $document = Dom\HTMLDocument::createFromString('<!doctype html><body>'.$html.'</body>', LIBXML_NOERROR);
    $element = $document->querySelector('php-script-editor');

    expect($element)->not->toBeNull();

    return $element;
}

it('renders the element with the script tag', function (): void {
    $html = Blade::render('<x-php-script-editor name="script" value="return 1;" />');

    expect($html)->toContain('<script type="module" src="https://cdn.jsdelivr.net/npm/@php-script/editor@2/dist/standalone/php-script-editor.js"')
        ->and($html)->toContain('<php-script-editor name="script" value="return 1;" theme="auto"');
});

it('escapes the content so it cannot break out of the attribute', function (): void {
    $script = "x = \"</script><script>alert(1)</script>\";\n// it's <b>bold</b> & 'quoted'\r\n  trailing  ";

    $html = Blade::render('<x-php-script-editor name="script" :value="$script" />', ['script' => $script]);
    $element = editorElement($html);

    expect($html)->not->toContain('</script><script>alert(1)')
        ->and($html)->not->toContain('<b>')
        ->and($element->getAttribute('value'))->toBe($script)
        ->and($element->childNodes->length)->toBe(0);
});

it('keeps HTML entities in the content literal', function (): void {
    $html = Blade::render('<x-php-script-editor :value="$script" />', ['script' => 'echo "&amp; &lt;";']);

    expect(editorElement($html)->getAttribute('value'))->toBe('echo "&amp; &lt;";');
});

it('converts an engine into the config attribute', function (): void {
    $html = Blade::render('<x-php-script-editor :config="$engine" />', ['engine' => testEngine()]);
    $config = json_decode(editorElement($html)->getAttribute('config'), true, flags: JSON_THROW_ON_ERROR);

    expect($config)->toBe(json_decode(EditorConfig::fromEngine(testEngine())->toJson(), true));
});

it('accepts EditorConfig objects and arrays as config', function (): void {
    $config = EditorConfig::fromEngine(testEngine());

    $fromObject = editorElement(Blade::render('<x-php-script-editor :config="$config" />', ['config' => $config]));
    $fromArray = editorElement(Blade::render('<x-php-script-editor :config="$config" />', ['config' => $config->toArray()]));

    expect($fromObject->getAttribute('config'))->toBe($config->toJson())
        ->and($fromArray->getAttribute('config'))->toBe($config->toJson());
});

it('escapes JSON attributes', function (): void {
    $html = Blade::render(
        '<x-php-script-editor :save-payload="$payload" :labels="$labels" :options="$options" />',
        [
            'payload' => ['title' => '"><script>alert(1)</script>'],
            'labels' => ['save' => "Speichern's"],
            'options' => ['minimap' => ['enabled' => false]],
        ],
    );
    $element = editorElement($html);

    expect($html)->not->toContain('<script>alert(1)')
        ->and(json_decode($element->getAttribute('save-payload'), true))->toBe(['title' => '"><script>alert(1)</script>'])
        ->and(json_decode($element->getAttribute('labels'), true))->toBe(['save' => "Speichern's"])
        ->and($element->getAttribute('options'))->toBe('{"minimap":{"enabled":false}}');
});

it('renders all element attributes', function (): void {
    $html = Blade::render(<<<'BLADE'
        <x-php-script-editor
            name="script"
            config-url="/scripts/config"
            save-url="/scripts/1"
            save-method="put"
            save-field="body"
            :save-headers="['X-Tenant' => 'a']"
            persisted
            csrf-token="token"
            lint-url="/scripts/lint"
            :lint-delay="250"
            theme="dark"
            readonly
            height="24rem"
            no-toolbar
            no-save-shortcut
            class="rounded"
            data-test="x"
        />
        BLADE);
    $element = editorElement($html);

    expect($element->getAttribute('config-url'))->toBe('/scripts/config')
        ->and($element->getAttribute('save-url'))->toBe('/scripts/1')
        ->and($element->getAttribute('save-method'))->toBe('PUT')
        ->and($element->getAttribute('save-field'))->toBe('body')
        ->and($element->getAttribute('save-headers'))->toBe('{"X-Tenant":"a"}')
        ->and($element->hasAttribute('persisted'))->toBeTrue()
        ->and($element->getAttribute('csrf-token'))->toBe('token')
        ->and($element->getAttribute('lint-url'))->toBe('/scripts/lint')
        ->and($element->getAttribute('lint-delay'))->toBe('250')
        ->and($element->getAttribute('theme'))->toBe('dark')
        ->and($element->hasAttribute('readonly'))->toBeTrue()
        ->and($element->getAttribute('style'))->toBe('--php-script-editor-height: 24rem')
        ->and($element->hasAttribute('no-toolbar'))->toBeTrue()
        ->and($element->hasAttribute('no-save-shortcut'))->toBeTrue()
        ->and($element->getAttribute('class'))->toBe('rounded')
        ->and($element->getAttribute('data-test'))->toBe('x')
        ->and($element->hasAttribute('value'))->toBeFalse();
});

it('omits unset optional attributes', function (): void {
    $element = editorElement(Blade::render('<x-php-script-editor />'));

    expect($element->getAttributeNames())->toBe(['theme']);
});

it('encodes theme objects as JSON', function (): void {
    $element = editorElement(Blade::render('<x-php-script-editor :theme="$theme" />', [
        'theme' => ['base' => 'dark', 'colors' => ['accent' => 'oklch(0.6 0.2 250)']],
    ]));

    expect(json_decode($element->getAttribute('theme'), true))->toBe(['base' => 'dark', 'colors' => ['accent' => 'oklch(0.6 0.2 250)']]);
});

it('merges the height into an existing style and uses pixels for integers', function (): void {
    $element = editorElement(Blade::render('<x-php-script-editor :height="300" style="margin: 0;" />'));

    expect($element->getAttribute('style'))->toBe('margin: 0; --php-script-editor-height: 300px');
});

it('rejects heights that could inject CSS', function (): void {
    Blade::render('<x-php-script-editor height="1rem; background: url(x)" />');
})->throws(Exception::class, 'Invalid CSS length');

it('uses the configured defaults', function (): void {
    config(['php-script-editor.theme' => 'light', 'php-script-editor.height' => '30rem', 'php-script-editor.lint_delay' => 800]);

    $element = editorElement(Blade::render('<x-php-script-editor />'));

    expect($element->getAttribute('theme'))->toBe('light')
        ->and($element->getAttribute('style'))->toBe('--php-script-editor-height: 30rem')
        ->and($element->getAttribute('lint-delay'))->toBe('800');
});

it('renders the script tag only once per request', function (): void {
    $html = Blade::render('<x-php-script-editor name="a" /><x-php-script-editor name="b" />@phpScriptEditorScripts');

    expect(substr_count($html, '<script type="module"'))->toBe(1)
        ->and(substr_count($html, '<php-script-editor '))->toBe(2);
});

it('skips the script tag when disabled', function (): void {
    expect(Blade::render('<x-php-script-editor :script="false" />'))->not->toContain('<script');

    config(['php-script-editor.inject_script' => false]);
    app()->forgetScopedInstances();

    expect(Blade::render('<x-php-script-editor />'))->not->toContain('<script');
});

it('renders the scripts directive', function (): void {
    expect(Blade::render('@phpScriptEditorScripts'))
        ->toBe('<script type="module" src="'.EditorAssets::DEFAULT_CDN_URL.'" data-php-script-editor></script>');
});
