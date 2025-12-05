# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added

#### Core Features
- **Custom php-script Language Support**: Pre-configured Monarch language definition for php-script syntax highlighting (dot notation, no $ prefix)
- **Intelligent Code Completion**: Context-aware suggestions for:
  - Whitelisted PHP functions with signature hints
  - Runtime context variables with nested property traversal
  - Method completion with documentation
- **Server-Side Configuration**: Configuration delivered via server-side rendering (no AJAX requests required)
- **Automatic Content Persistence**:
  - Auto-save to localStorage with 500ms debounce
  - Content restoration on page reload
  - Revert functionality to discard changes
  - Storage quota management with graceful degradation

#### API Surface
- `createPhpScriptEditor()` factory function for editor initialization
- `PhpScriptEditor` class with comprehensive API:
  - `getValue()` / `setValue()` - Content management
  - `getConfiguration()` - Access current configuration
  - `updateFunctionWhitelist()` - Dynamic function whitelist updates
  - `updateContextSchema()` - Dynamic context schema updates
  - `revertToOriginal()` - Discard local changes
  - `hasUnsavedChanges()` - Check for modifications
  - `clearLocalStorage()` - Manual cache clearing
  - `getOriginalContent()` - Access server-provided content
  - Event listeners: `onConfigurationChanged()`, `onValidationError()`, `onContentPersisted()`
  - `dispose()` - Cleanup resources

#### Type Safety
- Full TypeScript type definitions (.d.ts files)
- Dual module format support (ESM + CommonJS)
- Type exports for:
  - `ConfigurationBundle`
  - `LanguageDefinition`
  - `FunctionWhitelist`
  - `ContextVariableSchema`
  - `PhpScriptEditor`
  - Error types: `EditorError`, `ConfigurationValidationError`, `ContentPersistenceError`

#### Configuration System
- Validation utility: `validateConfigurationBundle()`
- Configuration versioning with semver
- Compatibility metadata tracking
- Fallback handling for malformed configurations
- Circular reference detection in context variables
- Depth limiting (max 10 levels) for nested objects

#### Testing
- Unit tests with Vitest (>80% coverage):
  - Monarch tokenizer tests
  - Configuration validation tests
  - Completion provider tests
  - Content persistence tests
- Integration tests:
  - Syntax highlighting integration
  - Code completion workflows
  - Content persistence across reloads
- End-to-end tests with Playwright:
  - Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
  - Performance validation (<2s load, <16ms keystroke, <100ms syntax highlighting)
  - Real-world usage scenarios

#### Documentation
- Comprehensive README with installation guide
- API reference documentation
- Migration guide from raw Monaco Editor
- Troubleshooting guide with common issues
- TypeScript and JavaScript examples
- Server-side PHP integration guide

#### Performance
- Bundle size <500KB total with tree-shaking
- Core package ~50KB (gzipped)
- Worker-based syntax highlighting for non-blocking UI
- Debounced auto-save to minimize localStorage writes
- O(1) context variable lookup with indexing
- Optimized Monarch tokenizer patterns (no catastrophic backtracking)

#### Browser Compatibility
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Architecture

- **Module System**: Dual ESM/CommonJS builds via tsup
- **Bundler**: Vite for development, tsup for production builds
- **Language Registration**: Dynamic Monarch language provider
- **Worker Management**: ES module workers for syntax highlighting
- **Storage Layer**: localStorage with quota management and corruption handling
- **Error Handling**: Custom error types with detailed context
- **Logging**: Performance monitoring and event logging

### Dependencies

- **Peer Dependencies**:
  - monaco-editor: >=0.50.0 <1.0.0 (external, not bundled)

- **Dev Dependencies**:
  - TypeScript 5.6+
  - Vitest 2.0+ (unit/integration tests)
  - Playwright 1.48+ (E2E tests)
  - ESLint 9.0+ (code quality)
  - Prettier 3.3+ (formatting)
  - tsup 8.3+ (bundling)

### Quality Assurance

- ESLint configured with TypeScript rules
- Prettier for consistent formatting
- Pre-publish validation: build + lint + test
- Cross-browser E2E testing
- Performance benchmarking
- Security audit (no XSS, injection vulnerabilities)
- Constitution compliance validation

### Package Configuration

- **Exports**:
  - Main entry: `.` (ESM + CommonJS)
  - Language module: `./language`
  - Config module: `./config`
- **Files**: dist/, README.md, LICENSE
- **License**: MIT
- **Repository**: https://github.com/your-org/php-script-monaco-editor

### Examples

- TypeScript example with full type safety
- JavaScript/CommonJS example
- Server-side PHP integration example

### Known Limitations

- Maximum file size: ~10,000 lines for optimal performance
- localStorage limit: 5-10MB (browser-dependent)
- Nested object depth: 10 levels maximum
- Last-write-wins strategy for concurrent tab editing
- No real-time collaborative editing (by design)

### Migration Path

- Provides migration guide from raw Monaco Editor
- Backward compatible with Monaco Editor 0.50.0+
- Configuration bundle versioning for future compatibility

---

## [Unreleased]

### Planned Features

- Language Server Protocol (LSP) integration
- WASM-based parsing for performance-critical scenarios
- Service Worker caching for offline language definitions
- JSR.io publishing when ecosystem matures
- Enhanced accessibility features
- Dark/light theme customization API

---

## Release Notes

**v1.0.0** represents the first stable release of php-script-monaco-editor. This version includes:

- ✅ Complete API surface with type safety
- ✅ Full test coverage (unit + integration + E2E)
- ✅ Cross-browser compatibility
- ✅ Production-ready performance
- ✅ Comprehensive documentation
- ✅ Migration tooling and examples

**Upgrade Path**: This is the initial release. No migration required.

**Breaking Changes**: None (initial release).

**Deprecations**: None.

---

## Support

- [GitHub Issues](https://github.com/your-org/php-script-monaco-editor/issues)
- [Documentation](https://github.com/your-org/php-script-monaco-editor/docs)
- [API Reference](./docs/api-contracts.md)
- [Migration Guide](./docs/migration-guide.md)
- [Troubleshooting](./docs/troubleshooting.md)

---

**Contributors**:
- Initial implementation and architecture
- Test suite development
- Documentation authoring

[1.0.0]: https://github.com/your-org/php-script-monaco-editor/releases/tag/v1.0.0
