/**
 * Main entry point for php-script Monaco Editor package
 * Exports public API for TypeScript and JavaScript consumers
 */

// Editor creation and configuration
export { createPhpScriptEditor, setupMonacoWorkers } from './editor';
export type { CreateEditorOptions, PhpScriptEditor } from './editor';

// Configuration types
export type {
  ConfigurationBundle,
  LanguageDefinition,
  FunctionWhitelist,
  ContextVariableSchema,
  FunctionDefinition,
  ContextVariable,
  MonarchLanguageDefinition,
  MonarchRule,
  MonarchAction,
  LanguageConfiguration,
  FunctionSignature,
  Parameter,
  VariableType,
  PropertyDefinition,
  MethodDefinition,
  ValidationError,
  ValidationResult,
} from './config/types';

// Configuration validation
export { validateConfigurationBundle } from './config/validator';

// Default configurations
export {
  FALLBACK_CONFIGURATION_BUNDLE,
  FALLBACK_LANGUAGE_DEFINITION,
  FALLBACK_FUNCTION_WHITELIST,
  FALLBACK_CONTEXT_SCHEMA,
  DEFAULT_EDITOR_OPTIONS,
} from './config/defaults';

// Error types
export {
  EditorError,
  EditorInitializationError,
  ConfigurationValidationError,
  ConfigurationApplicationError,
  ContentPersistenceError,
} from './utils/errors';

// Re-export Monaco types for convenience
export type {
  IStandaloneCodeEditor,
  ITextModel,
  Position,
  Range,
} from 'monaco-editor/esm/vs/editor/editor.api';
