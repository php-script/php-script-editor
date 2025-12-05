# php-script-editor Examples

This directory contains working examples demonstrating how to use the php-script-editor package in different environments.

## Available Examples

### 1. TypeScript Example
**Location**: `./typescript/`

A complete TypeScript application showing:
- Editor initialization with type safety
- Server-side configuration integration
- Content persistence with localStorage
- Event handling (content changes, validation errors)
- Dynamic configuration updates

**Running the example:**
```bash
cd typescript
npm install
npm run dev
```

Then open http://localhost:5173

### 2. JavaScript (CommonJS) Example
**Location**: `./javascript/`

A vanilla JavaScript implementation demonstrating:
- CommonJS module usage
- Basic editor setup without TypeScript
- Manual configuration embedding
- Simple event listeners

**Running the example:**
```bash
cd javascript
npm install
npm run dev
```

### 3. Server-Side PHP Integration
**Location**: `./server-php/`

Complete PHP backend example showing:
- Configuration bundle generation from PHP
- Server-side rendering (SSR) pattern
- Function whitelist management
- Context variable schema generation
- Full integration with Apache/Nginx

**Running the example:**
```bash
cd server-php
php -S localhost:8000
```

Then open http://localhost:8000

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PHP 8.0+ (for server-php example)

### Installation

Each example has its own dependencies. Navigate to the example directory and run:

```bash
npm install
```

## Example Features Comparison

| Feature | TypeScript | JavaScript | PHP Server |
|---------|-----------|-----------|-----------|
| Type Safety | ✅ Full | ❌ None | N/A |
| SSR Config | ✅ | ✅ | ✅ (generates) |
| Persistence | ✅ | ✅ | ✅ |
| Events | ✅ All | ✅ Basic | N/A |
| Hot Reload | ✅ | ✅ | ✅ |
| Build Required | ✅ Vite | ✅ Vite | ❌ |

## Common Patterns Demonstrated

### Pattern 1: Basic Editor Setup

See: `typescript/main.ts` or `javascript/main.js`

```typescript
import { createPhpScriptEditor } from 'php-script-monaco-editor';

const editor = await createPhpScriptEditor(container, {
  configuration: window.phpScriptEditorConfig,
  initialValue: window.phpScriptInitialContent,
  theme: 'vs-dark'
});
```

### Pattern 2: Server-Side Configuration

See: `server-php/editor.php`

```php
<?php
$config = [
    'languageDefinition' => [...],
    'functionWhitelist' => [...],
    'contextSchema' => [...]
];
?>
<script>
window.phpScriptEditorConfig = <?= json_encode($config) ?>;
</script>
```

### Pattern 3: Content Persistence

See: `typescript/main.ts`

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  enableContentPersistence: true,
  storageKey: 'my-editor-content'
});

// Check for changes
if (editor.hasUnsavedChanges()) {
  // Warn user
}

// Revert to original
editor.revertToOriginal();
```

### Pattern 4: Event Handling

See: `typescript/main.ts`

```typescript
// Content persistence events
editor.onContentPersisted((content) => {
  console.log('Auto-saved');
});

// Validation errors
editor.onValidationError((error) => {
  console.error('Error:', error.message);
});

// Configuration changes
editor.onConfigurationChanged((config) => {
  console.log('Config updated:', config.bundleVersion);
});
```

## Customization

### Changing Editor Theme

All examples support theme customization:

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  theme: 'vs-dark' // or 'vs', 'hc-black'
});
```

### Custom Monaco Options

Pass additional Monaco options:

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  monacoOptions: {
    fontSize: 16,
    minimap: { enabled: false },
    lineNumbers: 'relative',
    wordWrap: 'on'
  }
});
```

### Custom Storage Key

Change the localStorage key:

```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  storageKey: 'custom-key-' + documentId
});
```

## Troubleshooting Examples

### Issue: Vite dev server port conflict

**Solution**: Change port in `vite.config.js`:

```javascript
export default {
  server: {
    port: 3000 // Change from default 5173
  }
};
```

### Issue: Module resolution errors

**Solution**: Ensure you're using the local package link:

```bash
cd examples/typescript
npm link ../../
```

### Issue: PHP server not serving files

**Solution**: Check PHP version and run from the correct directory:

```bash
php -v  # Should be 8.0+
cd examples/server-php
php -S localhost:8000
```

## Contributing Examples

To add a new example:

1. Create a new directory under `examples/`
2. Add package.json with dependencies
3. Create index.html and main entry file
4. Add README.md explaining the example
5. Update this main examples README.md

## Support

For questions about the examples:
- Check the main [README](../README.md)
- Review [API Contracts](../docs/api-contracts.md)
- See [Migration Guide](../docs/migration-guide.md)
- Open an [issue](https://github.com/your-org/php-script-monaco-editor/issues)
