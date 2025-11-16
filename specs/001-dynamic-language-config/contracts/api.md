# API Contracts: Dynamic Language Configuration

**Feature**: Dynamic Language Configuration
**Created**: 2025-11-16
**Version**: 1.0.0

## Overview

This document defines the TypeScript/JavaScript API contracts for the php-script Monaco Editor NPM package. All contracts follow TypeScript type definitions and are exported for both TypeScript and vanilla JavaScript consumers.

---

## 1. Editor Initialization API

### `createPhpScriptEditor(container, options?)`

Factory function to create and initialize a Monaco Editor instance pre-configured for php-script. Configuration is received from server-side rendered JavaScript object (not fetched via AJAX). Editor content is automatically persisted to localStorage and restored on page load.

**Parameters**:
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

**Returns**:
```typescript
Promise<PhpScriptEditor>
```

**Errors**:
- `EditorInitializationError` - When container element is invalid or Monaco fails to load
- `ConfigurationValidationError` - When configuration bundle validation fails

**Example Usage**:
```typescript
// TypeScript - Configuration from server-side rendering
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Server-side PHP embeds configuration in HTML:
// <script>
//   window.phpScriptEditorConfig = { ... };
//   window.phpScriptInitialContent = "user.name";
// </script>

const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig,  // From server-side rendering
    initialValue: window.phpScriptInitialContent, // From server (may be overridden by localStorage)
    theme: 'vs-dark',
    enableContentPersistence: true // Auto-save to localStorage
  }
);

// JavaScript (CommonJS)
const { createPhpScriptEditor } = require('php-script-monaco-editor');

createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    configuration: window.phpScriptEditorConfig,
    initialValue: window.phpScriptInitialContent,
    theme: 'vs-dark'
  }
).then(editor => {
  console.log('Editor ready, content auto-saves to localStorage');
});
```

---

## 2. Content Persistence API

### `PhpScriptEditor.getConfiguration()`

Get the currently loaded configuration bundle that was provided during initialization.

**Returns**:
```typescript
getConfiguration(): ConfigurationBundle
```

**Example**:
```typescript
const currentConfig = editor.getConfiguration();
console.log('Loaded version:', currentConfig.bundleVersion);
```

---

### `PhpScriptEditor.revertToOriginal()`

Discard locally saved content and restore the server-provided initial content.

**Returns**:
```typescript
revertToOriginal(): void
```

**Behavior**:
- Clears localStorage entry for this editor instance
- Restores the `initialValue` provided during editor initialization
- Triggers content change event

**Example**:
```typescript
// User wants to discard local changes
editor.revertToOriginal();
console.log('Reverted to server-provided content');
```

---

### `PhpScriptEditor.hasUnsavedChanges()`

Check if current editor content differs from the server-provided initial content.

**Returns**:
```typescript
hasUnsavedChanges(): boolean
```

**Example**:
```typescript
if (editor.hasUnsavedChanges()) {
  const confirm = window.confirm('You have unsaved changes. Continue?');
  if (confirm) {
    editor.revertToOriginal();
  }
}
```

---

### `PhpScriptEditor.clearLocalStorage()`

Manually clear the localStorage entry for this editor without changing editor content.

**Returns**:
```typescript
clearLocalStorage(): void
```

**Use Case**: Clear persisted content without reverting editor (e.g., before saving to server)

**Example**:
```typescript
// After successfully saving to server
await saveToServer(editor.getValue());
editor.clearLocalStorage(); // Clear local cache
```

---

### `PhpScriptEditor.getOriginalContent()`

Get the server-provided initial content (before any user edits).

**Returns**:
```typescript
getOriginalContent(): string
```

**Example**:
```typescript
const original = editor.getOriginalContent();
const current = editor.getValue();
console.log('Content changed:', original !== current);
```

---

## 3. Configuration Bundle Types

### ConfigurationBundle

Complete configuration package for the editor.

```typescript
interface ConfigurationBundle {
  languageDefinition: LanguageDefinition;
  functionWhitelist: FunctionWhitelist;
  contextSchema: ContextVariableSchema;
  bundleVersion: string; // semver
  compatibility: CompatibilityInfo;
  metadata: ConfigMetadata;
}

interface CompatibilityInfo {
  minEditorVersion: string; // semver
  maxEditorVersion?: string; // semver or null
  phpScriptEngine: string; // version of server-side engine
}

interface ConfigMetadata {
  generatedAt: string; // ISO 8601 timestamp
  generatedBy: string;
  environment: string; // e.g., 'production', 'staging'
}
```

---

### LanguageDefinition

Monarch language definition for php-script syntax.

```typescript
interface LanguageDefinition {
  languageId: string; // e.g., 'php-script'
  monarchDefinition: MonarchLanguageDefinition;
  fileExtensions: string[]; // e.g., ['.phs', '.phpscript']
  mimeTypes: string[]; // e.g., ['text/x-php-script']
  configuration: LanguageConfiguration;
}

interface MonarchLanguageDefinition {
  tokenizer: Record<string, MonarchRule[]>;
  keywords: string[];
  operators: string[];
  symbols: string; // RegExp pattern as string
  escapes: string; // RegExp pattern as string
  brackets?: BracketDefinition[];
}

interface MonarchRule {
  regex: string | RegExp;
  action: string | MonarchAction | (string | MonarchAction)[];
}

interface MonarchAction {
  token?: string;
  next?: string;
  nextEmbedded?: string;
  log?: string;
}

interface LanguageConfiguration {
  comments?: {
    lineComment?: string;
    blockComment?: [string, string];
  };
  brackets?: string[][];
  autoClosingPairs?: Array<{ open: string; close: string; notIn?: string[] }>;
  surroundingPairs?: Array<{ open: string; close: string }>;
  indentationRules?: {
    increaseIndentPattern?: string; // RegExp pattern
    decreaseIndentPattern?: string; // RegExp pattern
  };
}

interface BracketDefinition {
  open: string;
  close: string;
  token: string;
}
```

---

### FunctionWhitelist

Whitelisted PHP functions available in php-script.

```typescript
interface FunctionWhitelist {
  functions: FunctionDefinition[];
  version: string; // semver
  namespace?: string; // default: 'global'
}

interface FunctionDefinition {
  name: string;
  signature: FunctionSignature;
  documentation: string; // Markdown format
  category: string; // e.g., 'string', 'array', 'date'
  deprecated?: boolean;
  since?: string; // version added
}

interface FunctionSignature {
  parameters: Parameter[];
  returnType: string;
}

interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}
```

---

### ContextVariableSchema

Runtime context variables and their structure.

```typescript
interface ContextVariableSchema {
  variables: ContextVariable[];
  version: string; // semver
  strict?: boolean; // default: true
}

interface ContextVariable {
  name: string;
  type: VariableType;
  properties?: PropertyDefinition[];
  methods?: MethodDefinition[];
  documentation: string;
  nullable?: boolean;
}

interface VariableType {
  kind: 'object' | 'array' | 'scalar' | 'callable';
  baseType: string; // e.g., 'User', 'Request', 'string'
}

interface PropertyDefinition {
  name: string;
  type: VariableType;
  readonly?: boolean;
  documentation: string;
}

interface MethodDefinition {
  name: string;
  signature: FunctionSignature;
  documentation: string;
}
```

---

## 4. Editor Instance API

### PhpScriptEditor

The main editor instance returned by `createPhpScriptEditor`.

```typescript
interface PhpScriptEditor {
  /** Underlying Monaco editor instance */
  readonly monaco: monaco.editor.IStandaloneCodeEditor;

  /** Get current editor value */
  getValue(): string;

  /** Set editor value (also updates localStorage if persistence enabled) */
  setValue(value: string): void;

  /** Get current configuration bundle */
  getConfiguration(): ConfigurationBundle;

  /** Revert to server-provided initial content (discards localStorage) */
  revertToOriginal(): void;

  /** Check if content differs from server-provided initial value */
  hasUnsavedChanges(): boolean;

  /** Clear localStorage without changing editor content */
  clearLocalStorage(): void;

  /** Get server-provided initial content */
  getOriginalContent(): string;

  /** Update function whitelist (partial update) */
  updateFunctionWhitelist(functions: FunctionDefinition[]): void;

  /** Update context schema (partial update) */
  updateContextSchema(variables: ContextVariable[]): void;

  /** Dispose editor and cleanup resources */
  dispose(): void;

  /** Event emitter for configuration changes */
  onConfigurationChanged(listener: (config: ConfigurationBundle) => void): monaco.IDisposable;

  /** Event emitter for validation errors */
  onValidationError(listener: (error: EditorError) => void): monaco.IDisposable;

  /** Event emitter for content persistence events */
  onContentPersisted(listener: (content: string) => void): monaco.IDisposable;
}
```

---

## 5. Error Types

```typescript
class EditorError extends Error {
  code: string;
  details?: any;
}

class EditorInitializationError extends EditorError {
  code: 'EDITOR_INIT_FAILED';
}

class ConfigurationValidationError extends EditorError {
  code: 'CONFIG_VALIDATION_FAILED';
  details: {
    field: string;
    message: string;
    value: any;
  }[];
}

class ConfigurationApplicationError extends EditorError {
  code: 'CONFIG_APPLICATION_FAILED';
}

class ContentPersistenceError extends EditorError {
  code: 'CONTENT_PERSISTENCE_FAILED';
  details: {
    reason: 'QUOTA_EXCEEDED' | 'STORAGE_UNAVAILABLE' | 'CORRUPTED_DATA';
    storageKey: string;
  };
}
```

---

## 6. Utility Functions

### `validateConfigurationBundle(bundle)`

Validate a configuration bundle without loading it.

```typescript
function validateConfigurationBundle(
  bundle: unknown
): { valid: boolean; errors: ValidationError[] }

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

**Example**:
```typescript
import { validateConfigurationBundle } from 'php-script-monaco-editor';

const result = validateConfigurationBundle(configData);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

## 7. Advanced Configuration API

### Partial Configuration Updates

Allow updating specific parts of configuration without reloading the entire bundle.

```typescript
interface PhpScriptEditor {
  /** Update only function whitelist */
  updateFunctionWhitelist(functions: FunctionDefinition[]): void;

  /** Update only context schema */
  updateContextSchema(variables: ContextVariable[]): void;

  /** Update only Monarch definition */
  updateLanguageDefinition(definition: LanguageDefinition): Promise<void>;
}
```

---

## 8. Server-Side Rendering Contract

Expected structure for server-side PHP to embed configuration in HTML.

### Server-Side PHP Example

PHP backend should embed configuration bundle as a JavaScript object in the HTML page:

```php
<?php
// Generate configuration bundle
$configBundle = [
    'languageDefinition' => $monarchDefinition,
    'functionWhitelist' => $whitelist,
    'contextSchema' => $contextSchema,
    'bundleVersion' => '1.0.0',
    'compatibility' => [
        'minEditorVersion' => '1.0.0',
        'phpScriptEngine' => '2.5.0'
    ],
    'metadata' => [
        'generatedAt' => date('c'),
        'generatedBy' => 'php-script-engine',
        'environment' => getenv('APP_ENV')
    ]
];

$initialContent = 'user.name'; // Optional server-provided content
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
    <div id="editor-container"></div>
    <script type="module">
        import { createPhpScriptEditor } from 'php-script-monaco-editor';

        const editor = await createPhpScriptEditor(
            document.getElementById('editor-container'),
            {
                configuration: window.phpScriptEditorConfig,
                initialValue: window.phpScriptInitialContent,
                theme: 'vs-dark'
            }
        );
    </script>
</body>
</html>
```

**Key Requirements**:
- Configuration MUST be embedded as a JavaScript object in the HTML page
- Configuration MUST NOT be fetched via AJAX
- Configuration bundle MUST contain all three components (language, whitelist, schema)
- Initial content is optional and can be overridden by localStorage

---

## 9. Compatibility Matrix

| Editor Version | Supported Config Version | Monaco Version |
|---------------|--------------------------|----------------|
| 1.0.x         | 1.x.x                    | 0.45.x         |
| 1.1.x         | 1.x.x - 2.x.x            | 0.45.x - 0.46.x |
| 2.0.x         | 2.x.x                    | 0.47.x+        |

---

## 10. Migration Guide

### From Raw Monaco to php-script-monaco-editor

**Before** (Raw Monaco):
```typescript
import * as monaco from 'monaco-editor';

const editor = monaco.editor.create(container, {
  value: 'user.name',
  language: 'javascript' // Wrong language
});
```

**After** (php-script-monaco-editor with SSR):
```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Server-side PHP embeds configuration in HTML:
// <script>
//   window.phpScriptEditorConfig = { ... };
//   window.phpScriptInitialContent = "user.name";
// </script>

const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,  // From server-side rendering
  initialValue: window.phpScriptInitialContent, // From server (or localStorage)
  theme: 'vs-dark'
});
```

**Benefits**:
- Automatic php-script language registration
- Pre-configured completion providers for whitelisted functions and context variables
- Built-in configuration validation
- Automatic content persistence to localStorage
- Type-safe API
- No AJAX requests needed (faster initialization)
