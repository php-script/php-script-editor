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

### 1. Basic Editor Setup

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Get container element
const container = document.getElementById('editor-container');

// Create editor with default configuration
const editor = await createPhpScriptEditor(container, {
  value: '// Start typing php-script code\nuser.name',
  theme: 'vs-dark'
});

console.log('Editor ready!');
```

### 2. With Remote Configuration

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    value: 'user.logins.count()',
    theme: 'vs-dark',
    autoLoadConfiguration: true,
    configurationLoader: async () => {
      // Fetch configuration from your PHP backend
      const response = await fetch('/api/php-script/editor-config');
      if (!response.ok) {
        throw new Error('Failed to load editor configuration');
      }
      return response.json();
    },
    enablePersistence: true // Cache config in localStorage
  }
);

// Listen for configuration changes
editor.onConfigurationChanged((config) => {
  console.log('Configuration updated:', config.bundleVersion);
});
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

async function initEditor() {
  const container = document.getElementById('editor-container');

  const editor = await createPhpScriptEditor(container, {
    value: 'user.name',
    theme: 'vs-dark',
    configurationLoader: async () => {
      const res = await fetch('/api/editor-config');
      return res.json();
    }
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
</head>
<body>
  <div id="editor-container"></div>

  <script type="module">
    import { createPhpScriptEditor } from './node_modules/php-script-monaco-editor/dist/index.mjs';

    const editor = await createPhpScriptEditor(
      document.getElementById('editor-container'),
      {
        value: 'user.logins.count()',
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
import { loadConfigurationFromURL } from 'php-script-monaco-editor';

// Load configuration once
const sharedConfig = await loadConfigurationFromURL('/api/editor-config');

// Create multiple editors with same config
const editor1 = await createPhpScriptEditor(container1, {
  value: 'user.name',
  configuration: sharedConfig
});

const editor2 = await createPhpScriptEditor(container2, {
  value: 'user.email',
  configuration: sharedConfig
});
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
if (!config) {
  console.error('Configuration not loaded');
  await editor.reloadConfiguration();
}

// Verify configuration validity
import { validateConfigurationBundle } from 'php-script-monaco-editor';
const validation = validateConfigurationBundle(configData);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Performance Issues

**Problem**: Editor feels sluggish with large context schemas

**Solution**:
```typescript
// Limit context depth or use lazy loading
const editor = await createPhpScriptEditor(container, {
  configurationLoader: async () => {
    const config = await fetch('/api/editor-config').then(r => r.json());

    // Reduce context schema depth if needed
    config.contextSchema.variables = config.contextSchema.variables.map(v => ({
      ...v,
      properties: v.properties?.slice(0, 50) // Limit to first 50 properties
    }));

    return config;
  }
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
