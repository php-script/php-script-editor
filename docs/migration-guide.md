# Migration Guide: From Raw Monaco Editor to php-script-monaco-editor

This guide helps you migrate from using raw Monaco Editor to the php-script-monaco-editor package.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Prerequisites](#prerequisites)
- [Step-by-Step Migration](#step-by-step-migration)
- [Configuration Changes](#configuration-changes)
- [API Differences](#api-differences)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Why Migrate?

Migrating from raw Monaco Editor to php-script-monaco-editor provides several benefits:

- **Pre-configured php-script Language**: No need to manually register Monarch tokenizers
- **Type-Safe API**: Full TypeScript support with comprehensive type definitions
- **Automatic Content Persistence**: Built-in localStorage integration prevents data loss
- **Server-Side Configuration**: Configuration delivered via SSR (no AJAX required)
- **Intelligent Code Completion**: Context-aware suggestions for functions and variables
- **Simplified Setup**: Reduce boilerplate code by 70%+

## Prerequisites

Before migrating, ensure you have:

1. Node.js 18+ installed
2. Monaco Editor >=0.50.0 as a peer dependency
3. Server-side capability to generate configuration bundles (PHP recommended)

## Step-by-Step Migration

### Step 1: Install Dependencies

**Before:**
```bash
npm install monaco-editor
```

**After:**
```bash
npm install php-script-monaco-editor monaco-editor
```

### Step 2: Update Import Statements

**Before:**
```typescript
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// Manual worker setup
window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  }
};
```

**After:**
```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Worker setup handled automatically
```

### Step 3: Update Editor Initialization

**Before (Raw Monaco):**
```typescript
// Manually register custom language
monaco.languages.register({ id: 'php-script' });

monaco.languages.setMonarchTokensProvider('php-script', {
  tokenizer: {
    root: [
      [/\b(if|else|for|while)\b/, 'keyword'],
      [/\b\w+\.\w+/, 'variable.predefined'],
      // ... many more rules
    ]
  },
  keywords: ['if', 'else', 'for', 'while'],
  operators: ['+', '-', '*', '/']
});

// Manually register completion provider
monaco.languages.registerCompletionItemProvider('php-script', {
  provideCompletionItems: (model, position) => {
    // Manual completion logic for functions
    const suggestions = [
      {
        label: 'strlen',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'strlen(',
        documentation: 'Get string length'
      },
      // ... many more functions
    ];
    return { suggestions };
  }
});

// Create editor
const editor = monaco.editor.create(
  document.getElementById('editor-container'),
  {
    value: 'user.name',
    language: 'php-script',
    theme: 'vs-dark'
  }
);

// Manually implement localStorage persistence
let autoSaveTimer;
editor.onDidChangeModelContent(() => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem('editor-content', editor.getValue());
  }, 500);
});

// Restore content on load
const savedContent = localStorage.getItem('editor-content');
if (savedContent) {
  editor.setValue(savedContent);
}
```

**After (php-script-monaco-editor):**
```typescript
// Configuration from server-side rendering
const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig, // From server
    initialValue: window.phpScriptInitialContent, // From server
    theme: 'vs-dark',
    enableContentPersistence: true // Auto-save handled automatically
  }
);

// That's it! Language, completions, and persistence are all configured
```

### Step 4: Server-Side Configuration Setup

Create a PHP endpoint or template that embeds configuration:

```php
<?php
// config-generator.php

function generateEditorConfig() {
    return [
        'languageDefinition' => [
            'languageId' => 'php-script',
            'monarchDefinition' => generateMonarchDefinition(),
            'fileExtensions' => ['.phs'],
            'mimeTypes' => ['text/x-php-script'],
            'configuration' => [
                'comments' => ['lineComment' => '//'],
                'brackets' => [['[', ']'], ['{', '}']],
                'autoClosingPairs' => [
                    ['open' => '{', 'close' => '}'],
                    ['open' => '[', 'close' => ']']
                ]
            ]
        ],
        'functionWhitelist' => [
            'functions' => getFunctions()
        ],
        'contextSchema' => [
            'variables' => getContextVariables()
        ],
        'bundleVersion' => '1.0.0',
        'compatibility' => [
            'minEditorVersion' => '1.0.0',
            'phpScriptEngine' => '2.5.0'
        ],
        'metadata' => [
            'generatedAt' => date('c'),
            'generatedBy' => 'config-generator',
            'environment' => getenv('APP_ENV') ?: 'production'
        ]
    ];
}

function generateMonarchDefinition() {
    return [
        'tokenizer' => [
            'root' => [
                [['regex' => '/\\b(if|else|for|while)\\b/', 'action' => 'keyword']],
                [['regex' => '/\\b\\w+\\.\\w+/', 'action' => 'variable']],
                [['regex' => '/"[^"]*"/', 'action' => 'string']],
                [['regex' => '/\\/\\/.*$/', 'action' => 'comment']]
            ]
        ],
        'keywords' => ['if', 'else', 'for', 'while', 'return', 'function'],
        'operators' => ['+', '-', '*', '/', '==', '!=', '<', '>']
    ];
}

function getFunctions() {
    return [
        [
            'name' => 'strlen',
            'signature' => [
                'parameters' => [
                    ['name' => 'string', 'type' => 'string', 'optional' => false]
                ],
                'returnType' => 'int'
            ],
            'documentation' => 'Returns the length of the given string',
            'category' => 'string'
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
            'documentation' => 'Returns a substring',
            'category' => 'string'
        ]
    ];
}

function getContextVariables() {
    return [
        [
            'name' => 'user',
            'type' => ['kind' => 'object', 'baseType' => 'User'],
            'properties' => [
                [
                    'name' => 'name',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'documentation' => 'User full name'
                ],
                [
                    'name' => 'email',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'documentation' => 'User email address'
                ],
                [
                    'name' => 'logins',
                    'type' => ['kind' => 'object', 'baseType' => 'LoginHistory'],
                    'properties' => [
                        [
                            'name' => 'count',
                            'type' => ['kind' => 'scalar', 'baseType' => 'int'],
                            'documentation' => 'Total login count'
                        ]
                    ],
                    'documentation' => 'Login history'
                ]
            ],
            'documentation' => 'Current user object'
        ],
        [
            'name' => 'request',
            'type' => ['kind' => 'object', 'baseType' => 'Request'],
            'properties' => [
                [
                    'name' => 'method',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'documentation' => 'HTTP method (GET, POST, etc.)'
                ],
                [
                    'name' => 'path',
                    'type' => ['kind' => 'scalar', 'baseType' => 'string'],
                    'documentation' => 'Request path'
                ]
            ],
            'documentation' => 'HTTP request object'
        ]
    ];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>PHP-Script Editor</title>
    <script>
        window.phpScriptEditorConfig = <?= json_encode(generateEditorConfig(), JSON_PRETTY_PRINT) ?>;
        window.phpScriptInitialContent = <?= json_encode('user.name') ?>;
    </script>
</head>
<body>
    <div id="editor-container" style="height: 600px;"></div>
    <script type="module" src="/path/to/your/app.js"></script>
</body>
</html>
```

## Configuration Changes

### Monaco Options

All Monaco editor options are still supported via the `monacoOptions` parameter:

**Before:**
```typescript
const editor = monaco.editor.create(container, {
  value: 'code',
  language: 'php-script',
  theme: 'vs-dark',
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on'
});
```

**After:**
```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,
  initialValue: window.phpScriptInitialContent,
  theme: 'vs-dark',
  monacoOptions: {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on'
  }
});
```

## API Differences

### Getting/Setting Content

**Before:**
```typescript
// Get value
const value = editor.getValue();

// Set value
editor.setValue('new code');
```

**After:**
```typescript
// Get value (same)
const value = editor.getValue();

// Set value (same, but also updates localStorage if enabled)
editor.setValue('new code');
```

### Content Persistence

**Before (Manual Implementation):**
```typescript
// Save to localStorage
localStorage.setItem('editor-content', editor.getValue());

// Load from localStorage
const saved = localStorage.getItem('editor-content');
if (saved) {
  editor.setValue(saved);
}

// Clear localStorage
localStorage.removeItem('editor-content');
```

**After (Built-in):**
```typescript
// Auto-save is enabled by default, no code needed

// Check if content has changed
if (editor.hasUnsavedChanges()) {
  console.log('Content modified');
}

// Revert to original content
editor.revertToOriginal();

// Clear localStorage
editor.clearLocalStorage();

// Get original server-provided content
const original = editor.getOriginalContent();
```

### Accessing Monaco Instance

**Before:**
```typescript
// Direct access
editor.layout();
editor.focus();
```

**After:**
```typescript
// Access via .monaco property
editor.monaco.layout();
editor.monaco.focus();
```

### Disposing Editor

**Before:**
```typescript
editor.dispose();
```

**After:**
```typescript
editor.dispose(); // Same, also cleans up persistence listeners
```

## Common Patterns

### Pattern 1: Confirm Before Navigation with Unsaved Changes

**Before:**
```typescript
let hasChanges = false;

editor.onDidChangeModelContent(() => {
  hasChanges = true;
});

window.addEventListener('beforeunload', (e) => {
  if (hasChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

**After:**
```typescript
window.addEventListener('beforeunload', (e) => {
  if (editor.hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

### Pattern 2: Manual Save to Server

**Before:**
```typescript
async function saveToServer() {
  const content = editor.getValue();
  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: { 'Content-Type': 'application/json' }
  });

  // Clear localStorage after successful save
  localStorage.removeItem('editor-content');
}
```

**After:**
```typescript
async function saveToServer() {
  const content = editor.getValue();
  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: { 'Content-Type': 'application/json' }
  });

  // Clear localStorage after successful save
  editor.clearLocalStorage();
}
```

### Pattern 3: Dynamic Configuration Updates

**Before:**
```typescript
// Re-register completion provider with new functions
monaco.languages.registerCompletionItemProvider('php-script', {
  provideCompletionItems: () => ({
    suggestions: newFunctionList
  })
});
```

**After:**
```typescript
// Update function whitelist dynamically
editor.updateFunctionWhitelist(newFunctionList);
```

### Pattern 4: Event Listeners

**Before:**
```typescript
// Monaco events
editor.onDidChangeModelContent(() => {
  console.log('Content changed');
});

editor.onDidChangeConfiguration(() => {
  console.log('Configuration changed');
});
```

**After:**
```typescript
// Monaco events (still available via .monaco)
editor.monaco.onDidChangeModelContent(() => {
  console.log('Content changed');
});

// New php-script-specific events
editor.onContentPersisted((content) => {
  console.log('Content auto-saved to localStorage');
});

editor.onConfigurationChanged((config) => {
  console.log('Configuration updated:', config.bundleVersion);
});

editor.onValidationError((error) => {
  console.error('Validation error:', error.message);
});
```

## Troubleshooting

### Issue: Type errors in TypeScript

**Problem:**
```
Property 'getValue' does not exist on type 'PhpScriptEditor'
```

**Solution:**
Ensure you're using the correct import and awaiting the async function:

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(container, options);
// Now editor.getValue() works
```

### Issue: Workers not loading

**Problem:**
Syntax highlighting doesn't work, console shows worker errors.

**Solution:**
Ensure your bundler (Vite/Webpack) is configured to handle workers:

**Vite:**
```javascript
// vite.config.js
export default {
  worker: {
    format: 'es'
  }
};
```

### Issue: Configuration validation fails

**Problem:**
`ConfigurationValidationError` thrown on initialization.

**Solution:**
Validate your configuration before passing to the editor:

```typescript
import { validateConfigurationBundle } from 'php-script-monaco-editor';

const result = validateConfigurationBundle(window.phpScriptEditorConfig);
if (!result.valid) {
  console.error('Configuration errors:', result.errors);
  // Fix configuration issues before proceeding
}
```

### Issue: Content not persisting

**Problem:**
Editor content resets after page reload despite `enableContentPersistence: true`.

**Solution:**
1. Check if localStorage is enabled in the browser
2. Verify no other code is clearing localStorage
3. Check browser console for persistence errors

```typescript
editor.onValidationError((error) => {
  if (error.code === 'CONTENT_PERSISTENCE_FAILED') {
    console.error('Persistence failed:', error.details);
  }
});
```

## Migration Checklist

- [ ] Install `php-script-monaco-editor` and `monaco-editor` dependencies
- [ ] Update import statements to use `createPhpScriptEditor`
- [ ] Create server-side configuration generator (PHP)
- [ ] Embed configuration in HTML via server-side rendering
- [ ] Update editor initialization code
- [ ] Remove manual Monarch language registration code
- [ ] Remove manual completion provider registration code
- [ ] Remove manual localStorage persistence code
- [ ] Update any code accessing Monaco instance (add `.monaco` property)
- [ ] Test all existing functionality
- [ ] Update tests to use new API
- [ ] Update documentation

## Next Steps

- Review the [API Contracts](./api-contracts.md) for complete type definitions
- Check the [Troubleshooting Guide](../README.md#troubleshooting) for common issues
- Explore [Examples](../examples/) for reference implementations

## Support

If you encounter issues during migration:

- Check the [GitHub Issues](https://github.com/your-org/php-script-monaco-editor/issues)
- Review the [API Documentation](./api-contracts.md)
- Consult the [README](../README.md)
