---
title: Vue
parent: Packages
nav_order: 3
---

# Vue: `@php-script/editor-vue`
{: .no_toc }

[![npm](https://img.shields.io/npm/v/@php-script/editor-vue?label=npm)](https://www.npmjs.com/package/@php-script/editor-vue)

A Vue 3 component around [`<php-script-editor>`](./editor.html) with `v-model` support. It loads
the element in the browser only, so it works with Nuxt and other SSR setups.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
npm i @php-script/editor-vue monaco-editor
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhpScriptEditor } from '@php-script/editor-vue';

const code = ref('echo "Hello";');
</script>

<template>
  <PhpScriptEditor
    v-model="code"
    config-url="/php-script/config"
    save-url="/scripts"
    lint-url="/scripts/lint"
    height="24rem"
    @saved="(result) => console.log('saved', result.nextUrl)"
  />
</template>
```

The component renders the element with `h()`, so no `isCustomElement` compiler option is needed.
Use the plugin to register it globally:

```ts
import { PhpScriptEditorPlugin } from '@php-script/editor-vue';

app.use(PhpScriptEditorPlugin); // <PhpScriptEditor> everywhere
```

## Props

`modelValue` (`v-model`), `height` (CSS height), and the element's
[attributes](./editor.html#attributes-and-properties): `config`, `configUrl`, `saveUrl`,
`saveMethod`, `saveField`, `saveHeaders`, `savePayload`, `persisted`, `csrfToken`, `lintUrl`,
`lintDelay`, `theme`, `readonly`, `name`, `options`, `labels`, `noToolbar`, `noSaveShortcut`.
Objects are set as properties, so they need no JSON.

## Events

| Event               | Payload             | When                                            |
| ------------------- | ------------------- | ----------------------------------------------- |
| `update:modelValue` | `value`             | Every change                                    |
| `change`            | `value`             | Blur after a change                             |
| `ready`             | `editor`, `element` | Monaco is mounted                               |
| `save-start`        | `event`             | Before a save; `event.preventDefault()` cancels |
| `saved`             | `result`            | Save succeeded                                  |
| `save-error`        | `error`             | Save failed                                     |
| `diagnostics`       | `diagnostics`       | New lint diagnostics                            |

## Template ref

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhpScriptEditor } from '@php-script/editor-vue';

const editor = ref<InstanceType<typeof PhpScriptEditor>>();
const save = () => editor.value?.save(); // also: lint(), focus(), element, editor
</script>

<template>
  <PhpScriptEditor ref="editor" config-url="/php-script/config" save-url="/scripts" no-toolbar />
  <button @click="save">Save</button>
</template>
```

## Using the element directly

To write `<php-script-editor>` in your templates instead, tell Vue it is a custom element and
import `@php-script/editor` on the client:

```ts
// vite.config.ts
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'php-script-editor' } } });
```
