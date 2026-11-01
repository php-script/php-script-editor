---
title: Getting started
nav_order: 2
---

# Getting started
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

The editor has two halves:

1. **The server** builds a PHP Script `Engine` and exposes what the editor needs: the language
   config (highlighting and completions), and optionally endpoints to save and lint scripts.
2. **The browser** renders `<php-script-editor>`, directly or through a framework wrapper.

Using Laravel? The [Laravel package](./packages/laravel.html) covers both halves. With Filament,
see the [Filament package](./packages/filament.html).

## 1. Serve the language config

Install [PHP Script](https://php-script.github.io/php-script/php/getting-started.html) v2 and
return the output of its `MonarchLanguageDefinitionService` as JSON:

```php
use PhpScript\Core\Engine;

$engine = new Engine()
    ->allow('strtoupper')
    ->set('user', $user);

$service = $engine->monarchLanguageDefinition();

header('Content-Type: application/json');
echo json_encode([
    'definition' => $service->getDefinition(),       // Monarch tokenizer
    'completions' => $service->getCompletionItems(), // functions, variables, classes
]);
```

Only the functions passed to `allow()` and the variables passed to `set()` are highlighted and
suggested. Objects are reflected, so `user.` completes their properties and methods. See
[Server and language config](./server.html) for the JSON format and the save and lint endpoints.

## 2. Add the editor

```bash
npm i @php-script/editor monaco-editor
```

```html
<script type="module">
  import '@php-script/editor';
</script>

<php-script-editor config-url="/php-script/config"></php-script-editor>
```

Importing `@php-script/editor` registers the `<php-script-editor>` element. Monaco is loaded on
demand when the first editor connects.

No bundler? Use the [standalone build](./packages/editor.html#standalone-build) instead.

## 3. Save and lint

Add `save-url` for a save toolbar and `Ctrl/Cmd+S`, and `lint-url` for live diagnostics:

```html
<php-script-editor
  config-url="/php-script/config"
  save-url="/scripts"
  lint-url="/scripts/lint"
></php-script-editor>
```

The first save is a `POST` to `save-url` with the body `{"content": "…"}`. When the response has
a `Location` header (or a `url` field), later saves are `PUT` requests to that URL. Details are in
[Saving](./packages/editor.html#saving) and [Linting](./packages/editor.html#linting).

## 4. Use your framework

| Framework              | Package                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| React, Next.js         | [`@php-script/editor-react`](./packages/react.html)                                 |
| Vue, Nuxt              | [`@php-script/editor-vue`](./packages/vue.html)                                     |
| Svelte, SvelteKit      | [`@php-script/editor-svelte`](./packages/svelte.html)                               |
| Angular, Solid, Alpine | the element itself, see [Other frameworks](./packages/editor.html#other-frameworks) |
| Laravel, Livewire      | [`php-script/editor-laravel`](./packages/laravel.html)                              |
| Filament 5             | [`php-script/editor-filament`](./packages/filament.html)                            |

## Try it locally

The repository contains a playground with all wrappers and a PHP dev server:

```bash
git clone https://github.com/php-script/php-script-editor.git
cd php-script-editor
docker compose up -d   # playground on http://localhost:5173, PHP API on http://localhost:8080
```
