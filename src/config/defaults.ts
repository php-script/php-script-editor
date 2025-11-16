/**
 * Default and fallback configuration values for php-script Monaco Editor
 */

import type {
  ConfigurationBundle,
  LanguageDefinition,
  FunctionWhitelist,
  ContextVariableSchema,
} from './types';

/**
 * Minimal fallback language definition for when configuration fails to load
 * Provides basic keyword highlighting only
 */
export const FALLBACK_LANGUAGE_DEFINITION: LanguageDefinition = {
  languageId: 'php-script',
  fileExtensions: ['.phs', '.phpscript'],
  mimeTypes: ['text/x-php-script'],
  monarchDefinition: {
    keywords: [
      'if',
      'else',
      'elseif',
      'for',
      'foreach',
      'while',
      'do',
      'switch',
      'case',
      'default',
      'break',
      'continue',
      'return',
      'function',
      'true',
      'false',
      'null',
      'and',
      'or',
      'not',
    ],
    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
      '==',
      '<=',
      '>=',
      '!=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '&',
      '|',
      '^',
      '%',
      '<<',
      '>>',
      '>>>',
      '+=',
      '-=',
      '*=',
      '/=',
      '&=',
      '|=',
      '^=',
      '%=',
      '<<=',
      '>>=',
      '>>>=',
    ],
    symbols: '[=><!~?:&|+\\-*/^%]+',
    escapes: '\\\\(?:[abfnrtv\\\\"\\\'\\\\]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})',
    tokenizer: {
      root: [
        // Identifiers and keywords
        [
          '[a-zA-Z_][a-zA-Z0-9_]*',
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],

        // Whitespace
        [/[ \t\r\n]+/, 'white'],

        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],

        // Numbers
        [/\d+\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],

        // Dot notation for object access
        [/\./, 'delimiter'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  },
  configuration: {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  },
};

/**
 * Empty function whitelist fallback
 */
export const FALLBACK_FUNCTION_WHITELIST: FunctionWhitelist = {
  functions: [],
  version: '1.0.0',
  namespace: 'global',
};

/**
 * Empty context schema fallback
 */
export const FALLBACK_CONTEXT_SCHEMA: ContextVariableSchema = {
  variables: [],
  version: '1.0.0',
  strict: true,
};

/**
 * Complete fallback configuration bundle
 */
export const FALLBACK_CONFIGURATION_BUNDLE: ConfigurationBundle = {
  languageDefinition: FALLBACK_LANGUAGE_DEFINITION,
  functionWhitelist: FALLBACK_FUNCTION_WHITELIST,
  contextSchema: FALLBACK_CONTEXT_SCHEMA,
  bundleVersion: '1.0.0',
  compatibility: {
    minEditorVersion: '1.0.0',
    phpScriptEngine: 'unknown',
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    generatedBy: 'fallback',
    environment: 'fallback',
  },
};

/**
 * Default editor options
 */
export const DEFAULT_EDITOR_OPTIONS = {
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
};

/**
 * Default storage key prefix for localStorage
 */
export const DEFAULT_STORAGE_KEY_PREFIX = 'php-script-editor-content-';

/**
 * Maximum localStorage content size (5MB)
 */
export const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

/**
 * Debounce delay for auto-save (500ms)
 */
export const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * Maximum nested depth for context variables
 */
export const MAX_CONTEXT_DEPTH = 10;
