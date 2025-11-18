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
import { MAX_COMPLETION_ITEMS } from '../config/defaults';

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
      const prefix = (match && match[1]) || '';

      // Filter functions by prefix
      const matchingFunctions = filterWhitelistedFunctions(whitelist, prefix);

      // Convert to completion items
      return matchingFunctions.map((func) => ({
        label: func.name,
        kind: 'Function',
        insertText: `${func.name}()`,
        documentation: func.documentation || '',
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
  // Handle empty whitelist gracefully - return empty array
  if (!whitelist || !whitelist.functions || whitelist.functions.length === 0) {
    return [];
  }

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
  // Handle empty whitelist gracefully
  if (!whitelist || !whitelist.functions || whitelist.functions.length === 0) {
    logger.info('Function whitelist is empty - no function suggestions will be provided', {
      languageId,
    });
  } else {
    logger.info('Registering function completion provider', {
      languageId,
      functionCount: whitelist.functions.length,
    });
  }

  return monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineText.substring(0, position.column - 1);
      const match = textBeforeCursor.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
      const prefix = (match && match[1]) || '';

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
          value: func.documentation || '',
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

      // Match property access pattern: variable.property.subproperty
      const dotMatch = textBeforeCursor.match(/(\w+(?:\.\w+)*)\s*\.?\s*$/);

      if (!dotMatch) {
        // No dot found - provide root-level variables
        const prefix = textBeforeCursor.match(/(\w+)$/)?.[1] || '';
        return filterContextVariables(schema, prefix);
      }

      // Split the chain and check if it ends with a dot
      const fullChain = dotMatch[1]!;
      const endsWithDot = textBeforeCursor.trim().endsWith('.');
      const chain = fullChain.split('.');

      // Find the variable
      const rootVarName = chain[0];
      const rootVar = schema.variables.find((v) => v.name === rootVarName);

      if (!rootVar) {
        return [];
      }

      // Traverse the property chain
      const context = traversePropertyChain(rootVar, chain.slice(1), schema);

      if (!context) {
        return [];
      }

      // Get prefix for filtering (text after last dot)
      const prefix = endsWithDot ? '' : chain[chain.length - 1] || '';

      // Return completions for current context
      return getContextCompletions(context, prefix);
    },
  };
}

/**
 * Filter root-level context variables by prefix
 */
function filterContextVariables(
  schema: ContextVariableSchema,
  prefix: string
): CompletionItem[] {
  const lowerPrefix = prefix.toLowerCase();

  return schema.variables
    .filter((v) => !prefix || v.name.toLowerCase().startsWith(lowerPrefix))
    .map((v) => ({
      label: v.name,
      kind: 'Variable',
      insertText: v.name,
      documentation: v.documentation,
      detail: v.type.baseType,
      sortText: '0_' + v.name, // Context variables sort before keywords
    }));
}

/**
 * Traverse property chain and return final context
 */
function traversePropertyChain(
  rootVar: ContextVariable,
  chain: string[],
  _schema: ContextVariableSchema,
  depth: number = 0
): ContextVariable | null {
  // Depth limit to prevent infinite loops (max 10 levels)
  if (depth > 10) {
    logger.warn('Context property traversal exceeded depth limit', { chain, depth });
    return null;
  }

  let currentVar = rootVar;

  // Traverse each level in the chain
  for (let i = 0; i < chain.length; i++) {
    const propName = chain[i];

    if (!propName) {
      continue; // Empty string from trailing dot
    }

    // Look for property
    const prop = currentVar.properties?.find((p) => p.name === propName);

    if (!prop) {
      // Property not found
      logger.debug('Property not found in context chain', { propName, chain });
      return null;
    }

    // If this is not the last item and it's not an object, can't traverse further
    if (i < chain.length - 1 && prop.type.kind !== 'object') {
      logger.debug('Cannot traverse non-object property', { propName, type: prop.type.kind });
      return null;
    }

    // Create a context variable from the property for further traversal
    currentVar = {
      name: prop.name,
      type: prop.type,
      properties: [], // Would need schema lookup for nested types
      methods: [], // Would need schema lookup for nested types
      documentation: prop.documentation,
    };
  }

  return currentVar;
}

/**
 * Get completions for a context variable
 */
function getContextCompletions(
  context: ContextVariable,
  prefix: string
): CompletionItem[] {
  const items: CompletionItem[] = [];
  const lowerPrefix = prefix.toLowerCase();
  let truncated = false;
  let totalAvailable = 0;

  // Add properties
  if (context.properties) {
    const filteredProps = context.properties.filter(
      (p) => !prefix || p.name.toLowerCase().startsWith(lowerPrefix)
    );
    totalAvailable += filteredProps.length;

    // Limit properties to prevent UI lag
    const propsToShow = filteredProps.slice(0, MAX_COMPLETION_ITEMS);
    if (filteredProps.length > MAX_COMPLETION_ITEMS) {
      truncated = true;
    }

    items.push(
      ...propsToShow.map((p) => ({
        label: p.name,
        kind: p.readonly ? 'Constant' : 'Property',
        insertText: p.name,
        documentation: p.documentation,
        detail: `${p.type.baseType}${p.readonly ? ' (readonly)' : ''}`,
        sortText: '0_' + p.name, // Properties sort before keywords
      }))
    );
  }

  // Add methods (if we haven't hit the limit yet)
  if (context.methods && items.length < MAX_COMPLETION_ITEMS) {
    const filteredMethods = context.methods.filter(
      (m) => !prefix || m.name.toLowerCase().startsWith(lowerPrefix)
    );
    totalAvailable += filteredMethods.length;

    const remaining = MAX_COMPLETION_ITEMS - items.length;
    const methodsToShow = filteredMethods.slice(0, remaining);
    if (filteredMethods.length > remaining) {
      truncated = true;
    }

    items.push(
      ...methodsToShow.map((m) => ({
        label: m.name,
        kind: 'Method',
        insertText: `${m.name}()`,
        documentation: m.documentation,
        detail: getFunctionSignatureFromMethod(m),
      }))
    );
  }

  // Add "more available" indicator if truncated
  if (truncated) {
    const hiddenCount = totalAvailable - items.length;
    items.push({
      label: `... ${hiddenCount} more available`,
      kind: 'Text',
      insertText: '',
      documentation: `Type more characters to narrow down the ${hiddenCount} additional completions`,
      detail: 'Continue typing to filter',
      sortText: 'zzz', // Sort to bottom
    });

    logger.warn('Context completions truncated due to large size', {
      contextName: context.name,
      totalAvailable,
      shown: items.length - 1, // Exclude the "more" indicator
      hidden: hiddenCount,
    });
  }

  logger.debug('Context completions generated', {
    contextName: context.name,
    prefix,
    itemCount: items.length,
    truncated,
  });

  return items;
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
  logger.info('Registering context variable completion provider', {
    languageId,
    variableCount: schema.variables.length,
  });

  return monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems: (model, position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineText.substring(0, position.column - 1);

      // Match property access pattern: variable.property.subproperty
      const dotMatch = textBeforeCursor.match(/(\w+(?:\.\w+)*)\s*\.?\s*$/);

      if (!dotMatch) {
        // Provide root-level variables
        const prefix = textBeforeCursor.match(/(\w+)$/)?.[1] || '';
        const variables = filterContextVariables(schema, prefix);

        const suggestions: monaco.languages.CompletionItem[] = variables.map((v) => ({
          label: v.label,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: v.insertText,
          documentation: {
            value: v.documentation || '',
          },
          detail: v.detail,
          range: new monaco.Range(
            position.lineNumber,
            position.column - prefix.length,
            position.lineNumber,
            position.column
          ),
        }));

        logger.debug('Root-level context completion triggered', {
          prefix,
          suggestionCount: suggestions.length,
        });

        return { suggestions };
      }

      // Handle nested property access
      const fullChain = dotMatch[1]!;
      const endsWithDot = textBeforeCursor.trim().endsWith('.');
      const chain = fullChain.split('.');

      // Find the variable
      const rootVarName = chain[0];
      const rootVar = schema.variables.find((v) => v.name === rootVarName);

      if (!rootVar) {
        return { suggestions: [] };
      }

      // Traverse the property chain
      const context = traversePropertyChain(rootVar, chain.slice(1), schema);

      if (!context) {
        return { suggestions: [] };
      }

      // Get prefix for filtering
      const prefix = endsWithDot ? '' : chain[chain.length - 1] || '';
      const completions = getContextCompletions(context, prefix);

      const suggestions: monaco.languages.CompletionItem[] = completions.map((c) => {
        const kind =
          c.kind === 'Method'
            ? monaco.languages.CompletionItemKind.Method
            : c.kind === 'Constant'
            ? monaco.languages.CompletionItemKind.Constant
            : monaco.languages.CompletionItemKind.Property;

        return {
          label: c.label,
          kind,
          insertText: c.insertText,
          documentation: {
            value: c.documentation || '',
          },
          detail: c.detail,
          range: new monaco.Range(
            position.lineNumber,
            position.column - prefix.length,
            position.lineNumber,
            position.column
          ),
        };
      });

      logger.debug('Nested property completion triggered', {
        chain: fullChain,
        prefix,
        suggestionCount: suggestions.length,
      });

      return { suggestions };
    },
    triggerCharacters: ['.'],
  });
}
