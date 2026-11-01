---
title: Svelte
parent: Packages
nav_order: 4
---

# Svelte: `@php-script/editor-svelte`
{: .no_toc }

[![npm](https://img.shields.io/npm/v/@php-script/editor-svelte?label=npm)](https://www.npmjs.com/package/@php-script/editor-svelte)

A Svelte 5 component around [`<php-script-editor>`](./editor.html) with `bind:value`. It loads the
element in the browser only (in `onMount`), so it is safe with SvelteKit SSR.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
npm i @php-script/editor-svelte monaco-editor
```

## Usage

```svelte
<script lang="ts">
  import { PhpScriptEditor } from '@php-script/editor-svelte';

  let code = $state('echo "Hello";');
</script>

<PhpScriptEditor
  bind:value={code}
  configUrl="/php-script/config"
  saveUrl="/scripts"
  lintUrl="/scripts/lint"
  height="24rem"
  onsaved={(result) => console.log('saved', result.nextUrl)}
/>
```

## Props

| Prop                  | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `value` (bindable)    | Content                                                             |
| `element` (bindable)  | The `<php-script-editor>` element, for `save()`, `lint()`, `editor` |
| `height`              | CSS height, sets `--php-script-editor-height`                       |
| `class`               | Passed to the element                                               |
| `onchange(value)`     | Every change                                                        |
| `onready(editor, el)` | Monaco is mounted                                                   |
| `onsavestart(event)`  | Before a save; `event.preventDefault()` cancels it                  |
| `onsaved(result)`     | Save succeeded                                                      |
| `onsaveerror(error)`  | Save failed                                                         |
| `ondiagnostics(list)` | New lint diagnostics                                                |

All other props are the element's [attributes](./editor.html#attributes-and-properties) in
camelCase (`config`, `configUrl`, `saveUrl`, `saveMethod`, `saveField`, `saveHeaders`,
`savePayload`, `persisted`, `csrfToken`, `lintUrl`, `lintDelay`, `theme`, `readonly`, `name`,
`options`, `labels`, `noToolbar`, `noSaveShortcut`). They are set as properties, and only when
they change.

## Calling methods

```svelte
<script lang="ts">
  import { PhpScriptEditor, type PhpScriptEditorElement } from '@php-script/editor-svelte';

  let element = $state<PhpScriptEditorElement | null>(null);
</script>

<PhpScriptEditor bind:element configUrl="/php-script/config" saveUrl="/scripts" noToolbar />
<button onclick={() => element?.save()}>Save</button>
```

`loadPhpScriptEditor()` is exported too, to preload the element.
