# @php-script/editor-svelte

[![npm](https://img.shields.io/npm/v/@php-script/editor-svelte?label=npm)](https://www.npmjs.com/package/@php-script/editor-svelte)
[![Downloads](https://img.shields.io/npm/dm/@php-script/editor-svelte?label=downloads)](https://www.npmjs.com/package/@php-script/editor-svelte)

Documentation: https://php-script.github.io/php-script-editor/packages/svelte.html

Svelte 5 wrapper for the `<php-script-editor>` web component, with `bind:value`. Loads the element in `onMount`, so it is safe with SvelteKit SSR.

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

<PhpScriptEditor bind:value={code} configUrl="/php-script/config" />
```

See the [documentation](https://php-script.github.io/php-script-editor/packages/svelte.html) for all props, events and methods, and
[Server and language config](https://php-script.github.io/php-script-editor/server.html) for the endpoints.
