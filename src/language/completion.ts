/**
 * Code completion provider for php-script
 * Provides completion for whitelisted functions and context variables
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type {
  FunctionWhitelist,
  FunctionDefinition,
  ContextVariableSchema,
  ContextVariable,
} from '../config/types';
import { logger } from '../utils/logger';

/**
 * Completion item with label and documentation
 */
export interface CompletionItem {
  label: string;
  kind: string;
  insertText: string;
  documentation?: string;
  detail?: string;
  sortText?: string;
}

/**
 * Completion provider interface
 */
export interface CompletionProvider {
  provideCompletionItems(
    lineText: string,
    lineNumber: number,
    column: number
  ): CompletionItem[];
}

/**
 * Create a function completion provider from a whitelist
 */
export function createFunctionCompletionProvider(
  whitelist: FunctionWhitelist
): CompletionProvider {
  return {
    provideCompletionItems: (lineText: string, _lineNumber: number, column: number) => {
      // Extract the word being typed
      const textBeforeCursor = lineText.substring(0, column - 1);
      const match = textBeforeCursor.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
      const prefix = match ? match[1] : '';

      // Filter functions by prefix
      const matchingFunctions = filterWhitelistedFunctions(whitelist, prefix);

      // Convert to completion items
      return matchingFunctions.map((func) => ({
        label: func.name,
        kind: 'Function',
        insertText: `${func.name}()`,
        documentation: func.documentation,
        detail: getFunctionSignature(func),
        sortText: func.name,
      }));
    },
  };
}

/**
 * Filter whitelisted functions by prefix
 */
export function filterWhitelistedFunctions(
  whitelist: FunctionWhitelist,
  prefix: string
): FunctionDefinition[] {
  const lowerPrefix = prefix.toLowerCase();

  if (!prefix) {
    return whitelist.functions;
  }

  return whitelist.functions.filter((func) =>
    func.name.toLowerCase().startsWith(lowerPrefix)
  );
}

/**
 * Get formatted function signature
 */
export function getFunctionSignature(func: FunctionDefinition): string {
  const params = func.signature.parameters
    .map((p) => {
      const optional = p.optional ? '?' : '';
      return `${p.name}${optional}: ${p.type}`;
    })
    .join(', ');

  return `${func.name}(${params}): ${func.signature.returnType}`;
}

/**
 * Register function completion provider with Monaco
 */
export function registerFunctionCompletionProvider(
  languageId: string,
  whitelist: FunctionWhitelist
): monaco.IDisposable {
  logger.info('Registering function completion provider', {
    languageId,
    functionCount: whitelist.functions.length,
  });

  return monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineText.substring(0, position.column - 1);
      const match = textBeforeCursor.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
      const prefix = match ? match[1] : '';

      const matchingFunctions = filterWhitelistedFunctions(whitelist, prefix);

      logger.debug('Function completion triggered', {
        prefix,
        matchCount: matchingFunctions.length,
        position: { line: position.lineNumber, column: position.column },
      });

      const suggestions: monaco.languages.CompletionItem[] = matchingFunctions.map((func) => ({
        label: func.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${func.name}()`,
        documentation: {
          value: func.documentation,
        },
        detail: getFunctionSignature(func),
        range: new monaco.Range(
          position.lineNumber,
          position.column - prefix.length,
          position.lineNumber,
          position.column
        ),
      }));

      return { suggestions };
    },
    triggerCharacters: ['('],
  });
}

/**
 * Create context variable completion provider
 */
export function createContextCompletionProvider(
  schema: ContextVariableSchema
): CompletionProvider {
  return {
    provideCompletionItems: (lineText: string, _lineNumber: number, column: number) => {
      const textBeforeCursor = lineText.substring(0, column - 1);

      // Match property access pattern: variable.property
      const propertyMatch = textBeforeCursor.match(/(\w+(?:\.\w+)*)\s*\.?\s*$/);

      if (!propertyMatch) {
        // Provide root-level variables
        return schema.variables.map((v) => ({
          label: v.name,
          kind: 'Variable',
          insertText: v.name,
          documentation: v.documentation,
          detail: v.type.baseType,
        }));
      }

      // Navigate nested properties
      const chain = propertyMatch[1]!.split('.');
      let currentVar = schema.variables.find((v) => v.name === chain[0]);

      if (!currentVar) {
        return [];
      }

      // Traverse property chain
      for (let i = 1; i < chain.length; i++) {
        const propName = chain[i];
        const prop = currentVar.properties?.find((p) => p.name === propName);

        if (!prop || prop.type.kind !== 'object') {
          return [];
        }

        // For nested objects, we would need the full schema
        // This is a simplified version
        currentVar = {
          name: prop.name,
          type: prop.type,
          properties: [],
          documentation: prop.documentation,
        };
      }

      // Return properties and methods of current context
      const items: CompletionItem[] = [];

      if (currentVar.properties) {
        items.push(
          ...currentVar.properties.map((p) => ({
            label: p.name,
            kind: 'Property',
            insertText: p.name,
            documentation: p.documentation,
            detail: p.type.baseType,
          }))
        );
      }

      if (currentVar.methods) {
        items.push(
          ...currentVar.methods.map((m) => ({
            label: m.name,
            kind: 'Method',
            insertText: `${m.name}()`,
            documentation: m.documentation,
            detail: getFunctionSignatureFromMethod(m),
          }))
        );
      }

      return items;
    },
  };
}

/**
 * Get formatted method signature
 */
function getFunctionSignatureFromMethod(method: {
  name: string;
  signature: { parameters: any[]; returnType: string };
}): string {
  const params = method.signature.parameters
    .map((p) => `${p.name}: ${p.type}`)
    .join(', ');
  return `${method.name}(${params}): ${method.signature.returnType}`;
}

/**
 * Register context variable completion provider with Monaco
 */
export function registerContextCompletionProvider(
  languageId: string,
  schema: ContextVariableSchema
): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineText.substring(0, position.column - 1);

      // Match property access pattern
      const propertyMatch = textBeforeCursor.match(/(\w+(?:\.\w+)*)\s*\.?\s*$/);

      if (!propertyMatch) {
        // Provide root-level variables
        const suggestions: monaco.languages.CompletionItem[] = schema.variables.map((v) => ({
          label: v.name,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: v.name,
          documentation: {
            value: v.documentation,
          },
          detail: v.type.baseType,
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
        }));

        return { suggestions };
      }

      // For nested properties, provide context-aware suggestions
      // This would require full implementation of property traversal
      return { suggestions: [] };
    },
    triggerCharacters: ['.'],
  });
}
