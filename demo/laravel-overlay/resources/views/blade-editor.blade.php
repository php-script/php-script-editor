@extends('layout')

@section('title', 'Blade editor')

@section('content')
    <h1>{{ $automation ? 'Edit: '.$automation->name : 'New script' }}</h1>
    <p>
        <code>&lt;x-php-script-editor&gt;</code> with an inline config from the bound <code>Engine</code>.
        Saving POSTs to <code>/scripts</code>, then PUTs to the returned <code>Location</code>.
    </p>

    <x-php-script-editor
        data-testid="editor"
        :value="$automation?->script ?? 'echo user.greet(\'Hi\');'"
        :persisted="$automation?->exists ?? false"
        :config="$engine"
        :save-url="$automation ? route('scripts.update', $automation) : route('scripts.store')"
        :save-payload="['name' => 'Saved from Blade']"
        :lint-url="route('scripts.lint')"
        theme="auto"
        height="18rem"
    />

    <output data-testid="log"></output>

    <script>
        const log = document.querySelector('[data-testid=log]');
        const editor = document.querySelector('php-script-editor');
        editor.addEventListener('ps-saved', (event) => {
            const { method, url, status } = event.detail;
            log.textContent += `ps-saved: ${method} ${new URL(url, location.href).pathname} ${status}\n`;
        });
        editor.addEventListener('ps-save-error', (event) => {
            log.textContent += `ps-save-error: ${event.detail.status} ${event.detail.error.message}\n`;
        });
    </script>
@endsection
