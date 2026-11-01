# @php-script/editor

[![npm](https://img.shields.io/npm/v/@php-script/editor?label=npm)](https://www.npmjs.com/package/@php-script/editor)
[![Downloads](https://img.shields.io/npm/dm/@php-script/editor?label=downloads)](https://www.npmjs.com/package/@php-script/editor)

Documentation: https://php-script.github.io/php-script-editor/packages/editor.html

Monaco-based `<php-script-editor>` web component for [PHP Script](https://php-script.github.io/php-script/) v2. Highlighting and completions come from your `Engine`; saving, lint markers, themes and form association are built in.

## Installation

```bash
npm i @php-script/editor monaco-editor
```

## Usage

```js
import '@php-script/editor';
```

```html
<php-script-editor
  config-url="/php-script/config"
  save-url="/scripts"
  lint-url="/scripts/lint"
  value='echo "Hello";'
></php-script-editor>
```

See the [documentation](https://php-script.github.io/php-script-editor/packages/editor.html) for all props, events and methods, and
[Server and language config](https://php-script.github.io/php-script-editor/server.html) for the endpoints.
