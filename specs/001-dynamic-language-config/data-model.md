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
- `unloaded` → `loading` (when fetch begins)
- `loading` → `loaded` (when definition parsed successfully)
- `loading` → `error` (when parsing fails or network error)
- `loaded` → `registered` (when Monaco language is registered)
- `error` → `loading` (on retry)

---

### FunctionWhitelist

List of PHP functions approved for use in the php-script runtime environment.

**Attributes**:
- `functions`: FunctionDefinition[] - Array of whitelisted function definitions
- `version`: string - Whitelist version for cache invalidation (semver format)
- `namespace`: string - Optional namespace for function organization (default: "global")

**FunctionDefinition**:
- `name`: string - Function name (e.g., "strlen", "substr")
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
- `version` MUST be valid semver (e.g., "1.2.3")
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
- `version`: string - Schema version for cache invalidation (semver format)
- `strict`: boolean - Whether to allow only defined variables (default: true)

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
- `unloaded` → `loading` (when schema fetch begins)
- `loading` → `validating` (when schema received, validation starts)
- `validating` → `validated` (when validation passes)
- `validating` → `error` (when validation fails - circular refs, duplicate names, etc.)
- `validated` → `indexed` (when completion index built)
- `error` → `loading` (on retry)

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
- `unloaded` → `loading` (when bundle fetch begins)
- `loading` → `validating` (when bundle received)
- `validating` → `applying` (when all validations pass)
- `applying` → `applied` (when Monaco configured with all components)
- `validating` → `error` (when any component validation fails)
- `applied` → `active` (when editor is ready for use)
- Any state → `refreshing` (when configuration reload requested)
- `refreshing` → `validating` (reload cycle restarts validation)

**Relationships**:
- ConfigurationBundle aggregates LanguageDefinition, FunctionWhitelist, ContextVariableSchema
- ConfigurationBundle version should increment when any component changes
- ConfigurationBundle is the unit of persistence (saved to localStorage as complete bundle)

---

## Data Flow

```
Server (PHP Engine)
    ├─→ Generates MonarchDefinition (from php-script grammar)
    ├─→ Exports FunctionWhitelist (from engine whitelist config)
    └─→ Exports ContextVariableSchema (from runtime context types)
           ↓
    ConfigurationBundle (JSON)
           ↓
    Editor Package (NPM)
           ├─→ Validates Bundle
           ├─→ Registers Language (Monaco API)
           ├─→ Registers Completion Provider (functions + context)
           └─→ Persists to localStorage (optional)
           ↓
    Active Editor
           ├─→ Syntax Highlighting (from MonarchDefinition)
           ├─→ Code Completion (from FunctionWhitelist + ContextSchema)
           └─→ Validation (from LanguageDefinition rules)
```

## Persistence Strategy

**Browser Storage** (optional feature):
- ConfigurationBundle stored in `localStorage` keyed by `bundleVersion`
- Maximum 3 most recent bundles retained (LRU eviction)
- Storage quota check before persisting (fail gracefully if quota exceeded)
- Persisted bundle includes `cachedAt` timestamp for staleness detection

**Cache Invalidation**:
- Bundle reloaded if `bundleVersion` changes
- Stale if `cachedAt` older than 24 hours (configurable)
- Manual refresh API available for forced reload

## Error Handling

**Configuration Errors**:
- Malformed JSON → Clear error with line/column info
- Invalid schema → Validation error with specific field path
- Circular references → Error with cycle path
- Network errors → Retry with exponential backoff (max 3 attempts)

**Runtime Errors**:
- Missing configuration → Fall back to minimal syntax highlighting (keywords only)
- Partial configuration → Apply what's valid, warn about invalid parts
- Version mismatch → Warn but attempt to use, log compatibility issues

## Performance Considerations

**Lazy Loading**:
- LanguageDefinition loaded on first editor instantiation
- FunctionWhitelist loaded when first completion requested
- ContextVariableSchema loaded when context variable detected

**Indexing**:
- Build completion index from ContextVariableSchema on load (one-time cost)
- Index nested properties up to 10 levels deep
- Index stored in memory for O(1) lookup during completion

**Bundle Size**:
- Typical sizes: Language 10-20KB, Whitelist 5-15KB, Schema 10-50KB
- Total bundle target: <100KB compressed
- Compression: gzip on server, browser auto-decompresses
