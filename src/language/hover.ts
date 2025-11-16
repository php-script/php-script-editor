/**
 * Hover provider for php-script
 * Provides documentation and signature information on hover
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { FunctionWhitelist, FunctionDefinition } from '../config/types';

/**
 * Get function at position
 */
export function getFunctionAtPosition(
  model: monaco.editor.ITextModel,
  position: monaco.Position
): string | null {
  const word = model.getWordAtPosition(position);
  if (!word) {
    return null;
  }

  // Check if this is a function call (followed by opening parenthesis)
  const lineContent = model.getLineContent(position.lineNumber);
  const afterWord = lineContent.substring(word.endColumn - 1).trim();

  if (afterWord.startsWith('(')) {
    return word.word;
  }

  return null;
}

/**
 * Find function definition in whitelist
 */
export function findFunctionDefinition(
  functionName: string,
  whitelist: FunctionWhitelist
): FunctionDefinition | null {
  return whitelist.functions.find((f) => f.name === functionName) || null;
}

/**
 * Format function documentation for hover
 */
export function formatFunctionDocumentation(func: FunctionDefinition): string {
  const signature = formatSignature(func);
  const params = formatParameters(func);
  const returnType = `**Returns**: \`${func.signature.returnType}\``;

  let doc = `### ${func.name}\n\n`;
  doc += `\`\`\`typescript\n${signature}\n\`\`\`\n\n`;
  doc += `${func.documentation}\n\n`;

  if (params) {
    doc += `**Parameters**:\n${params}\n\n`;
  }

  doc += `${returnType}\n`;

  if (func.category) {
    doc += `\n*Category*: ${func.category}`;
  }

  if (func.deprecated) {
    doc += `\n\n⚠️ **DEPRECATED**`;
  }

  return doc;
}

/**
 * Format function signature
 */
function formatSignature(func: FunctionDefinition): string {
  const params = func.signature.parameters
    .map((p) => {
      const optional = p.optional ? '?' : '';
      const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : '';
      return `${p.name}${optional}: ${p.type}${defaultVal}`;
    })
    .join(', ');

  return `${func.name}(${params}): ${func.signature.returnType}`;
}

/**
 * Format parameter documentation
 */
function formatParameters(func: FunctionDefinition): string {
  if (func.signature.parameters.length === 0) {
    return '';
  }

  return func.signature.parameters
    .map((p) => {
      const optional = p.optional ? ' (optional)' : '';
      const defaultVal = p.defaultValue ? ` - default: \`${p.defaultValue}\`` : '';
      return `- \`${p.name}\`: \`${p.type}\`${optional}${defaultVal}`;
    })
    .join('\n');
}

/**
 * Register hover provider for functions
 */
export function registerHoverProvider(
  languageId: string,
  whitelist: FunctionWhitelist
): monaco.IDisposable {
  return monaco.languages.registerHoverProvider(languageId, {
    provideHover: (model, position) => {
      const functionName = getFunctionAtPosition(model, position);

      if (!functionName) {
        return null;
      }

      const funcDef = findFunctionDefinition(functionName, whitelist);

      if (!funcDef) {
        return null;
      }

      const documentation = formatFunctionDocumentation(funcDef);

      return {
        contents: [
          {
            value: documentation,
          },
        ],
      };
    },
  });
}
