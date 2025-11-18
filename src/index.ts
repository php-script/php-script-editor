/**
 * Main entry point for php-script Monaco Editor package
 * Exports public API for TypeScript and JavaScript consumers
 */

// Editor creation and configuration
export { createPhpScriptEditor, setupMonacoWorkers } from './editor';
export type {
  CreateEditorOptions,
  PhpScriptEditor,
  ConfigurationChangedCallback,
  ValidationErrorCallback,
  ContentPersistedCallback,
} from './editor';

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

// Error types and utilities
export {
  EditorError,
  EditorInitializationError,
  ConfigurationValidationError,
  ConfigurationApplicationError,
  ContentPersistenceError,
  getUserFriendlyErrorMessage,
  getErrorAdvice,
} from './utils/errors';

// Logger
export { logger, LogLevel } from './utils/logger';
export type { LogEntry } from './utils/logger';

// Re-export Monaco types for convenience
// Note: Import from monaco-editor main module for better compatibility
import type * as Monaco from 'monaco-editor';
export type IStandaloneCodeEditor = Monaco.editor.IStandaloneCodeEditor;
export type ITextModel = Monaco.editor.ITextModel;
export type Position = Monaco.Position;
export type Range = Monaco.Range;
