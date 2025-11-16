# API Contracts: Dynamic Language Configuration

**Feature**: Dynamic Language Configuration
**Created**: 2025-11-16
**Version**: 1.0.0

## Overview

This document defines the TypeScript/JavaScript API contracts for the php-script Monaco Editor NPM package. All contracts follow TypeScript type definitions and are exported for both TypeScript and vanilla JavaScript consumers.

---

## 1. Editor Initialization API

### `createPhpScriptEditor(container, options?)`

Factory function to create and initialize a Monaco Editor instance pre-configured for php-script.

**Parameters**:
```typescript
interface CreateEditorOptions {
  /** Initial code content */
  value?: string;

  /** Editor theme (default: 'vs-dark') */
  theme?: 'vs' | 'vs-dark' | 'hc-black' | string;

  /** Configuration bundle (if not provided, will attempt to load from defaults) */
  configuration?: ConfigurationBundle;

  /** Configuration loader function (for lazy loading) */
  configurationLoader?: () => Promise<ConfigurationBundle>;

  /** Monaco editor options (passed through to Monaco) */
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;

  /** Enable configuration persistence in localStorage */
  enablePersistence?: boolean;

  /** Auto-load configuration on initialization */
  autoLoadConfiguration?: boolean;
}
```

**Returns**:
```typescript
Promise<PhpScriptEditor>
```

**Errors**:
- `EditorInitializationError` - When container element is invalid or Monaco fails to load
- `ConfigurationLoadError` - When configuration loading fails (if autoLoadConfiguration=true)

**Example Usage**:
```typescript
// TypeScript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(
  document.getElementById('editor-container'),
  {
    value: 'user.name',
    theme: 'vs-dark',
    autoLoadConfiguration: true,
    configurationLoader: async () => {
      const response = await fetch('/api/editor-config');
      return response.json();
    }
  }
);

// JavaScript (CommonJS)
const { createPhpScriptEditor } = require('php-script-monaco-editor');

createPhpScriptEditor(
  document.getElementById('editor-container'),
  { value: 'user.name', theme: 'vs-dark' }
).then(editor => {
  console.log('Editor ready');
});
```

---

## 2. Configuration Management API

### `PhpScriptEditor.loadConfiguration(bundle)`

Load and apply a configuration bundle to the editor.

**Parameters**:
```typescript
loadConfiguration(bundle: ConfigurationBundle): Promise<void>
```

**Returns**: Promise that resolves when configuration is applied

**Errors**:
- `ConfigurationValidationError` - When bundle validation fails
- `ConfigurationApplicationError` - When Monaco registration fails

**Example**:
```typescript
const config = await fetch('/api/editor-config').then(r => r.json());
await editor.loadConfiguration(config);
```

---

### `PhpScriptEditor.getConfiguration()`

Get the currently loaded configuration bundle.

**Returns**:
```typescript
getConfiguration(): ConfigurationBundle | null
```

**Example**:
```typescript
const currentConfig = editor.getConfiguration();
if (currentConfig) {
  console.log('Loaded version:', currentConfig.bundleVersion);
}
```

---

### `PhpScriptEditor.reloadConfiguration()`

Reload configuration from the configured loader or cache.

**Returns**:
```typescript
reloadConfiguration(): Promise<void>
```

**Errors**:
- `ConfigurationLoadError` - When no loader configured and cache is empty
- `ConfigurationValidationError` - When reloaded configuration is invalid

**Example**:
```typescript
// Reload after server-side configuration update
await editor.reloadConfiguration();
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

  /** Set editor value */
  setValue(value: string): void;

  /** Load configuration bundle */
  loadConfiguration(bundle: ConfigurationBundle): Promise<void>;

  /** Get current configuration */
  getConfiguration(): ConfigurationBundle | null;

  /** Reload configuration from loader or cache */
  reloadConfiguration(): Promise<void>;

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

class ConfigurationLoadError extends EditorError {
  code: 'CONFIG_LOAD_FAILED';
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

### `loadConfigurationFromURL(url)`

Helper to load configuration from a remote URL.

```typescript
function loadConfigurationFromURL(
  url: string,
  options?: RequestInit
): Promise<ConfigurationBundle>
```

**Example**:
```typescript
import { loadConfigurationFromURL } from 'php-script-monaco-editor';

const config = await loadConfigurationFromURL('/api/editor-config', {
  headers: { 'Authorization': 'Bearer token' }
});
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

## 8. Server-Side Integration Contract

Expected server endpoint structure for configuration delivery.

### GET /api/editor-config

**Response**: `ConfigurationBundle` (JSON)

**Headers**:
- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600` (optional, for caching)
- `ETag: "<bundle-version>"` (optional, for conditional requests)

**Example Response**:
```json
{
  "bundleVersion": "1.2.3",
  "languageDefinition": { ... },
  "functionWhitelist": { ... },
  "contextSchema": { ... },
  "compatibility": {
    "minEditorVersion": "1.0.0",
    "maxEditorVersion": null,
    "phpScriptEngine": "2.5.0"
  },
  "metadata": {
    "generatedAt": "2025-11-16T10:30:00Z",
    "generatedBy": "php-script-engine",
    "environment": "production"
  }
}
```

**Error Responses**:
- `404 Not Found` - Configuration not available
- `500 Internal Server Error` - Configuration generation failed
- `503 Service Unavailable` - Configuration service temporarily unavailable

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

**After** (php-script-monaco-editor):
```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(container, {
  value: 'user.name',
  configurationLoader: async () => {
    const res = await fetch('/api/editor-config');
    return res.json();
  }
});
```

**Benefits**:
- Automatic php-script language registration
- Pre-configured completion providers
- Built-in configuration validation
- Type-safe API
