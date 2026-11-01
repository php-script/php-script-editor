/**
 * Shapes produced by php-script v2's `MonarchLanguageDefinitionService`.
 *
 * `getDefinition()`      -> {@link MonarchDefinition}
 * `getCompletionItems()` -> {@link CompletionItems}
 */

export interface MonarchDefinition {
  keywords: string[];
  loopKeywords?: string[];
  allowedFunctions: string[];
  contextVariables: string[];
  operators: string[];
  symbols: string;
  tokenizer: Record<string, unknown[]>;
  [key: string]: unknown;
}

export type CompletionKind =
  'Function' | 'Method' | 'Variable' | 'Property' | 'Keyword' | 'Snippet';

export interface CompletionEntry {
  label: string;
  kind: CompletionKind | string;
  detail?: string;
  doc?: string;
  snippet?: string;
}

export interface ClassDefinition {
  properties: CompletionEntry[];
  methods: CompletionEntry[];
}

export interface CompletionItems {
  globalFunctions: CompletionEntry[];
  globalVariables: CompletionEntry[];
  classes: Record<string, ClassDefinition>;
  controlFlows: CompletionEntry[];
  loopControls: CompletionEntry[];
  loopKeywords: string[];
}

/** The JSON the element consumes (`config` attribute/property or `config-url` response). */
export interface PhpScriptConfig {
  definition: MonarchDefinition;
  completions: CompletionItems;
}

/** One entry of php-script's `LintDiagnostic::toArray()`. */
export interface LintDiagnostic {
  rule?: string;
  message: string;
  line: number;
  column: number;
  length?: number;
  offset?: number;
  severity?: 'error' | 'warning' | string;
}

export type SaveMethod = 'POST' | 'PUT' | 'PATCH' | string;

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
