# Quickstart Guide: PHP-Script Monaco Editor

**Feature**: Dynamic Language Configuration
**Created**: 2025-11-16
**Audience**: Developers integrating the php-script editor into their projects

## Overview

This guide shows how to integrate the php-script Monaco Editor NPM package into your TypeScript or JavaScript project. The editor comes pre-configured with php-script language support, including syntax highlighting, code completion for whitelisted functions, and context-aware autocomplete.

---

## Installation

```bash
npm install php-script-monaco-editor
```

**Peer Dependencies** (install if not already present):
```bash
npm install monaco-editor
```

---

## Quick Start (TypeScript)

### 1. Basic Editor Setup with Server-Side Rendering

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Server-side PHP embeds configuration in HTML:
// <script>
//   window.phpScriptEditorConfig = { languageDefinition: {...}, functionWhitelist: {...}, contextSchema: {...} };
//   window.phpScriptInitialContent = "user.name";
// </script>

// Get container element
const container = document.getElementById('editor-container');

// Create editor with server-provided configuration
const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,  // From server-side rendering
  initialValue: window.phpScriptInitialContent, // From server (may be overridden by localStorage)
  theme: 'vs-dark',
  enableContentPersistence: true // Auto-save to localStorage (default: true)
});

console.log('Editor ready!');
```

### 2. Content Persistence and Revert

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig,
    initialValue: window.phpScriptInitialContent,
    theme: 'vs-dark'
  }
);

// Content automatically persists to localStorage on every change (debounced 500ms)

// Check if user has unsaved local changes
if (editor.hasUnsavedChanges()) {
  console.log('User has modified content locally');

  // Optionally discard local changes and revert to server content
  const confirm = window.confirm('Revert to original content?');
  if (confirm) {
    editor.revertToOriginal(); // Clears localStorage and restores server content
  }
}

// Get original server-provided content
const original = editor.getOriginalContent();
console.log('Server provided:', original);
console.log('Current content:', editor.getValue());
```

### 3. Update Configuration Dynamically

```typescript
// Update function whitelist on the fly
editor.updateFunctionWhitelist([
  {
    name: 'customFunction',
    signature: {
      parameters: [
        { name: 'param1', type: 'string', optional: false }
      ],
      returnType: 'string'
    },
    documentation: 'Custom function added at runtime',
    category: 'custom',
    deprecated: false
  }
]);

// Update context variables
editor.updateContextSchema([
  {
    name: 'session',
    type: { kind: 'object', baseType: 'Session' },
    properties: [
      {
        name: 'id',
        type: { kind: 'scalar', baseType: 'string' },
        readonly: true,
        documentation: 'Session ID'
      }
    ],
    documentation: 'Current user session'
  }
]);
```

---

## Quick Start (JavaScript / CommonJS)

### 1. Node.js / CommonJS

```javascript
const { createPhpScriptEditor } = require('php-script-monaco-editor');

// Server-side PHP embeds configuration in HTML:
// <script>
//   window.phpScriptEditorConfig = { ... };
//   window.phpScriptInitialContent = "user.name";
// </script>

async function initEditor() {
  const container = document.getElementById('editor-container');

  const editor = await createPhpScriptEditor(container, {
    configuration: window.phpScriptEditorConfig,  // From server-side rendering
    initialValue: window.phpScriptInitialContent, // From server (may be overridden by localStorage)
    theme: 'vs-dark'
  });

  console.log('Editor ready:', editor.getValue());
}

initEditor();
```

### 2. Browser (ES Modules)

```html
<!DOCTYPE html>
<html>
<head>
  <title>PHP-Script Editor</title>
  <style>
    #editor-container {
      width: 800px;
      height: 600px;
      border: 1px solid #ccc;
    }
  </style>
  <script>
    // Server-side PHP embeds configuration
    window.phpScriptEditorConfig = {
      languageDefinition: { /* ... */ },
      functionWhitelist: { /* ... */ },
      contextSchema: { /* ... */ },
      bundleVersion: '1.0.0',
      compatibility: { minEditorVersion: '1.0.0', phpScriptEngine: '2.5.0' },
      metadata: { generatedAt: '2025-11-16T10:00:00Z', generatedBy: 'php-script-engine', environment: 'production' }
    };
    window.phpScriptInitialContent = 'user.logins.count()';
  </script>
</head>
<body>
  <div id="editor-container"></div>

  <script type="module">
    import { createPhpScriptEditor } from './node_modules/php-script-monaco-editor/dist/index.mjs';

    const editor = await createPhpScriptEditor(
      document.getElementById('editor-container'),
      {
        configuration: window.phpScriptEditorConfig,
        initialValue: window.phpScriptInitialContent,
        theme: 'vs-dark'
      }
    );

    console.log('Editor initialized');
  </script>
</body>
</html>
```

---

## Server-Side Configuration

### PHP Backend Example

Generate the configuration bundle from your PHP backend:

```php
<?php
// api/editor-config.php

header('Content-Type: application/json');
header('Cache-Control: public, max-age=3600');

// Generate Monarch language definition
$languageDefinition = [
    'languageId' => 'php-script',
    'monarchDefinition' => [
        'tokenizer' => [
            'root' => [
                ['\\b(if|else|for|while|function|return)\\b', 'keyword'],
                ['\\b(true|false|null)\\b', 'constant'],
                ['[a-zA-Z_][a-zA-Z0-9_]*', 'identifier'],
                ['\\d+', 'number'],
                ['"([^"\\\\]|\\\\.)*"', 'string'],
            ]
        ],
        'keywords' => ['if', 'else', 'for', 'while', 'function', 'return'],
        'operators' => ['+', '-', '*', '/', '==', '!=', '<', '>', '&&', '||'],
        'symbols' => '[=><!~?:&|+\\-*/^%]+',
        'escapes' => '\\\\(?:[abfnrtv\\\\"\\']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})'
    ],
    'fileExtensions' => ['.phs', '.phpscript'],
    'mimeTypes' => ['text/x-php-script'],
    'configuration' => [
        'comments' => [
            'lineComment' => '//',
            'blockComment' => ['/*', '*/']
        ],
        'brackets' => [['(', ')'], ['{', '}'], ['[', ']']],
        'autoClosingPairs' => [
            ['open' => '{', 'close' => '}'],
            ['open' => '[', 'close' => ']'],
            ['open' => '(', 'close' => ')'],
            ['open' => '"', 'close' => '"']
        ]
    ]
];

// Get whitelisted functions from engine configuration
$functionWhitelist = [
    'functions' => [
        [
            'name' => 'strlen',
            'signature' => [
                'parameters' => [
                    ['name' => 'string', 'type' => 'string', 'optional' => false]
                ],
                'returnType' => 'int'
            ],
            'documentation' => 'Returns the length of a string',
            'category' => 'string',
            'deprecated' => false
        ],
        [
            'name' => 'substr',
            'signature' => [
                'parameters' => [
                    ['name' => 'string', 'type' => 'string', 'optional' => false],
                    ['name' => 'start', 'type' => 'int', 'optional' => false],
                    ['name' => 'length', 'type' => 'int', 'optional' => true]
                ],
                'returnType' => 'string'
            ],
            'documentation' => 'Returns part of a string',
            'category' => 'string',
            'deprecated' => false
        ]
    ],
    'version' => '1.0.0',
    'namespace' => 'global'
];

// Get context variables from runtime configuration
$contextSchema = [
    'variables' => [
        [
            'name' => 'user',
            'type' => ['kind' => 'object', 'baseType' => 'User'],
            'properties' => [
                [
                    'name' => 'name',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'readonly' => false,
                    'documentation' => 'User\'s full name'
                ],
                [
                    'name' => 'email',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'readonly' => true,
                    'documentation' => 'User\'s email address'
                ],
                [
                    'name' => 'logins',
                    'type' => ['kind' => 'object', 'baseType' => 'LoginCollection'],
                    'readonly' => true,
                    'documentation' => 'User login history'
                ]
            ],
            'methods' => [
                [
                    'name' => 'save',
                    'signature' => [
                        'parameters' => [],
                        'returnType' => 'bool'
                    ],
                    'documentation' => 'Save user data'
                ]
            ],
            'documentation' => 'Current authenticated user'
        ]
    ],
    'version' => '1.0.0',
    'strict' => true
];

// Build complete configuration bundle
$configBundle = [
    'languageDefinition' => $languageDefinition,
    'functionWhitelist' => $functionWhitelist,
    'contextSchema' => $contextSchema,
    'bundleVersion' => '1.0.0',
    'compatibility' => [
        'minEditorVersion' => '1.0.0',
        'maxEditorVersion' => null,
        'phpScriptEngine' => '2.5.0'
    ],
    'metadata' => [
        'generatedAt' => date('c'),
        'generatedBy' => 'php-script-engine',
        'environment' => getenv('APP_ENV') ?: 'production'
    ]
];

echo json_encode($configBundle, JSON_PRETTY_PRINT);
```

---

## Common Use Cases

### Use Case 1: Read-Only Configuration Display

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(container, {
  value: predefinedScript,
  monacoOptions: {
    readOnly: true,
    minimap: { enabled: false },
    lineNumbers: 'off'
  }
});
```

### Use Case 2: Script Validation Before Save

```typescript
const editor = await createPhpScriptEditor(container, { ... });

saveButton.addEventListener('click', async () => {
  const script = editor.getValue();

  // Monaco provides built-in validation via markers
  const model = editor.monaco.getModel();
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });

  if (markers.length > 0) {
    alert('Script has validation errors. Please fix before saving.');
    return;
  }

  // Send to backend
  await fetch('/api/scripts/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script })
  });
});
```

### Use Case 3: Multiple Editors with Shared Configuration

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Server provides shared configuration via SSR
// <script>
//   window.phpScriptEditorConfig = { ... }; // Shared for all editors on page
// </script>

// Create multiple editors with same configuration
const editor1 = await createPhpScriptEditor(container1, {
  initialValue: 'user.name',
  configuration: window.phpScriptEditorConfig,
  storageKey: 'editor-1' // Unique key for localStorage
});

const editor2 = await createPhpScriptEditor(container2, {
  initialValue: 'user.email',
  configuration: window.phpScriptEditorConfig,
  storageKey: 'editor-2' // Unique key for localStorage
});

// Each editor has independent localStorage persistence
```

### Use Case 4: Dynamic Context Updates

```typescript
// When user switches context (e.g., different data model)
async function switchContext(newContextId) {
  const contextResponse = await fetch(`/api/contexts/${newContextId}`);
  const contextData = await contextResponse.json();

  editor.updateContextSchema(contextData.variables);

  // Now code completion reflects the new context
}
```

---

## Troubleshooting

### Editor Not Loading

**Problem**: Editor container appears empty

**Solution**:
```typescript
// Ensure container has explicit dimensions
const container = document.getElementById('editor-container');
container.style.width = '100%';
container.style.height = '600px';

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const editor = await createPhpScriptEditor(container, { ... });
});
```

### Configuration Not Applied

**Problem**: Syntax highlighting or completion not working

**Solution**:
```typescript
// Check configuration was loaded successfully
const config = editor.getConfiguration();
console.log('Loaded configuration version:', config.bundleVersion);

// Verify configuration validity before passing to editor
import { validateConfigurationBundle } from 'php-script-monaco-editor';
const validation = validateConfigurationBundle(window.phpScriptEditorConfig);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// If configuration is invalid, check server-side PHP rendering
console.log('Server configuration:', window.phpScriptEditorConfig);
```

### Performance Issues

**Problem**: Editor feels sluggish with large context schemas

**Solution**:
```typescript
// Pre-process configuration on server-side to limit context depth
// Server-side PHP should limit context schema depth before rendering

// On client-side, verify configuration size
const configSize = JSON.stringify(window.phpScriptEditorConfig).length;
if (configSize > 100000) { // 100KB threshold
  console.warn('Large configuration may impact performance:', configSize, 'bytes');
}

// If needed, you can reduce context schema before initializing editor
const config = { ...window.phpScriptEditorConfig };
config.contextSchema.variables = config.contextSchema.variables.map(v => ({
  ...v,
  properties: v.properties?.slice(0, 50) // Limit to first 50 properties
}));

const editor = await createPhpScriptEditor(container, {
  configuration: config,
  initialValue: window.phpScriptInitialContent
});
```

---

## Next Steps

- Read the [API Documentation](./contracts/api.md) for detailed API reference
- Check the [Data Model](./data-model.md) to understand configuration structure
- Review the [Research Document](./research.md) for architecture decisions
- See [tasks.md](./tasks.md) for implementation tasks (after `/speckit.tasks` runs)

---

## Support

For issues, questions, or contributions:
- GitHub: [repository-url]
- Documentation: [docs-url]
- Examples: [examples-url]
