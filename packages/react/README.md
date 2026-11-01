# @php-script/editor-react

[![npm](https://img.shields.io/npm/v/@php-script/editor-react?label=npm)](https://www.npmjs.com/package/@php-script/editor-react)
[![Downloads](https://img.shields.io/npm/dm/@php-script/editor-react?label=downloads)](https://www.npmjs.com/package/@php-script/editor-react)

Documentation: https://php-script.github.io/php-script-editor/packages/react.html

React 18 and 19 wrapper for the `<php-script-editor>` web component. Loads the element on the client only, so it is safe with SSR.

## Installation

```bash
npm i @php-script/editor-react monaco-editor
```

## Usage

```tsx
import { useState } from 'react';
import { PhpScriptEditor } from '@php-script/editor-react';

export function ScriptEditor() {
  const [code, setCode] = useState('echo "Hello";');

  return <PhpScriptEditor value={code} onChange={setCode} configUrl="/php-script/config" />;
}
```

See the [documentation](https://php-script.github.io/php-script-editor/packages/react.html) for all props, events and methods, and
[Server and language config](https://php-script.github.io/php-script-editor/server.html) for the endpoints.
