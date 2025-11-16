# NPM Package Wrapping Monaco Editor with Custom Language Support: Best Practices Research

## Overview

This document consolidates current best practices (2024-2025) for creating an NPM package that wraps Monaco Editor with custom language definitions, completion providers, and optimized bundling. Research was conducted through web searches, official documentation, and analysis of community projects.

---

## 1. Monaco Editor Integration

### Decision

Use **Vite as the primary bundler** with native ESM support, combined with the **`monaco-editor-workers` package** (or TypeFox's `monaco-editor-wrapper` for advanced use cases) to handle worker configuration. For Webpack users, implement manual worker configuration with `self.MonacoEnvironment.getWorker`.

### Rationale

- **Vite has built-in support for web workers** via query parameters (e.g., `?worker`), eliminating manual bundling complexity
- **Monaco Editor Webpack Plugin was archived in November 2023**, making it unsuitable for new projects
- The **`monaco-editor-workers` package** from TypeFox provides reliable worker bundling with both module and classic (Firefox-compatible) worker support
- ESM-first approach aligns with modern JavaScript ecosystem trends and enables better tree-shaking

### Alternatives Considered

1. **Monaco Editor Webpack Plugin**: Archived by maintainers; no longer recommended
2. **Manual worker bundling**: Requires custom build scripts and increases maintenance burden
3. **CDN-based Monaco**: Loses tree-shaking benefits and increases external dependencies; not suitable for offline-first applications
4. **modern-monaco**: Uses Shiki for syntax highlighting instead of Monarch; good for light use cases but less flexible for custom language extensions

### Implementation Notes

#### Vite Configuration Example

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'monaco-workers': ['monaco-editor-workers']
        }
      }
    }
  },
  worker: {
    format: 'es' // Use ES modules for workers
  }
});
```

#### ESM Worker Setup with Vite

```javascript
// src/setupMonaco.ts
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    const workers: Record<string, () => Worker> = {
      json: () => new jsonWorker(),
      css: () => new cssWorker(),
      html: () => new htmlWorker(),
      typescript: () => new tsWorker(),
      javascript: () => new tsWorker(),
    };
    return new (workers[label] || editorWorker)();
  }
};
```

#### Using monaco-editor-workers Package

```javascript
// src/setupMonaco.ts
import { buildWorkerDefinition } from 'monaco-editor-workers';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

buildWorkerDefinition(
  './node_modules/monaco-editor-workers/dist/workers',
  import.meta.url,
  true // use ES module workers (set to false for Firefox classic workers)
);
```

### Key Considerations

- **Worker isolation**: Workers run in separate threads; avoid sharing references or non-serializable objects
- **CSP (Content Security Policy)**: Inline workers may violate CSP if `worker-src 'self'` is configured; use module workers for better CSP compliance
- **Bundle splitting**: Separate Monaco editor and language workers into different chunks to enable granular loading (each ~500KB to 2MB depending on languages)
- **Version pinning**: Keep `monaco-editor` and `monaco-editor-workers` (or compatible package) at the same version

---

## 2. Monarch Language Definition

### Decision

Create **composable, server-generated Monarch language definitions** stored as JSON files, loaded dynamically via HTTP requests with caching. Use **registry pattern** to organize definitions and enable lazy loading by language ID.

### Rationale

- **JSON-based Monarch** definitions are portable, versionable, and can be generated server-side from language specifications or DSLs
- **Dynamic loading** defers bandwidth cost until a language is actually used
- **Caching layer** (browser cache + in-memory map) prevents repeated network requests
- **Monarch is battle-tested**: Used by VS Code itself and supports complex token rules via state machines

### Alternatives Considered

1. **Inline all definitions**: Increases initial bundle size; poor for packages supporting many languages
2. **TextMate grammars**: More powerful but heavier; requires additional Shiki or Lezer integration
3. **Tree-sitter grammars**: High performance but complex setup; overkill for most use cases
4. **Ace Editor tokenizers**: Less mature; reduced feature parity with Monaco

### Implementation Notes

#### Monarch Language Definition Structure

```json
{
  "defaultToken": "",
  "tokenizer": {
    "root": [
      [/\b(function|return|if)\b/, "keyword"],
      [/\$\{[\w\.]+\}/, "variable"],
      [/"[^"]*"/, "string"],
      [/\/\/.*$/, "comment"],
      [/\s+/, "whitespace"]
    ]
  }
}
```

#### Registry Pattern for Dynamic Loading

```typescript
// src/languages/languageRegistry.ts
interface LanguageDefinition {
  id: string;
  monarchDefinition: monaco.languages.IMonarchLanguage;
  languageConfiguration: monaco.languages.LanguageConfiguration;
}

class LanguageRegistry {
  private cache: Map<string, LanguageDefinition> = new Map();
  private loadingPromises: Map<string, Promise<LanguageDefinition>> = new Map();

  async loadLanguage(languageId: string): Promise<LanguageDefinition> {
    // Return cached definition if available
    if (this.cache.has(languageId)) {
      return this.cache.get(languageId)!;
    }

    // Prevent duplicate requests
    if (this.loadingPromises.has(languageId)) {
      return this.loadingPromises.get(languageId)!;
    }

    const loadPromise = this.fetchLanguageDefinition(languageId);
    this.loadingPromises.set(languageId, loadPromise);

    try {
      const definition = await loadPromise;
      this.cache.set(languageId, definition);
      return definition;
    } finally {
      this.loadingPromises.delete(languageId);
    }
  }

  private async fetchLanguageDefinition(
    languageId: string
  ): Promise<LanguageDefinition> {
    const response = await fetch(
      `/api/languages/${languageId}/definition.json`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load language ${languageId}: ${response.statusText}`
      );
    }
    return response.json();
  }

  registerLanguage(languageId: string, definition: LanguageDefinition): void {
    this.cache.set(languageId, definition);
    monaco.languages.register({ id: languageId });
    monaco.languages.setMonarchTokensProvider(
      languageId,
      definition.monarchDefinition
    );
    monaco.languages.setLanguageConfiguration(
      languageId,
      definition.languageConfiguration
    );
  }
}

export const languageRegistry = new LanguageRegistry();
```

#### Model-Aware Language Loading

```typescript
// src/editor/editorSetup.ts
import { languageRegistry } from '../languages/languageRegistry';

async function setupEditorForLanguage(
  editor: monaco.editor.IStandaloneCodeEditor,
  languageId: string
): Promise<void> {
  // Load language definition on-demand
  const definition = await languageRegistry.loadLanguage(languageId);

  // Register if not already registered
  if (!monaco.languages.getLanguages().find((l) => l.id === languageId)) {
    languageRegistry.registerLanguage(languageId, definition);
  }

  // Update model language
  const model = editor.getModel();
  if (model) {
    monaco.editor.setModelLanguage(model, languageId);
  }
}
```

#### Server-Side Monarch Generation Example

```typescript
// Server-side (Node.js/Express)
import { Router } from 'express';

const router = Router();

router.get('/api/languages/:languageId/definition.json', (req, res) => {
  const { languageId } = req.params;

  // Generate or load from database
  const monarchDefinition = generateMonarchDefinition(languageId);

  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24-hour cache
  res.json({
    id: languageId,
    monarchDefinition,
    languageConfiguration: {
      comments: { lineComment: '//' },
      brackets: [['[', ']']],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
      ],
    },
  });
});

function generateMonarchDefinition(languageId: string): monaco.languages.IMonarchLanguage {
  // Implementation depends on your language specification
  return {
    defaultToken: '',
    tokenizer: {
      root: [
        [/\b(keyword1|keyword2)\b/, 'keyword'],
        [/\$\{[\w\.]+\}/, 'variable'],
      ],
    },
  };
}
```

### Key Considerations

- **State machine design**: Monarch's state system is powerful for context-aware highlighting; document state transitions clearly
- **Performance**: Keep regex patterns simple; avoid catastrophic backtracking
- **Escape sequences**: Properly escape regex special characters in JSON (e.g., `\\` for backslash)
- **Theme integration**: Ensure custom tokens have corresponding theme colors defined
- **Version management**: Include language version in definitions for future schema changes

---

## 3. Completion Providers

### Decision

Implement **context-aware completion providers** using a **provider registry pattern** with support for:
- Dynamic function whitelists loaded from server
- Context variable schemas with nested object property traversal
- Asynchronous completion resolution (returning promises) for server-side schemas

### Rationale

- **Registry pattern** enables modular completion logic per language
- **Context parsing** (analyzing cursor position and line content) enables sophisticated suggestions
- **Promise-based resolution** allows completion items to be fetched server-side without blocking user interaction
- **TypeScript integration** via `addExtraLib()` provides editor-native type hints for JavaScript/TypeScript

### Alternatives Considered

1. **Language Server Protocol (LSP)**: More powerful but adds complexity; requires separate server process or WebSocket setup
2. **Simple regex-based completion**: Insufficient for complex nested object traversal
3. **Built-in Monaco providers**: Limited to standard variables; cannot handle custom function whitelists

### Implementation Notes

#### Completion Provider Registry

```typescript
// src/completion/completionRegistry.ts
interface CompletionContext {
  model: monaco.editor.ITextModel;
  position: monaco.Position;
  lineText: string;
  wordUntilPosition: string;
}

interface CompletionProvider {
  provideCompletionItems(
    context: CompletionContext,
    token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList>;
}

export class CompletionProviderRegistry {
  private providers: Map<string, CompletionProvider[]> = new Map();

  registerProvider(languageId: string, provider: CompletionProvider): void {
    if (!this.providers.has(languageId)) {
      this.providers.set(languageId, []);
    }
    this.providers.get(languageId)!.push(provider);

    // Register with Monaco
    monaco.languages.registerCompletionItemProvider(languageId, {
      provideCompletionItems: async (model, position, context, token) => {
        const lineText = model.getLineContent(position.lineNumber);
        const wordUntilPosition = model.getValueInRange(
          new monaco.Range(position.lineNumber, 1, position.lineNumber, position.column)
        );

        const completionContext: CompletionContext = {
          model,
          position,
          lineText,
          wordUntilPosition,
        };

        const allSuggestions: monaco.languages.CompletionItem[] = [];
        const providers = this.providers.get(languageId) || [];

        for (const provider of providers) {
          const result = await provider.provideCompletionItems(
            completionContext,
            token
          );
          if (result?.suggestions) {
            allSuggestions.push(...result.suggestions);
          }
        }

        return { suggestions: allSuggestions };
      },
      triggerCharacters: ['.', '$', '('],
    });
  }
}

export const completionRegistry = new CompletionProviderRegistry();
```

#### Function Whitelist Provider

```typescript
// src/completion/functionWhitelistProvider.ts
interface FunctionSignature {
  name: string;
  documentation: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  returnType: string;
}

class FunctionWhitelistProvider implements CompletionProvider {
  private functions: FunctionSignature[] = [];

  async loadFromServer(languageId: string): Promise<void> {
    const response = await fetch(`/api/functions?language=${languageId}`);
    if (!response.ok) {
      throw new Error('Failed to load function whitelist');
    }
    this.functions = await response.json();
  }

  provideCompletionItems(
    context: CompletionContext
  ): monaco.languages.CompletionList {
    const suggestions: monaco.languages.CompletionItem[] = [];

    // Check if at function call position
    const functionCallMatch = context.wordUntilPosition.match(/\b(\w+)\s*\(\s*$/);
    if (!functionCallMatch) {
      // Provide function names
      suggestions.push(
        ...this.functions.map((fn) => ({
          label: fn.name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: fn.name,
          documentation: {
            value: fn.documentation,
          },
        }))
      );
    } else {
      // Inside function call - provide parameter hints
      const functionName = functionCallMatch[1];
      const func = this.functions.find((f) => f.name === functionName);

      if (func?.parameters) {
        suggestions.push(
          ...func.parameters.map((param) => ({
            label: param.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: param.name,
            documentation: {
              value: `${param.type}: ${param.description}`,
            },
          }))
        );
      }
    }

    return { suggestions };
  }
}
```

#### Context Variable Schema Provider with Nested Object Support

```typescript
// src/completion/contextVariableProvider.ts
interface VariableSchema {
  [key: string]: {
    type: string;
    description: string;
    properties?: { [key: string]: VariableSchema };
  };
}

class ContextVariableProvider implements CompletionProvider {
  private schema: VariableSchema = {};

  setSchema(schema: VariableSchema): void {
    this.schema = schema;
  }

  provideCompletionItems(
    context: CompletionContext
  ): monaco.languages.CompletionList {
    const suggestions: monaco.languages.CompletionItem[] = [];

    // Match property access pattern: context.prop1.prop2.prop3
    const propertyChainMatch = context.wordUntilPosition.match(
      /(\w+(?:\.\w+)*)\s*\.?\s*$/
    );

    if (!propertyChainMatch) {
      // Provide root-level variables
      Object.entries(this.schema).forEach(([name, schema]) => {
        suggestions.push({
          label: name,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: name,
          documentation: {
            value: `${schema.type}: ${schema.description}`,
          },
          range: this.getCompletionRange(context),
        });
      });
    } else {
      // Traverse nested properties
      const chain = propertyChainMatch[1].split('.');
      let currentSchema: VariableSchema = this.schema;
      let isValid = true;

      for (const part of chain) {
        const schemaNode = currentSchema[part];
        if (!schemaNode?.properties) {
          isValid = false;
          break;
        }
        currentSchema = schemaNode.properties;
      }

      if (isValid) {
        // Provide nested properties
        Object.entries(currentSchema).forEach(([name, schema]) => {
          suggestions.push({
            label: name,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: name,
            documentation: {
              value: `${schema.type}: ${schema.description}`,
            },
            range: this.getCompletionRange(context),
          });
        });
      }
    }

    return { suggestions };
  }

  private getCompletionRange(context: CompletionContext): monaco.IRange {
    const lastDotIndex = context.wordUntilPosition.lastIndexOf('.');
    const startColumn =
      lastDotIndex >= 0
        ? context.position.column - (context.wordUntilPosition.length - lastDotIndex - 1)
        : context.position.column;

    return new monaco.Range(
      context.position.lineNumber,
      startColumn,
      context.position.lineNumber,
      context.position.column
    );
  }
}
```

#### Example: Setting Up Context Variable Schema

```typescript
// src/completion/setupCompletion.ts
import { completionRegistry } from './completionRegistry';
import { ContextVariableProvider } from './contextVariableProvider';

const contextProvider = new ContextVariableProvider();
contextProvider.setSchema({
  user: {
    type: 'object',
    description: 'Current user object',
    properties: {
      id: {
        type: 'string',
        description: 'User ID',
      },
      name: {
        type: 'string',
        description: 'User full name',
      },
      logins: {
        type: 'object',
        description: 'User login history',
        properties: {
          count: {
            type: 'number',
            description: 'Total number of logins',
          },
          lastLogin: {
            type: 'date',
            description: 'Last login timestamp',
          },
        },
      },
    },
  },
  env: {
    type: 'object',
    description: 'Environment variables',
    properties: {
      appName: {
        type: 'string',
        description: 'Application name',
      },
      version: {
        type: 'string',
        description: 'Application version',
      },
    },
  },
});

completionRegistry.registerProvider('myLanguage', contextProvider);
```

#### Async Server-Based Completion

```typescript
// src/completion/serverBasedCompletionProvider.ts
class ServerBasedCompletionProvider implements CompletionProvider {
  async provideCompletionItems(
    context: CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    try {
      const response = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageId: context.model.getLanguageId(),
          code: context.model.getValue(),
          position: {
            line: context.position.lineNumber - 1,
            column: context.position.column - 1,
          },
        }),
        signal: token.onCancellationRequested((controller) =>
          controller.abort()
        ),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const { suggestions } = await response.json();

      return {
        suggestions: suggestions.map((item: any) => ({
          label: item.label,
          kind: this.mapKind(item.kind),
          insertText: item.insertText,
          documentation: item.documentation,
        })),
      };
    } catch (error) {
      console.error('Completion provider error:', error);
      return { suggestions: [] };
    }
  }

  private mapKind(
    kind: string
  ): monaco.languages.CompletionItemKind {
    const kindMap: Record<string, monaco.languages.CompletionItemKind> = {
      function: monaco.languages.CompletionItemKind.Function,
      variable: monaco.languages.CompletionItemKind.Variable,
      property: monaco.languages.CompletionItemKind.Property,
      keyword: monaco.languages.CompletionItemKind.Keyword,
    };
    return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
  }
}
```

### Key Considerations

- **Cancellation tokens**: Respect Monaco's cancellation tokens to avoid memory leaks in async operations
- **Range management**: Correctly compute `range` property for suggestions to enable proper text replacement
- **Trigger characters**: Choose carefully; `'.'`, `'$'`, `'('` are common but may conflict with language syntax
- **Debouncing**: Consider debouncing async completions to reduce server load
- **Error handling**: Gracefully handle failed completion requests; return empty suggestions rather than breaking the editor
- **Performance**: Cache schema and function lists; invalidate cache on server-side updates

---

## 4. NPM Package Structure

### Decision

Use **tsup for dual ESM/CJS bundling** with **explicit exports field** in package.json. Structure as:
- `/dist/esm/` - ES Module build with `.mjs` extension
- `/dist/cjs/` - CommonJS build with `.cjs` extension
- `/dist/types/` - TypeScript type declarations (`.d.ts` and `.d.cts`)

### Rationale

- **tsup automates** module transpilation and type generation for both targets
- **Explicit exports field** provides unambiguous resolution for bundlers and TypeScript
- **Dual extension strategy** (`*.mjs`, `*.cjs`) prevents module resolution confusion
- **Avoids the "type": "module"** field which breaks CommonJS consumers
- **Are the Types Wrong tool** can validate package configuration

### Alternatives Considered

1. **Only ESM**: Breaks CommonJS users; not feasible for general-purpose libraries
2. **Only CommonJS**: Loses tree-shaking benefits; conflicts with modern bundling practices
3. **Conditional exports without explicit types**: May cause TypeScript resolution issues
4. **tsc for compilation**: Requires manual worker and file handling; less robust than tsup

### Implementation Notes

#### package.json Structure

```json
{
  "name": "@myorg/monaco-editor-custom",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "require": "./dist/cjs/index.cjs",
      "import": "./dist/esm/index.mjs",
      "default": "./dist/esm/index.mjs"
    },
    "./languages": {
      "types": "./dist/types/languages.d.ts",
      "require": "./dist/cjs/languages.cjs",
      "import": "./dist/esm/languages.mjs"
    },
    "./completion": {
      "types": "./dist/types/completion.d.ts",
      "require": "./dist/cjs/completion.cjs",
      "import": "./dist/esm/completion.mjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch src",
    "dev": "tsup --watch src",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "monaco-editor": "^0.50.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0"
  },
  "keywords": ["monaco", "editor", "custom-language", "completion"],
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/monaco-editor-custom"
  }
}
```

#### tsup Configuration

```javascript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    languages: 'src/languages/index.ts',
    completion: 'src/completion/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true, // Generate .d.ts files
  splitting: false, // Keep files as single bundles
  sourcemap: true,
  clean: true,
  shims: true, // Handle globalThis shims
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  external: ['monaco-editor'], // Don't bundle Monaco
  treeshake: true,
  minify: false, // Let consumers minify if needed
});
```

#### Main Entry Point Structure

```typescript
// src/index.ts
export { setupMonacoEditor } from './editor/setup';
export { languageRegistry } from './languages/registry';
export { completionRegistry } from './completion/registry';
export type { LanguageDefinition } from './languages/types';
export type { CompletionProvider, CompletionContext } from './completion/types';

// Re-export Monaco types for consumers
export type {
  IStandaloneCodeEditor,
  ITextModel,
  Position,
  Range,
} from 'monaco-editor/esm/vs/editor/editor.api';
```

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Key Considerations

- **No "type": "module"**: Always omit this field unless ESM-only is acceptable
- **Verify with "Are the Types Wrong"**: Run npx are-the-types-wrong before publishing
- **Document module exports**: Clearly indicate which exports are available in ESM vs CJS
- **Worker files**: Include worker files in `files` array if bundled separately
- **Changelog management**: Maintain CHANGELOG.md for version tracking

---

## 5. Bundle Size Optimization

### Decision

Employ **multi-layered approach**:
1. **Externalize Monaco Editor**: Never bundle; use peer dependency
2. **Code splitting**: Separate language definitions into lazy-loaded chunks
3. **Minification**: Enable treeshake and minify in consumer's build process
4. **Worker optimization**: Load workers only when languages are used
5. **Tree-shaking**: Use ESM exports exclusively for included code

### Rationale

- **Monaco is large** (~5-7MB unminified); bundling wastes space
- **Peer dependency model** lets consumers deduplicate Monaco across their app
- **Lazy-loaded definitions** defer bandwidth until needed
- **Worker bundling** is automatic in modern bundlers; no manual configuration needed
- **Consumer minification** provides better optimization than library-level minification

### Alternatives Considered

1. **Bundling Monaco**: Increases package size 10x; defeats tree-shaking
2. **Custom Shiki-based highlighting**: Reduces bundle but loses Monarch flexibility
3. **Server-side syntax highlighting**: Requires extra round-trip; poor UX for offline use

### Implementation Notes

#### Package.json Dependency Structure

```json
{
  "peerDependencies": {
    "monaco-editor": "^0.50.0"
  },
  "peerDependenciesMeta": {
    "monaco-editor": {
      "optional": false
    }
  },
  "devDependencies": {
    "monaco-editor": "^0.50.0"
  }
}
```

#### Language Definition Lazy Loading

```typescript
// src/languages/lazyLanguageLoader.ts
class LazyLanguageLoader {
  private loadedLanguages = new Set<string>();

  async ensureLanguageLoaded(languageId: string): Promise<void> {
    if (this.loadedLanguages.has(languageId)) {
      return;
    }

    // Dynamic import for code splitting
    const module = await import(
      /* webpackChunkName: "language-[request]" */
      `./definitions/${languageId}.json`
    );

    const definition = module.default;
    monaco.languages.register({ id: languageId });
    monaco.languages.setMonarchTokensProvider(languageId, definition);

    this.loadedLanguages.add(languageId);
  }
}
```

#### Vite Configuration for Optimal Chunking

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate language definitions into own chunks
          'lang-javascript': ['./src/languages/definitions/javascript.json'],
          'lang-typescript': ['./src/languages/definitions/typescript.json'],
          'lang-json': ['./src/languages/definitions/json.json'],
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: 'ES2020',
    minify: 'terser',
  },
});
```

#### Size Measurement Strategy

```bash
# Check final bundle size
npm run build
du -sh dist/

# Analyze chunk sizes (requires rollup-plugin-visualizer)
npm install --save-dev rollup-plugin-visualizer

# Results should be:
# - Main bundle: < 50KB
# - Each language definition: < 10KB
# - Workers: handled by Monaco, not included
# Total impact on app: < 100KB (excluding Monaco)
```

#### Import Path Optimization

```typescript
// Bad: imports entire Monaco module
import * as monaco from 'monaco-editor';

// Good: tree-shakeable imports
import { languages, editor } from 'monaco-editor/esm/vs/editor/editor.api';
```

### Key Considerations

- **Monaco peer dependency**: Document minimum required version
- **Language definition format**: Keep JSON compact; avoid unnecessary whitespace in production
- **Worker path configuration**: Verify workers are served from correct URL in production
- **Compression**: Enable gzip/brotli compression on server; bundle may be 300KB uncompressed but 80KB compressed
- **CDN caching**: Set long cache headers for versioned chunks

**Target sizes:**
- Package core: 20-50KB (gzipped)
- Per language definition: 2-8KB (gzipped)
- Each worker: 100-300KB (handled by Monaco, not your package)
- Total app impact: 100-200KB additional (depending on languages used)

---

## 6. Testing Strategy

### Decision

Use **Vitest for unit tests** of pure logic (registries, providers, schema parsing) and **Playwright with `playwright-monaco` fixture** for integration tests of Monaco interaction (syntax highlighting, completion).

### Rationale

- **Vitest is fast** and has excellent ESM support; ideal for testing TypeScript/JavaScript logic
- **Playwright automates browser testing** with real Monaco instances
- **playwright-monaco** provides convenient fixtures for Monaco-specific operations
- **Separation of concerns** keeps unit tests fast while integration tests validate browser behavior

### Alternatives Considered

1. **Cypress**: Good for UI testing but overkill for Monaco integration
2. **Testing Library**: DOM-centric; poorly suited for Monaco's shadow DOM and canvas rendering
3. **Jest**: Slower; requires additional configuration for ESM
4. **Manual testing**: Insufficient for regression detection

### Implementation Notes

#### Vitest Unit Test Example: Completion Provider

```typescript
// src/completion/__tests__/contextVariableProvider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextVariableProvider } from '../contextVariableProvider';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

describe('ContextVariableProvider', () => {
  let provider: ContextVariableProvider;

  beforeEach(() => {
    provider = new ContextVariableProvider();
    provider.setSchema({
      user: {
        type: 'object',
        description: 'User object',
        properties: {
          logins: {
            type: 'object',
            description: 'Login history',
            properties: {
              count: {
                type: 'number',
                description: 'Login count',
              },
            },
          },
        },
      },
    });
  });

  it('should provide root-level variables', () => {
    const mockContext = {
      wordUntilPosition: '',
      position: { lineNumber: 1, column: 1 } as monaco.Position,
    };

    const result = provider.provideCompletionItems(
      mockContext as any,
      null as any
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].label).toBe('user');
  });

  it('should provide nested properties', () => {
    const mockContext = {
      wordUntilPosition: 'user.logins.',
      position: { lineNumber: 1, column: 12 } as monaco.Position,
    };

    const result = provider.provideCompletionItems(
      mockContext as any,
      null as any
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].label).toBe('count');
  });

  it('should handle invalid paths gracefully', () => {
    const mockContext = {
      wordUntilPosition: 'user.invalid.',
      position: { lineNumber: 1, column: 13 } as monaco.Position,
    };

    const result = provider.provideCompletionItems(
      mockContext as any,
      null as any
    );

    expect(result.suggestions).toHaveLength(0);
  });
});
```

#### Vitest Unit Test Example: Language Registry

```typescript
// src/languages/__tests__/languageRegistry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageRegistry } from '../languageRegistry';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
  languages: {
    register: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    setLanguageConfiguration: vi.fn(),
  },
}));

describe('LanguageRegistry', () => {
  let registry: LanguageRegistry;

  beforeEach(() => {
    registry = new LanguageRegistry();
    vi.clearAllMocks();
  });

  it('should cache loaded definitions', async () => {
    const mockDef = {
      id: 'test',
      monarchDefinition: { defaultToken: '' },
      languageConfiguration: {},
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDef,
    });

    const result1 = await registry.loadLanguage('test');
    const result2 = await registry.loadLanguage('test');

    // fetch should only be called once due to caching
    expect(global.fetch).toHaveBeenCalledOnce();
    expect(result1).toBe(result2);
  });

  it('should prevent duplicate requests', async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  id: 'test',
                  monarchDefinition: { defaultToken: '' },
                  languageConfiguration: {},
                }),
              }),
            100
          )
        )
    );

    // Initiate two simultaneous requests
    const [result1, result2] = await Promise.all([
      registry.loadLanguage('test'),
      registry.loadLanguage('test'),
    ]);

    // fetch should only be called once
    expect(global.fetch).toHaveBeenCalledOnce();
    expect(result1).toBe(result2);
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(registry.loadLanguage('test')).rejects.toThrow(
      'Failed to load language'
    );
  });
});
```

#### Playwright Test with playwright-monaco

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Playwright Monaco Integration Test

```typescript
// tests/e2e/syntax-highlighting.spec.ts
import { test } from '@playwright/test';
import { createMonacoEditorFixture } from './fixtures/monacoFixture';

test.describe('Syntax Highlighting', () => {
  test('should highlight keywords correctly', async ({ page, context }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    // Set language
    await monacoFixture.editor.setLanguage('myCustomLanguage');

    // Insert code
    await monacoFixture.editor.insertText('function test() {}');

    // Get token information
    const tokens = await monacoFixture.editor.getTokens(1); // line 1

    // Verify 'function' is tokenized as keyword
    const functionToken = tokens.find((t) => t.text === 'function');
    expect(functionToken?.type).toBe('keyword.token');
  });

  it('should handle custom token types', async ({ page, context }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    await monacoFixture.editor.setLanguage('myCustomLanguage');
    await monacoFixture.editor.insertText('${myVariable}');

    const tokens = await monacoFixture.editor.getTokens(1);
    const varToken = tokens.find((t) => t.text === 'myVariable');
    expect(varToken?.type).toContain('variable');
  });
});
```

#### Playwright Completion Provider Test

```typescript
// tests/e2e/completion.spec.ts
import { test, expect } from '@playwright/test';
import { createMonacoEditorFixture } from './fixtures/monacoFixture';

test.describe('Code Completion', () => {
  test('should provide context variable completions', async ({
    page,
    context,
  }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    await monacoFixture.editor.setLanguage('myCustomLanguage');

    // Trigger completion at "user."
    await monacoFixture.editor.insertText('user.');
    await monacoFixture.editor.triggerCompletion();

    // Wait for suggestions
    const suggestions = await monacoFixture.editor.getCompletionItems();

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        label: 'logins',
        kind: 'Property',
      })
    );
  });

  test('should provide nested property completions', async ({
    page,
    context,
  }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    await monacoFixture.editor.setLanguage('myCustomLanguage');

    // Trigger completion at "user.logins."
    await monacoFixture.editor.insertText('user.logins.');
    await monacoFixture.editor.triggerCompletion();

    const suggestions = await monacoFixture.editor.getCompletionItems();

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        label: 'count',
        kind: 'Property',
      })
    );
  });

  test('should handle async function completions', async ({
    page,
    context,
  }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    await monacoFixture.editor.setLanguage('myCustomLanguage');

    // Insert partial function call
    await monacoFixture.editor.insertText('myFunc');
    await monacoFixture.editor.triggerCompletion();

    // Wait for async completion from server
    const suggestions = await monacoFixture.editor.getCompletionItems(
      3000 // 3 second timeout for server response
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toBe('myFunction');
  });

  test('should not provide invalid completions', async ({
    page,
    context,
  }) => {
    const monacoFixture = createMonacoEditorFixture(page, context);
    await monacoFixture.goto('/editor.html');

    await monacoFixture.editor.setLanguage('myCustomLanguage');

    // Trigger completion in invalid context
    await monacoFixture.editor.insertText('invalid.property.');
    await monacoFixture.editor.triggerCompletion();

    const suggestions = await monacoFixture.editor.getCompletionItems();

    expect(suggestions).toHaveLength(0);
  });
});
```

#### Playwright-Monaco Fixture Setup

```typescript
// tests/e2e/fixtures/monacoFixture.ts
import { Page, BrowserContext } from '@playwright/test';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface TokenInfo {
  text: string;
  type: string;
  offset: number;
}

interface CompletionItem {
  label: string;
  kind: string;
  insertText: string;
  documentation?: string;
}

class MonacoEditorFixture {
  constructor(private page: Page, private context: BrowserContext) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    // Wait for Monaco to be initialized
    await this.page.waitForFunction(() => (window as any).monaco !== undefined);
  }

  async setLanguage(languageId: string): Promise<void> {
    await this.page.evaluate((langId) => {
      const editor = (window as any).editor;
      const model = editor.getModel();
      monaco.editor.setModelLanguage(model, langId);
    }, languageId);
  }

  async insertText(text: string): Promise<void> {
    const editor = await this.page.locator('.monaco-editor').first();
    await editor.click();
    await this.page.keyboard.type(text);
  }

  async getTokens(lineNumber: number): Promise<TokenInfo[]> {
    return this.page.evaluate((lineNum) => {
      const editor = (window as any).editor;
      const model = editor.getModel();
      const lineContent = model.getLineContent(lineNum);
      const lineTokens = editor.getLineTokens(lineNum);

      return lineTokens.map((token: any) => ({
        text: lineContent.slice(token.startIndex, token.endIndex),
        type: token.type,
        offset: token.startIndex,
      }));
    }, lineNumber);
  }

  async triggerCompletion(): Promise<void> {
    await this.page.keyboard.press('Control+Space');
    await this.page.waitForTimeout(500); // Wait for completions to appear
  }

  async getCompletionItems(timeout: number = 1000): Promise<CompletionItem[]> {
    try {
      await this.page.waitForSelector('.suggest-widget', {
        timeout,
      });

      return this.page.evaluate(() => {
        const suggestions: CompletionItem[] = [];
        const items = document.querySelectorAll('.monaco-list-row');

        items.forEach((item) => {
          const label = item.querySelector('.monaco-icon-label-container');
          const detail = item.querySelector('.detail');

          if (label) {
            suggestions.push({
              label: label.textContent || '',
              kind: item.getAttribute('data-index') || 'Unknown',
              insertText: label.textContent || '',
              documentation: detail?.textContent || undefined,
            });
          }
        });

        return suggestions;
      });
    } catch {
      return [];
    }
  }
}

export function createMonacoEditorFixture(
  page: Page,
  context: BrowserContext
): { editor: MonacoEditorFixture } {
  return {
    editor: new MonacoEditorFixture(page, context),
  };
}
```

#### Test Setup: HTML Page for E2E Tests

```html
<!-- tests/e2e/editor.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monaco Editor Test</title>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
      }
      .editor {
        height: 100%;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div class="editor" id="editor"></div>
    <script type="module">
      import * as monaco from 'https://esm.sh/monaco-editor@latest';
      import { setupMonacoEditor } from '/dist/esm/index.mjs';

      // Create editor instance
      const editor = monaco.editor.create(
        document.getElementById('editor'),
        {
          value: '',
          language: 'plaintext',
          theme: 'vs-dark',
        }
      );

      // Setup custom languages and completion providers
      await setupMonacoEditor();

      // Expose for tests
      window.editor = editor;
      window.monaco = monaco;
    </script>
  </body>
</html>
```

### Key Considerations

- **Isolation**: Use test fixtures to isolate Monaco instances between tests
- **Timing**: Account for async completion providers; use appropriate timeouts
- **Browser compatibility**: Test across Chrome, Firefox, Safari if targeting multiple browsers
- **Snapshot testing**: Avoid for Monaco tokenization; use exact assertions instead
- **Performance testing**: Monitor completion response times; aim for < 200ms for server calls
- **Resource cleanup**: Ensure editors are disposed between tests to prevent memory leaks

#### Test Configuration

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Summary Table: Decision Matrix

| Topic | Primary Decision | Key Tool/Library | Bundle Impact | Complexity |
| --- | --- | --- | --- | --- |
| **Monaco Integration** | Vite + ESM | vite + monaco-editor-workers | External (peer dep) | Medium |
| **Language Definition** | JSON + Registry Pattern | Dynamic HTTP loading | ~2-10KB per language | Medium |
| **Completion Providers** | Registry + Async Promises | Custom implementation | 0KB (logic only) | High |
| **Package Structure** | Dual ESM/CJS | tsup | 20-50KB gzipped | Medium |
| **Bundle Optimization** | Peer dep + Code splitting | Vite manual chunks | 100-200KB total | Medium |
| **Testing** | Vitest + Playwright | @playwright/test + playwright-monaco | Dev only | High |

---

## Recommended Technology Stack

```
Frontend:
- Bundler: Vite
- Language definitions: Monarch (JSON)
- Workers: Native browser support via ?worker imports
- Testing: Vitest + Playwright

Package:
- Build tool: tsup
- TypeScript version: 5.3+
- Target: ES2020
- Module formats: ESM + CommonJS

Server (if needed):
- Framework: Express/Fastify
- Language definition generation: Custom DSL or template engine
- Completion API: Custom or LSP integration
```

---

## Risk Mitigation

### Tree-shaking Failures
- **Risk**: Unused code bundled with package
- **Mitigation**: Test with `npm run build` in consumer apps; use `are-the-types-wrong` tool

### Completion Provider Performance
- **Risk**: Slow async completions block editor
- **Mitigation**: Implement debouncing, cancellation tokens, and timeouts; monitor server latency

### Worker Configuration Errors
- **Risk**: Workers fail to load in production; editor dysfunctions
- **Mitigation**: Test in both development and production builds; verify worker paths in CSP

### Type Declaration Issues
- **Risk**: TypeScript consumers encounter type mismatches
- **Mitigation**: Validate with `are-the-types-wrong`; test in both ESM and CJS projects

### Monaco Version Mismatches
- **Risk**: Incompatible APIs if consumer uses different Monaco version
- **Mitigation**: Use specific major version ranges in package.json peer dependencies

---

## Future Considerations

1. **Language Server Protocol (LSP)**: For advanced features, consider implementing full LSP support via WebSocket
2. **Shiki Integration**: Optional alternative for even lighter syntax highlighting
3. **WASM-based Parsing**: For performance-critical custom languages
4. **Caching Strategy**: Service Workers for offline language definition caching
5. **JSR.io Publishing**: Monitor adoption and migrate when ecosystem matures
