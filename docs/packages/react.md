---
title: React
parent: Packages
nav_order: 2
---

# React: `@php-script/editor-react`
{: .no_toc }

[![npm](https://img.shields.io/npm/v/@php-script/editor-react?label=npm)](https://www.npmjs.com/package/@php-script/editor-react)

A React 18 and 19 component around [`<php-script-editor>`](./editor.html). It loads the element
on the client only, so it is safe with SSR (Next.js App and Pages Router). The module is marked
`'use client'`.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

```bash
npm i @php-script/editor-react monaco-editor
```

## Usage

```tsx
import { useState } from 'react';
import { PhpScriptEditor } from '@php-script/editor-react';

export function ScriptForm() {
  const [code, setCode] = useState('echo "Hello";');

  return (
    <PhpScriptEditor
      value={code}
      onChange={setCode}
      configUrl="/php-script/config"
      saveUrl="/scripts"
      lintUrl="/scripts/lint"
      height="24rem"
      onSave={(result) => console.log('saved', result.nextUrl)}
    />
  );
}
```

Leave `value` undefined and pass `defaultValue` for an uncontrolled editor.

## Props

The element's [attributes](./editor.html#attributes-and-properties) as camelCase props, set as
properties, so objects need no JSON:

`config`, `configUrl`, `saveUrl`, `saveMethod`, `saveField`, `saveHeaders`, `savePayload`,
`persisted`, `csrfToken`, `lintUrl`, `lintDelay`, `theme`, `readOnly`, `name`, `options`, `labels`,
`noToolbar`, `noSaveShortcut`.

| Prop                         | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `value` / `defaultValue`     | Controlled or initial content                             |
| `height`                     | CSS height, sets `--php-script-editor-height`             |
| `className`, `style`, `id`   | Passed to the element                                     |
| `onChange(value)`            | Every change (`ps-change`)                                |
| `onBlurChange(value)`        | Native `change` on blur                                   |
| `onReady(editor, element)`   | Monaco is mounted (`ps-ready`)                            |
| `onSaveStart(event)`         | Before a save; call `event.preventDefault()` to cancel it |
| `onSave(result)`             | Save succeeded (`ps-saved`)                               |
| `onSaveError(error)`         | Save failed (`ps-save-error`)                             |
| `onDiagnostics(diagnostics)` | New lint diagnostics (`ps-diagnostics`)                   |

Props are synced only when they change. The element updates `persisted` and `saveUrl` itself after
the first `POST`, and an unchanged prop does not undo that.

## Ref

```tsx
import { useRef } from 'react';
import { PhpScriptEditor, type PhpScriptEditorHandle } from '@php-script/editor-react';

const ref = useRef<PhpScriptEditorHandle>(null);

<PhpScriptEditor ref={ref} configUrl="/php-script/config" saveUrl="/scripts" noToolbar />;

await ref.current?.save(); // also: lint(), focus(), element, editor
```

## Exports

- `PhpScriptEditor` (also the default export), `PhpScriptEditorProps`, `PhpScriptEditorHandle`
- `loadPhpScriptEditor()`: imports and registers the element, e.g. to preload it
- Types: `LintDiagnostic`, `PhpScriptConfig`, `PhpScriptTheme`, `SaveResult`, `SaveStatus`,
  `PhpScriptEditorElement`
