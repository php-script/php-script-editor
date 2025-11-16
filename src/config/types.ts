/**
 * Type definitions for the php-script Monaco Editor configuration
 * These types define the complete configuration bundle structure
 */

/**
 * Complete configuration bundle combining language definition, function whitelist, and context schema
 */
export interface ConfigurationBundle {
  languageDefinition: LanguageDefinition;
  functionWhitelist: FunctionWhitelist;
  contextSchema: ContextVariableSchema;
  bundleVersion: string; // semver
  compatibility: CompatibilityInfo;
  metadata: ConfigMetadata;
}

/**
 * Compatibility information for version checking
 */
export interface CompatibilityInfo {
  minEditorVersion: string; // semver
  maxEditorVersion?: string; // semver or undefined
  phpScriptEngine: string; // version of server-side engine
}

/**
 * Metadata about when and how the configuration was generated
 */
export interface ConfigMetadata {
  generatedAt: string; // ISO 8601 timestamp
  generatedBy: string;
  environment: string; // e.g., 'production', 'staging'
}

/**
 * Monarch language definition for php-script syntax
 */
export interface LanguageDefinition {
  languageId: string; // e.g., 'php-script'
  monarchDefinition: MonarchLanguageDefinition;
  fileExtensions: string[]; // e.g., ['.phs', '.phpscript']
  mimeTypes: string[]; // e.g., ['text/x-php-script']
  configuration: LanguageConfiguration;
}

/**
 * Monaco Monarch tokenizer definition
 */
export interface MonarchLanguageDefinition {
  tokenizer: Record<string, MonarchRule[]>;
  keywords: string[];
  operators: string[];
  symbols: string; // RegExp pattern as string
  escapes: string; // RegExp pattern as string
  brackets?: BracketDefinition[];
}

/**
 * Monarch tokenizer rule - can be a tuple or object
 */
export type MonarchRule =
  | [RegExp | string, string | MonarchAction]
  | [RegExp | string, string | MonarchAction, string]
  | {
      regex: string | RegExp;
      action: string | MonarchAction | (string | MonarchAction)[];
    };

/**
 * Monarch action for token state transitions
 */
export interface MonarchAction {
  token?: string;
  next?: string;
  nextEmbedded?: string;
  log?: string;
  cases?: Record<string, string | MonarchAction>;
}

/**
 * Language configuration for editor behavior
 */
export interface LanguageConfiguration {
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

/**
 * Bracket definition for matching pairs
 */
export interface BracketDefinition {
  open: string;
  close: string;
  token: string;
}

/**
 * Whitelisted PHP functions available in php-script
 */
export interface FunctionWhitelist {
  functions: FunctionDefinition[];
  version: string; // semver
  namespace?: string; // default: 'global'
}

/**
 * Definition of a whitelisted function
 */
export interface FunctionDefinition {
  name: string;
  signature: FunctionSignature;
  documentation: string; // Markdown format
  category: string; // e.g., 'string', 'array', 'date'
  deprecated?: boolean;
  since?: string; // version added
  namespace?: string;
}

/**
 * Function signature for code completion
 */
export interface FunctionSignature {
  parameters: Parameter[];
  returnType: string;
}

/**
 * Function parameter definition
 */
export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Runtime context variables and their structure
 */
export interface ContextVariableSchema {
  variables: ContextVariable[];
  version: string; // semver
  strict?: boolean; // default: true
}

/**
 * Context variable definition with properties and methods
 */
export interface ContextVariable {
  name: string;
  type: VariableType;
  properties?: PropertyDefinition[];
  methods?: MethodDefinition[];
  documentation: string;
  nullable?: boolean;
}

/**
 * Variable type information
 */
export interface VariableType {
  kind: 'object' | 'array' | 'scalar' | 'callable';
  baseType: string; // e.g., 'User', 'Request', 'string'
}

/**
 * Property definition for objects
 */
export interface PropertyDefinition {
  name: string;
  type: VariableType;
  readonly?: boolean;
  documentation: string;
}

/**
 * Method definition for callable objects
 */
export interface MethodDefinition {
  name: string;
  signature: FunctionSignature;
  documentation: string;
}

/**
 * Editor content persistence state
 */
export interface EditorContent {
  content: string;
  storageKey: string;
  timestamp: number;
  originalContent: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
