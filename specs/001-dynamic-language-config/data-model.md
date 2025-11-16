# Data Model: Dynamic Language Configuration

**Feature**: Dynamic Language Configuration
**Created**: 2025-11-16
**Source**: Extracted from [spec.md](./spec.md)

## Core Entities

### LanguageDefinition

Represents the Monarch language definition for php-script syntax, generated server-side by the PHP engine.

**Attributes**:
- `languageId`: string - Unique identifier for the language (exactly "php-script")
- `monarchDefinition`: MonarchLanguageDefinition - Complete Monarch syntax definition
  - `tokenizer`: object - State machine rules for tokenization
  - `keywords`: string[] - Language keywords
  - `operators`: string[] - Language operators
  - `symbols`: RegExp - Symbol matching patterns
  - `escapes`: RegExp - Escape sequence patterns
  - `brackets`: BracketDefinition[] - Bracket pairs for matching
- `fileExtensions`: string[] - File extensions for this language (e.g., [".phs", ".phpscript"])
- `mimeTypes`: string[] - MIME types associated with this language
- `configuration`: LanguageConfiguration - Editor behavior configuration
  - `comments`: { lineComment: string, blockComment: [string, string] }
  - `brackets`: string[][] - Bracket pairs
  - `autoClosingPairs`: AutoClosingPair[] - Auto-closing character pairs
  - `surroundingPairs`: SurroundingPair[] - Text wrapping pairs
  - `indentationRules`: IndentationRules - Auto-indentation rules

**Validation Rules**:
- `languageId` MUST be non-empty string matching pattern `^[a-z][a-z0-9-]*$`
- `monarchDefinition.tokenizer` MUST contain at least a "root" state
- `fileExtensions` MUST contain at least one extension starting with "."
- `keywords` MUST NOT overlap with operator tokens
- All RegExp patterns MUST be valid JavaScript regular expressions

**State Transitions**:
- `unloaded` → `parsing` (when reading from server-rendered JavaScript object)
- `parsing` → `parsed` (when definition validated successfully)
- `parsing` → `error` (when parsing/validation fails)
- `parsed` → `registered` (when Monaco language is registered)
- `error` → `fallback` (use minimal syntax highlighting)

---

### FunctionWhitelist

List of PHP functions approved for use in the php-script runtime environment.

**Attributes**:
- `functions`: FunctionDefinition[] - Array of whitelisted function definitions

**FunctionDefinition**:
- `name`: string - Function name (e.g., "strlen", "substr")
- `namespace`: string - Optional namespace for function organization (default: "")
- `signature`: FunctionSignature - Function signature for code completion
  - `parameters`: Parameter[] - Function parameters
    - `name`: string - Parameter name
    - `type`: string - Parameter type (for documentation)
    - `optional`: boolean - Whether parameter is optional
    - `defaultValue`: string? - Default value if optional
  - `returnType`: string - Return type (for documentation)
- `documentation`: string - Markdown-formatted documentation
- `category`: string - Function category (e.g., "string", "array", "date")
- `deprecated`: boolean - Whether function is deprecated
- `since`: string? - Version when function was added to whitelist

**Validation Rules**:
- `functions` MUST NOT contain duplicate function names within the same namespace
- Each function `name` MUST match pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Parameter names MUST be unique within a function signature
- Optional parameters MUST come after required parameters
- Deprecated functions MUST include documentation explaining replacement

**Relationships**:
- FunctionWhitelist is independent of LanguageDefinition (different concerns)
- FunctionWhitelist may reference ContextVariableSchema methods for consistency

---

### ContextVariableSchema

Hierarchical structure defining runtime-available variables and their members.

**Attributes**:
- `variables`: ContextVariable[] - Top-level context variables

**ContextVariable**:
- `name`: string - Variable name (e.g., "user", "request", "session")
- `type`: VariableType - Variable type
  - `kind`: "object" | "array" | "scalar" | "callable"
  - `baseType`: string - Base type name (e.g., "User", "Request", "string")
- `properties`: PropertyDefinition[] - Object properties (if type.kind === "object")
  - `name`: string - Property name
  - `type`: VariableType - Property type (supports nesting)
  - `readonly`: boolean - Whether property is read-only
  - `documentation`: string - Property documentation
- `methods`: MethodDefinition[] - Callable methods (if applicable)
  - `name`: string - Method name
  - `signature`: FunctionSignature - Same as FunctionDefinition signature
  - `documentation`: string - Method documentation
- `documentation`: string - Variable documentation
- `nullable`: boolean - Whether variable can be null

**Validation Rules**:
- `variables` MUST NOT contain duplicate variable names
- Variable names MUST match pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Circular references MUST be detected and rejected during validation
- Nested object depth MUST NOT exceed 10 levels (prevent infinite recursion)
- Property names within an object MUST be unique
- Method names MUST NOT conflict with property names in the same object
- Array types MUST specify element type (e.g., "array<User>")

**State Transitions**:
- `unloaded` → `validating` (when schema read from server-rendered object, validation starts)
- `validating` → `validated` (when validation passes)
- `validating` → `error` (when validation fails - circular refs, duplicate names, etc.)
- `validated` → `indexed` (when completion index built)
- `error` → `fallback` (use empty context schema)

**Relationships**:
- ContextVariable can nest other ContextVariables via properties (hierarchical)
- ContextVariable methods may reference FunctionWhitelist for shared function signatures
- ContextVariableSchema is consumed by CompletionProvider to build suggestion index

---

### ConfigurationBundle

Complete editor configuration combining language definition, function whitelist, and context schema.

**Attributes**:
- `languageDefinition`: LanguageDefinition - Monarch language definition
- `functionWhitelist`: FunctionWhitelist - Available PHP functions
- `contextSchema`: ContextVariableSchema - Runtime context variables
- `bundleVersion`: string - Overall bundle version (semver)
- `compatibility`: CompatibilityInfo - Compatibility metadata
  - `minEditorVersion`: string - Minimum editor package version required
  - `maxEditorVersion`: string? - Maximum compatible version (null = no max)
  - `phpScriptEngine`: string - Server-side engine version that generated this config
- `metadata`: ConfigMetadata - Bundle metadata
  - `generatedAt`: ISO8601 timestamp - When bundle was generated
  - `generatedBy`: string - System/user that generated bundle
  - `environment`: string - Target environment (e.g., "production", "staging")

**Validation Rules**:
- All three components (language, whitelist, schema) MUST be present and valid
- `bundleVersion` MUST be valid semver
- `compatibility.minEditorVersion` MUST be valid semver
- `metadata.generatedAt` MUST be valid ISO 8601 timestamp
- Bundle size MUST NOT exceed 1MB uncompressed (performance constraint)
- All component versions (language, whitelist, schema) SHOULD match bundleVersion for consistency

**State Transitions**:
- `unloaded` → `parsing` (when reading from server-rendered JavaScript object)
- `parsing` → `validating` (when bundle parsed, validation starts)
- `validating` → `applying` (when all validations pass)
- `applying` → `applied` (when Monaco configured with all components)
- `validating` → `error` (when any component validation fails)
- `applied` → `active` (when editor is ready for use)
- `error` → `fallback` (use minimal syntax highlighting mode)

**Relationships**:
- ConfigurationBundle aggregates LanguageDefinition, FunctionWhitelist, ContextVariableSchema
- ConfigurationBundle version should increment when any component changes
- ConfigurationBundle is delivered via server-side rendering (NOT cached in localStorage)

---

## Data Flow

### Configuration Flow (Server-Side Rendering)

```
Server (PHP Engine)
    ├─→ Generates MonarchDefinition (from php-script grammar)
    ├─→ Generates FunctionWhitelist (from engine whitelist config)
    ├─→ Generates ContextVariableSchema (from runtime context types)
    └─→ Generates initial editor content (optional)
           ↓
    Server-Side Rendering (PHP)
           ├─→ Embeds ConfigurationBundle as JavaScript object in HTML
           └─→ Embeds initial content value in HTML
           ↓
    Browser Loads Page
           ↓
    Editor Package (NPM) Initializes
           ├─→ Reads ConfigurationBundle from window object
           ├─→ Validates Bundle
           ├─→ Registers Language (Monaco API)
           ├─→ Registers Completion Provider (functions + context)
           ├─→ Checks localStorage for saved content
           └─→ Loads content (localStorage wins over server-provided)
           ↓
    Active Editor
           ├─→ Syntax Highlighting (from MonarchDefinition)
           ├─→ Code Completion (from FunctionWhitelist + ContextSchema)
           ├─→ Validation (from LanguageDefinition rules)
           └─→ Auto-save content to localStorage on changes
```

### Content Persistence Flow

```
User Types in Editor
           ↓
    Content Changes
           ↓
    EditorContent.save() triggered (debounced)
           ↓
    localStorage.setItem(storageKey, content)
           ↓
    [Page Reload / Browser Crash]
           ↓
    Editor Initializes
           ↓
    Check localStorage for saved content
           ↓
    If found: Load from localStorage (ignores server content)
    If not found: Load from server-provided initial content
           ↓
    User can call revertToOriginal() to discard local changes
```

---

### EditorContent

Represents the user's code/text content in the editor, persisted to localStorage to prevent data loss.

**Attributes**:
- `content`: string - The actual code/text content in the editor
- `storageKey`: string - localStorage key (derived from editor instance ID or page URL)
- `timestamp`: number - Unix timestamp when content was last saved
- `originalContent`: string - Server-provided initial content (for revert functionality)

**Validation Rules**:
- `content` MUST be a string (can be empty)
- `storageKey` MUST be unique per editor instance to avoid conflicts
- `content` size SHOULD NOT exceed 5MB (localStorage limitation)
- `timestamp` MUST be valid Unix timestamp in milliseconds

**State Transitions**:
- `empty` → `typing` (when user starts typing)
- `typing` → `saving` (debounced save triggered)
- `saving` → `saved` (localStorage write successful)
- `saving` → `error` (localStorage write failed - quota exceeded)
- `saved` → `typing` (user continues typing)
- `saved` → `reverting` (user calls revertToOriginal())
- `reverting` → `reverted` (localStorage cleared, original content restored)

**Relationships**:
- EditorContent is independent of ConfigurationBundle
- EditorContent.originalContent comes from server-side rendering
- EditorContent.content is stored in localStorage (ConfigurationBundle is NOT)

**Persistence Behavior**:
- **Priority**: localStorage content > server-provided initial content
- **Auto-save**: Content saved to localStorage on every change (debounced 500ms)
- **Restore**: On page load, check localStorage first before using server content
- **Revert**: API method clears localStorage and restores originalContent
- **Quota handling**: If localStorage full, warn user but continue editing (no persistence)

---

## Persistence Strategy

**Editor Content Storage** (localStorage):
- Editor content stored in `localStorage` keyed by `storageKey` (unique per editor instance)
- Storage key format: `php-script-editor-content-{instanceId}` or `php-script-editor-content-{pageURL}`
- Content auto-saved on every change (debounced 500ms to avoid excessive writes)
- localStorage content ALWAYS takes precedence over server-provided initial content
- No expiration or cache invalidation (content persists until manually cleared or reverted)

**Storage Quota Management**:
- Check available storage before each save
- If quota exceeded, show warning but continue editing (graceful degradation)
- Corrupted data is detected and discarded (fall back to server content)

**Revert Functionality**:
- `revertToOriginal()` API method clears localStorage entry
- Restores server-provided `originalContent`
- Provides "reset to default" capability for users

## Error Handling

**Configuration Errors** (from server-rendered object):
- Malformed JavaScript object → Clear error with field path
- Invalid schema → Validation error with specific field path
- Circular references in context variables → Error with cycle path, fall back to minimal mode

**Runtime Errors**:
- Missing configuration → Fall back to minimal syntax highlighting (keywords only)
- Partial configuration → Apply what's valid, warn about invalid parts
- Version mismatch → Warn but attempt to use, log compatibility issues

**Content Persistence Errors**:
- localStorage quota exceeded → Warn user, continue editing without persistence
- localStorage corrupted data → Discard corrupted entry, fall back to server content
- localStorage unavailable → Continue editing without persistence (graceful degradation)
- Concurrent tab conflicts → Last write wins (by design)

## Performance Considerations

**Configuration Loading** (server-side rendering):
- Configuration available immediately (embedded in HTML)
- No network round-trip delay
- Parsing happens synchronously during editor initialization
- Target: <200ms to parse and validate configuration bundle

**Indexing**:
- Build completion index from ContextVariableSchema on load (one-time cost)
- Index nested properties up to 10 levels deep
- Index stored in memory for O(1) lookup during completion

**Content Persistence**:
- Debounced saves (500ms) to avoid excessive localStorage writes
- localStorage read is synchronous but fast (<10ms for typical content)
- Content size should stay under 5MB for optimal performance

**Bundle Size**:
- Typical sizes: Language 10-20KB, Whitelist 5-15KB, Schema 10-50KB
- Total bundle target: <100KB (embedded in HTML, no compression needed for small sizes)
- Configuration is inline JavaScript, no separate download required
