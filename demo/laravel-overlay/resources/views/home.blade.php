@extends('layout')

@section('title', 'Home')

@section('content')
    <h1>php-script editor · Laravel demo</h1>
    <p>Uses <code>php-script/editor-laravel</code> from <code>packages/laravel</code> (composer path repository).</p>
    <ul>
        <li><a href="{{ url('/admin/automations') }}">Filament resource</a> with the <code>PhpScriptEditor</code> field (auto-login as admin@example.com / password)</li>
        <li><a href="{{ route('blade') }}">Blade page</a> with <code>&lt;x-php-script-editor&gt;</code>, saving to a JSON controller</li>
    </ul>
@endsection
