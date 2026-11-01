# @php-script/editor-vue

[![npm](https://img.shields.io/npm/v/@php-script/editor-vue?label=npm)](https://www.npmjs.com/package/@php-script/editor-vue)
[![Downloads](https://img.shields.io/npm/dm/@php-script/editor-vue?label=downloads)](https://www.npmjs.com/package/@php-script/editor-vue)

Documentation: https://php-script.github.io/php-script-editor/packages/vue.html

Vue 3 wrapper for the `<php-script-editor>` web component, with `v-model`. Loads the element on the client only, so it is safe with Nuxt SSR.

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
  <PhpScriptEditor v-model="code" config-url="/php-script/config" />
</template>
```

See the [documentation](https://php-script.github.io/php-script-editor/packages/vue.html) for all props, events and methods, and
[Server and language config](https://php-script.github.io/php-script-editor/server.html) for the endpoints.
