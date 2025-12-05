# Troubleshooting Guide

Common issues and solutions for php-script-monaco-editor.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Editor Rendering Issues](#editor-rendering-issues)
- [Configuration Issues](#configuration-issues)
- [Content Persistence Issues](#content-persistence-issues)
- [Worker Issues](#worker-issues)
- [Type Definition Issues](#type-definition-issues)
- [Performance Issues](#performance-issues)
- [Build Issues](#build-issues)

---

## Installation Issues

### Issue: Peer dependency warning for monaco-editor

**Symptoms:**
```
npm WARN php-script-monaco-editor@1.0.0 requires a peer of monaco-editor@>=0.50.0 but none is installed
```

**Cause**: Monaco Editor is a peer dependency and must be installed separately.

**Solution:**
```bash
npm install monaco-editor
```

**Prevention**: Always install both packages together:
```bash
npm install php-script-monaco-editor monaco-editor
```

---

### Issue: Package not found after installation

**Symptoms:**
```
Error: Cannot find module 'php-script-monaco-editor'
```

**Cause**: Package not properly installed or incorrect import path.

**Solution:**
1. Verify installation:
```bash
npm list php-script-monaco-editor
```

2. Reinstall if necessary:
```bash
npm install php-script-monaco-editor
```

3. Check import statement:
```typescript
// Correct
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Incorrect
import { createPhpScriptEditor } from 'php-script-editor';
```

---

## Editor Rendering Issues

### Issue: Editor container is empty

**Symptoms**: Container div shows nothing, no error in console.

**Cause**: Container element has no height defined.

**Solution**: Ensure container has explicit height:

```css
#editor-container {
  height: 600px; /* Required */
  width: 100%;
}
```

Or use flexbox:

```css
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#editor-container {
  flex: 1; /* Takes remaining space */
}
```

---

### Issue: Editor appears but content is not visible

**Symptoms**: Editor renders but text is invisible or very small.

**Cause**: Theme or font size misconfiguration.

**Solution:**
```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  theme: 'vs-dark', // Ensure theme is set
  monacoOptions: {
    fontSize: 14, // Set explicit font size
    fontFamily: 'monospace'
  }
});
```

---

### Issue: Editor layout is broken after window resize

**Symptoms**: Editor doesn't resize with window.

**Cause**: `automaticLayout` option not enabled.

**Solution:**
```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  monacoOptions: {
    automaticLayout: true // Enable automatic resizing
  }
});
```

Or manually trigger layout:
```typescript
window.addEventListener('resize', () => {
  editor.monaco.layout();
});
```

---

## Configuration Issues

### Issue: ConfigurationValidationError on initialization

**Symptoms:**
```
ConfigurationValidationError: Configuration validation failed
```

**Cause**: Invalid or incomplete configuration bundle.

**Solution:** Validate configuration before using:

```typescript
import { validateConfigurationBundle } from 'php-script-monaco-editor';

const result = validateConfigurationBundle(window.phpScriptEditorConfig);

if (!result.valid) {
  console.error('Configuration errors:');
  result.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
  });
}
```

**Common validation errors:**

1. **Missing required fields**:
```json
{
  "field": "languageDefinition",
  "message": "Required field missing",
  "severity": "error"
}
```

Solution: Ensure all required fields are present in configuration bundle.

2. **Invalid semver**:
```json
{
  "field": "bundleVersion",
  "message": "Invalid semver format",
  "severity": "error"
}
```

Solution: Use valid semver: `"bundleVersion": "1.0.0"`

3. **Circular reference in context variables**:
```json
{
  "field": "contextSchema.variables.user.properties.parent",
  "message": "Circular reference detected",
  "severity": "error"
}
```

Solution: Remove circular references in context variable schema.

---

### Issue: Configuration not found (window.phpScriptEditorConfig undefined)

**Symptoms:**
```
TypeError: Cannot read property 'languageDefinition' of undefined
```

**Cause**: Configuration not embedded in HTML or script tag loaded after initialization.

**Solution:** Ensure configuration script tag comes before your application script:

```html
<head>
    <!-- Configuration FIRST -->
    <script>
        window.phpScriptEditorConfig = { ... };
    </script>
</head>
<body>
    <div id="editor-container"></div>

    <!-- Application SECOND -->
    <script type="module" src="/app.js"></script>
</body>
```

---

### Issue: Monarch tokenizer not working (no syntax highlighting)

**Symptoms**: Code appears as plain text without colors.

**Cause**: Invalid Monarch definition or regex patterns.

**Solution:** Check Monarch definition format:

```javascript
{
  "monarchDefinition": {
    "tokenizer": {
      "root": [
        // Correct format: array of [pattern, action] pairs
        { "regex": "\\b(if|else)\\b", "action": "keyword" }
      ]
    },
    "keywords": ["if", "else"],
    "operators": ["+", "-"]
  }
}
```

**Common mistakes:**

1. Forgot to escape backslashes in regex:
```javascript
// Wrong
{ "regex": "\b(if)\b", "action": "keyword" }

// Correct
{ "regex": "\\b(if)\\b", "action": "keyword" }
```

2. Invalid action format:
```javascript
// Wrong
{ "regex": "...", "action": ["keyword", "next"] }

// Correct
{ "regex": "...", "action": { "token": "keyword", "next": "@state" } }
```

---

## Content Persistence Issues

### Issue: Content not persisting across page reloads

**Symptoms**: Editor resets to initial value on page reload.

**Cause**: localStorage disabled or `enableContentPersistence` set to false.

**Solution:**

1. Check if persistence is enabled:
```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  enableContentPersistence: true // Ensure this is true (default)
});
```

2. Verify localStorage is available:
```javascript
if (typeof localStorage === 'undefined') {
  console.error('localStorage not available');
}
```

3. Check browser privacy settings (incognito mode may block localStorage).

---

### Issue: localStorage quota exceeded

**Symptoms:**
```
ContentPersistenceError: Content persistence failed
details: { reason: 'QUOTA_EXCEEDED' }
```

**Cause**: Browser localStorage limit reached (typically 5-10MB).

**Solution:** Listen for quota errors and warn user:

```typescript
editor.onValidationError((error) => {
  if (error.code === 'CONTENT_PERSISTENCE_FAILED' &&
      error.details.reason === 'QUOTA_EXCEEDED') {
    alert('Storage quota exceeded. Content will not be auto-saved. Please save to server.');

    // Disable persistence
    editor.clearLocalStorage();
  }
});
```

**Prevention:** Implement server-side saving:

```typescript
async function saveToServer() {
  const content = editor.getValue();

  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: { 'Content-Type': 'application/json' }
  });

  // Clear localStorage after successful server save
  editor.clearLocalStorage();
}
```

---

### Issue: Corrupted localStorage data

**Symptoms:** Editor fails to initialize with corrupted data error.

**Cause**: Invalid JSON in localStorage.

**Solution:** The editor handles this automatically by discarding corrupted data. If issues persist:

```typescript
// Manually clear localStorage
localStorage.removeItem('php-script-editor-content-' + pageUrl);

// Or use editor API
editor.clearLocalStorage();
```

---

### Issue: Content persistence conflicts in multiple tabs

**Symptoms**: Content changes lost when working in multiple tabs.

**Cause**: Last write wins by design (expected behavior).

**Solution:** This is intentional behavior. To avoid conflicts:

1. Warn users about multiple tabs:
```typescript
// Detect multiple tabs
const tabId = sessionStorage.getItem('tabId') || Math.random().toString();
sessionStorage.setItem('tabId', tabId);

window.addEventListener('storage', (e) => {
  if (e.key === editor.storageKey && e.oldValue !== e.newValue) {
    if (confirm('Content changed in another tab. Reload to sync?')) {
      location.reload();
    }
  }
});
```

2. Implement server-side locking for collaborative editing.

---

## Worker Issues

### Issue: Workers failing to load

**Symptoms:**
```
Failed to load worker script
```

**Cause**: Worker configuration not set up correctly.

**Solution for Vite:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es' // Use ES module workers
  }
});
```

**Solution for Webpack:**

```javascript
// webpack.config.js
module.exports = {
  output: {
    globalObject: 'self'
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  }
};
```

---

### Issue: CSP (Content Security Policy) blocking workers

**Symptoms:**
```
Refused to create a worker from 'blob:...' because it violates the following Content Security Policy directive
```

**Cause**: CSP policy blocking inline workers.

**Solution:** Update CSP headers to allow workers:

```http
Content-Security-Policy: worker-src 'self' blob:;
```

Or use external worker files instead of blob URLs.

---

## Type Definition Issues

### Issue: TypeScript cannot find type definitions

**Symptoms:**
```
Could not find a declaration file for module 'php-script-monaco-editor'
```

**Cause**: Type definitions not properly exported.

**Solution:**

1. Check package exports in package.json include types:
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

2. Clear TypeScript cache:
```bash
rm -rf node_modules/.cache
npm install
```

3. Explicitly reference types in tsconfig.json:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "types": ["php-script-monaco-editor"]
  }
}
```

---

### Issue: Type mismatch errors

**Symptoms:**
```
Type 'PhpScriptEditor' is not assignable to type '...'
```

**Cause**: Version mismatch between package and type definitions.

**Solution:**

1. Ensure consistent versions:
```bash
npm list php-script-monaco-editor monaco-editor
```

2. Reinstall dependencies:
```bash
npm install php-script-monaco-editor@latest monaco-editor@latest
```

---

## Performance Issues

### Issue: Slow syntax highlighting

**Symptoms**: Editor lags when typing, highlighting takes >100ms.

**Cause**: Complex or inefficient Monarch regex patterns.

**Solution:** Optimize Monarch tokenizer:

```javascript
// Bad: Catastrophic backtracking
{ "regex": "(.*)*", "action": "string" }

// Good: Bounded matching
{ "regex": "[^\"]*", "action": "string" }
```

**Profiling:** Enable performance monitoring:

```typescript
editor.monaco.onDidChangeModelContent(() => {
  const start = performance.now();
  // ... highlighting happens automatically
  const end = performance.now();

  if (end - start > 100) {
    console.warn(`Slow highlighting: ${end - start}ms`);
  }
});
```

---

### Issue: Large file performance degradation

**Symptoms**: Editor becomes unresponsive with files >10,000 lines.

**Cause**: Monaco has performance limits for very large files.

**Solution:**

1. Enable performance optimizations:
```typescript
const editor = await createPhpScriptEditor(container, {
  configuration: config,
  monacoOptions: {
    wordWrap: 'off', // Disable word wrap
    folding: true, // Enable code folding
    renderValidationDecorations: 'on' // Reduce decorations
  }
});
```

2. Consider pagination or virtual scrolling for extremely large files.

---

### Issue: High memory usage

**Symptoms**: Browser tab using excessive memory.

**Cause**: Editor not disposed properly or memory leaks.

**Solution:**

1. Dispose editor when unmounting:
```typescript
window.addEventListener('beforeunload', () => {
  editor.dispose();
});
```

2. Clear event listeners:
```typescript
const disposable = editor.onContentPersisted(() => {
  // ...
});

// When done
disposable.dispose();
```

---

## Build Issues

### Issue: Build fails with module resolution errors

**Symptoms:**
```
Cannot resolve module 'php-script-monaco-editor'
```

**Cause**: Incorrect module resolution strategy.

**Solution:**

For TypeScript projects:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "esModuleInterop": true
  }
}
```

For Vite:
```javascript
export default {
  resolve: {
    alias: {
      'php-script-monaco-editor': 'php-script-monaco-editor/dist/index.mjs'
    }
  }
};
```

---

### Issue: Duplicate Monaco editor in bundle

**Symptoms**: Bundle size is unexpectedly large (>10MB).

**Cause**: Monaco Editor bundled multiple times.

**Solution:** Ensure Monaco is external in build config:

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      external: ['monaco-editor']
    }
  }
};
```

```javascript
// webpack.config.js
module.exports = {
  externals: {
    'monaco-editor': 'monaco'
  }
};
```

---

### Issue: Tree-shaking not working

**Symptoms**: Final bundle includes unused code.

**Cause**: Using CommonJS imports or incorrect module configuration.

**Solution:**

1. Use ES module imports:
```typescript
// Good
import { createPhpScriptEditor } from 'php-script-monaco-editor';

// Bad (prevents tree-shaking)
const { createPhpScriptEditor } = require('php-script-monaco-editor');
```

2. Configure bundler for tree-shaking:
```javascript
// vite.config.js
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
};
```

---

## Getting More Help

If your issue isn't covered here:

1. Check the [API Documentation](./api-contracts.md)
2. Review [Migration Guide](./migration-guide.md)
3. Search [GitHub Issues](https://github.com/your-org/php-script-monaco-editor/issues)
4. Open a new issue with:
   - Browser and version
   - Package versions (`npm list`)
   - Minimal reproduction code
   - Error messages and console logs

---

## Common Error Messages Reference

| Error Code | Message | Solution |
|-----------|---------|----------|
| `EDITOR_INIT_FAILED` | Editor initialization failed | Check container element exists and has height |
| `CONFIG_VALIDATION_FAILED` | Configuration validation failed | Use `validateConfigurationBundle()` to find issues |
| `CONFIG_APPLICATION_FAILED` | Configuration application failed | Check Monarch definition format |
| `CONTENT_PERSISTENCE_FAILED` | Content persistence failed | Check localStorage availability and quota |

---

**Last Updated**: 2025-01-15
