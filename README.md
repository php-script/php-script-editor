# php-script-editor

[![npm version](https://img.shields.io/npm/v/php-script-monaco-editor.svg)](https://www.npmjs.com/package/php-script-monaco-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Pre-configured [Monaco Editor](https://microsoft.github.io/monaco-editor/) for php-script language with server-side rendered configuration support, automatic content persistence, and intelligent code completion.

## Features

- **Custom php-script Syntax Highlighting**: Built-in Monarch language definition for php-script syntax (dot notation, no $ prefix)
- **Intelligent Code Completion**: Context-aware suggestions for whitelisted functions and runtime variables
- **Server-Side Configuration**: Configuration delivered via server-side rendering (no AJAX required)
- **Automatic Content Persistence**: Auto-save to localStorage with revert functionality
- **TypeScript Support**: Full type definitions included
- **Dual Module Format**: Supports both ES modules and CommonJS
- **Browser Compatibility**: Works in Chrome, Firefox, Safari, and Edge (latest 2 versions)
- **Lightweight**: <500KB total bundle size with tree-shaking support

## Installation

```bash
npm install php-script-monaco-editor monaco-editor
```

**Note**: `monaco-editor` is a peer dependency and must be installed separately.

## Quick Start

### 1. Server-Side Setup (PHP)

First, embed your configuration in the HTML page:

```php
<?php
// Generate configuration bundle
$configBundle = [
    'languageDefinition' => [
        'languageId' => 'php-script',
        'monarchDefinition' => [
            'tokenizer' => [
                'root' => [
                    [['regex' => '/\\b(if|else|for|while)\\b/', 'action' => 'keyword']],
                    [['regex' => '/\\b\\w+\\.\\w+/', 'action' => 'variable']],
                    // ... more tokenizer rules
                ]
            ],
            'keywords' => ['if', 'else', 'for', 'while'],
            'operators' => ['+', '-', '*', '/'],
            // ... more language config
        ],
        'fileExtensions' => ['.phs'],
        'mimeTypes' => ['text/x-php-script'],
        'configuration' => [
            'comments' => [
                'lineComment' => '//',
                'blockComment' => ['/*', '*/']
            ],
            'brackets' => [['[', ']'], ['{', '}'], ['(', ')']],
            'autoClosingPairs' => [
                ['open' => '{', 'close' => '}'],
                ['open' => '[', 'close' => ']'],
                ['open' => '(', 'close' => ')'],
                ['open' => '"', 'close' => '"']
            ]
        ]
    ],
    'functionWhitelist' => [
        'functions' => [
            [
                'name' => 'strlen',
                'signature' => [
                    'parameters' => [
                        ['name' => 'string', 'type' => 'string', 'optional' => false]
                    ],
                    'returnType' => 'int'
                ],
                'documentation' => 'Get string length',
                'category' => 'string'
            ],
            // ... more functions
        ]
    ],
    'contextSchema' => [
        'variables' => [
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
            ]
        ]
    ],
    'bundleVersion' => '1.0.0',
    'compatibility' => [
        'minEditorVersion' => '1.0.0',
        'phpScriptEngine' => '2.5.0'
    ],
    'metadata' => [
        'generatedAt' => date('c'),
        'generatedBy' => 'php-script-engine',
        'environment' => getenv('APP_ENV') ?: 'production'
    ]
];

$initialContent = 'user.name'; // Optional initial content
?>
<!DOCTYPE html>
<html>
<head>
    <title>PHP-Script Editor</title>
    <script>
        // Embed configuration in window object
        window.phpScriptEditorConfig = <?= json_encode($configBundle, JSON_PRETTY_PRINT) ?>;
        window.phpScriptInitialContent = <?= json_encode($initialContent) ?>;
    </script>
</head>
<body>
    <div id="editor-container" style="height: 600px;"></div>
    <!-- Load your JavaScript bundle here -->
    <script type="module" src="/path/to/your/app.js"></script>
</body>
</html>
```

### 2. Client-Side Setup (TypeScript/JavaScript)

#### TypeScript

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Configuration comes from server-side rendering (window object)
const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig,
    initialValue: window.phpScriptInitialContent,
    theme: 'vs-dark',
    enableContentPersistence: true // Auto-save to localStorage
  }
);

// Use the editor
console.log('Current value:', editor.getValue());

// Listen to content changes
editor.monaco.onDidChangeModelContent(() => {
  console.log('Content changed, auto-saved to localStorage');
});
```

#### JavaScript (CommonJS)

```javascript
const { createPhpScriptEditor } = require('php-script-monaco-editor');

createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig,
    initialValue: window.phpScriptInitialContent,
    theme: 'vs-dark'
  }
).then(editor => {
  console.log('Editor ready!');
});
```

## API Reference

### `createPhpScriptEditor(container, options)`

Creates and initializes a Monaco Editor instance pre-configured for php-script.

**Parameters:**

- `container: HTMLElement` - DOM element to mount the editor
- `options: CreateEditorOptions` - Editor configuration options

**Returns:** `Promise<PhpScriptEditor>`

**Options:**

```typescript
interface CreateEditorOptions {
  /** Server-provided initial code content (can be overridden by localStorage) */
  initialValue?: string;

  /** Editor theme (default: 'vs-dark') */
  theme?: 'vs' | 'vs-dark' | 'hc-black' | string;

  /** Configuration bundle from server-side rendering (embedded in window object) */
  configuration: ConfigurationBundle;

  /** Monaco editor options (passed through to Monaco) */
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;

  /** Enable content persistence in localStorage (default: true) */
  enableContentPersistence?: boolean;

  /** localStorage key for content persistence (default: auto-generated from page URL) */
  storageKey?: string;
}
```

### `PhpScriptEditor` Instance Methods

#### Content Management

- `getValue(): string` - Get current editor content
- `setValue(value: string): void` - Set editor content (updates localStorage if enabled)
- `getOriginalContent(): string` - Get server-provided initial content
- `hasUnsavedChanges(): boolean` - Check if content differs from original

#### Persistence Control

- `revertToOriginal(): void` - Discard local changes and restore original content
- `clearLocalStorage(): void` - Clear localStorage without changing editor content

#### Configuration Management

- `getConfiguration(): ConfigurationBundle` - Get current configuration bundle
- `updateFunctionWhitelist(functions: FunctionDefinition[]): void` - Update function whitelist
- `updateContextSchema(variables: ContextVariable[]): void` - Update context schema

#### Event Handlers

- `onConfigurationChanged(listener): Disposable` - Listen to configuration changes
- `onValidationError(listener): Disposable` - Listen to validation errors
- `onContentPersisted(listener): Disposable` - Listen to content persistence events

#### Cleanup

- `dispose(): void` - Dispose editor and cleanup resources

### Example: Using Events

```typescript
const editor = await createPhpScriptEditor(container, options);

// Listen to configuration changes
editor.onConfigurationChanged((config) => {
  console.log('Configuration updated:', config.bundleVersion);
});

// Listen to validation errors
editor.onValidationError((error) => {
  console.error('Validation error:', error.message);
});

// Listen to content persistence
editor.onContentPersisted((content) => {
  console.log('Content saved to localStorage');
});
```

## Advanced Usage

### Custom Storage Key

By default, the storage key is auto-generated from the page URL. You can provide a custom key:

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,
  storageKey: 'my-custom-script-editor',
  enableContentPersistence: true
});
```

### Disabling Content Persistence

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,
  enableContentPersistence: false // Disable auto-save
});
```

### Accessing Underlying Monaco Instance

```typescript
const editor = await createPhpScriptEditor(container, options);

// Access Monaco editor directly
const monacoEditor = editor.monaco;

// Use Monaco API
monacoEditor.layout();
monacoEditor.focus();
```

### Dynamic Configuration Updates

```typescript
// Update function whitelist without reloading
editor.updateFunctionWhitelist([
  {
    name: 'substr',
    signature: {
      parameters: [
        { name: 'string', type: 'string', optional: false },
        { name: 'start', type: 'int', optional: false },
        { name: 'length', type: 'int', optional: true }
      ],
      returnType: 'string'
    },
    documentation: 'Extract substring',
    category: 'string'
  }
]);

// Update context schema
editor.updateContextSchema([
  {
    name: 'request',
    type: { kind: 'object', baseType: 'Request' },
    properties: [
      {
        name: 'method',
        type: { kind: 'scalar', baseType: 'string' },
        documentation: 'HTTP method'
      }
    ],
    documentation: 'HTTP request object'
  }
]);
```

## Configuration Structure

### ConfigurationBundle

```typescript
interface ConfigurationBundle {
  languageDefinition: LanguageDefinition;
  functionWhitelist: FunctionWhitelist;
  contextSchema: ContextVariableSchema;
  bundleVersion: string; // semver
  compatibility: {
    minEditorVersion: string;
    maxEditorVersion?: string;
    phpScriptEngine: string;
  };
  metadata: {
    generatedAt: string; // ISO 8601
    generatedBy: string;
    environment: string;
  };
}
```

See [API Contracts](./docs/api-contracts.md) for complete type definitions.

## Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | Latest 2 versions |
| Firefox | Latest 2 versions |
| Safari  | Latest 2 versions |
| Edge    | Latest 2 versions |

## Performance

- **Initial Load**: <2 seconds
- **Keystroke Latency**: <16ms
- **Syntax Highlighting**: <100ms
- **Bundle Size**: <500KB total (with tree-shaking)
- **Core Package**: ~50KB (gzipped)

## Migration Guide

### From Raw Monaco Editor

**Before:**
```typescript
import * as monaco from 'monaco-editor';

const editor = monaco.editor.create(container, {
  value: 'user.name',
  language: 'javascript' // Wrong language
});
```

**After:**
```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,
  initialValue: window.phpScriptInitialContent,
  theme: 'vs-dark'
});
```

**Benefits:**
- Automatic php-script language registration
- Pre-configured completion providers
- Built-in configuration validation
- Automatic content persistence
- Type-safe API

## Troubleshooting

### Editor not rendering

**Problem**: Editor container is empty or shows nothing.

**Solution**: Ensure the container has a defined height:

```css
#editor-container {
  height: 600px; /* Required */
}
```

### Configuration validation errors

**Problem**: `ConfigurationValidationError` thrown on initialization.

**Solution**: Validate your configuration bundle:

```typescript
import { validateConfigurationBundle } from 'php-script-monaco-editor';

const result = validateConfigurationBundle(window.phpScriptEditorConfig);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### localStorage quota exceeded

**Problem**: Content not saving due to storage quota.

**Solution**: The editor handles this gracefully and continues editing without persistence. Consider:

```typescript
editor.onValidationError((error) => {
  if (error.code === 'CONTENT_PERSISTENCE_FAILED' &&
      error.details.reason === 'QUOTA_EXCEEDED') {
    alert('Storage quota exceeded. Content will not be auto-saved.');
  }
});
```

### Workers not loading

**Problem**: Syntax highlighting not working, console shows worker errors.

**Solution**: Ensure Monaco workers are properly configured in your build tool. For Vite:

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es'
  }
});
```

### Content not persisting across page reloads

**Problem**: Editor content resets to original value on reload.

**Solution**: Verify `enableContentPersistence` is set to `true` (default) and check browser localStorage is enabled.

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/php-script-monaco-editor.git
cd php-script-monaco-editor

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint and format
npm run lint
npm run format
```

### Running Examples

```bash
# Start development server with examples
npm run dev

# Open http://localhost:5173 in your browser
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Credits

Built on top of [Monaco Editor](https://microsoft.github.io/monaco-editor/) by Microsoft.

## Support

- [GitHub Issues](https://github.com/your-org/php-script-monaco-editor/issues)
- [Documentation](https://github.com/your-org/php-script-monaco-editor/docs)
- [API Reference](./docs/api-contracts.md)

---

**Note**: This package is specifically designed for the php-script language and requires server-side configuration delivery. It is not a general-purpose Monaco wrapper.
