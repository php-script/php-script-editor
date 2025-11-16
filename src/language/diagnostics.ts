/**
 * Diagnostic provider for php-script
 * Validates code and provides warnings/errors
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { FunctionWhitelist } from '../config/types';

/**
 * Extract function calls from code
 */
export function extractFunctionCalls(code: string): string[] {
  const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = functionPattern.exec(code)) !== null) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }

  return Array.from(new Set(matches)); // Remove duplicates
}

/**
 * Check if a function is in the whitelist
 */
export function isFunctionWhitelisted(
  functionName: string,
  whitelist: FunctionWhitelist
): boolean {
  return whitelist.functions.some((f) => f.name === functionName);
}

/**
 * Get non-whitelisted functions from code
 */
export function getNonWhitelistedFunctions(
  code: string,
  whitelist: FunctionWhitelist
): string[] {
  const allFunctions = extractFunctionCalls(code);
  return allFunctions.filter((fn) => !isFunctionWhitelisted(fn, whitelist));
}

/**
 * Create diagnostic markers for non-whitelisted functions
 */
export function createNonWhitelistedFunctionMarkers(
  model: monaco.editor.ITextModel,
  whitelist: FunctionWhitelist
): monaco.editor.IMarkerData[] {
  const code = model.getValue();
  const nonWhitelisted = getNonWhitelistedFunctions(code, whitelist);

  if (nonWhitelisted.length === 0) {
    return [];
  }

  const markers: monaco.editor.IMarkerData[] = [];

  // Find positions of non-whitelisted functions in the code
  nonWhitelisted.forEach((funcName) => {
    const pattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null) {
      const startOffset = match.index;
      const endOffset = startOffset + funcName.length;

      const startPos = model.getPositionAt(startOffset);
      const endPos = model.getPositionAt(endOffset);

      markers.push({
        severity: monaco.MarkerSeverity.Warning,
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        message: `Function '${funcName}' is not in the whitelist and may not be available at runtime`,
        source: 'php-script',
      });
    }
  });

  return markers;
}

/**
 * Register diagnostic provider for non-whitelisted functions
 */
export function registerDiagnosticProvider(
  languageId: string,
  whitelist: FunctionWhitelist
): monaco.IDisposable {
  const modelChangeListener = monaco.editor.onDidCreateModel((model) => {
    if (model.getLanguageId() === languageId) {
      // Validate on model creation
      updateDiagnostics(model, whitelist);

      // Validate on content change
      const contentChangeDisposable = model.onDidChangeContent(() => {
        updateDiagnostics(model, whitelist);
      });

      // Clean up when model is disposed
      model.onWillDispose(() => {
        contentChangeDisposable.dispose();
        monaco.editor.setModelMarkers(model, 'php-script', []);
      });
    }
  });

  return modelChangeListener;
}

/**
 * Update diagnostics for a model
 */
function updateDiagnostics(
  model: monaco.editor.ITextModel,
  whitelist: FunctionWhitelist
): void {
  const markers = createNonWhitelistedFunctionMarkers(model, whitelist);
  monaco.editor.setModelMarkers(model, 'php-script', markers);
}
