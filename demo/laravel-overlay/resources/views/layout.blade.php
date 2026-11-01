<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title') · php-script editor demo</title>
    @phpScriptEditorScripts
    <style>
        :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
        body { margin: 0 auto; max-width: 56rem; padding: 2rem 1rem; line-height: 1.5; }
        nav { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        code { font-size: .9em; }
        output { display: block; margin-top: .75rem; font-family: ui-monospace, monospace; font-size: .85rem; white-space: pre-wrap; }
    </style>
</head>
<body>
    <nav>
        <a href="{{ route('home') }}">Home</a>
        <a href="{{ route('blade') }}">Blade editor</a>
        <a href="{{ url('/admin') }}">Filament admin</a>
    </nav>
    @yield('content')
</body>
</html>
