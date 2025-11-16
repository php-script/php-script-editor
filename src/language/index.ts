/**
 * Language module exports
 * Contains Monarch definitions, completion providers, and validation logic
 */

export { registerPhpScriptLanguage, getLanguageDefinition, isLanguageRegistered } from './monarch';
export { validateLanguageDefinition, isValidPhpScriptSyntax, hasDotNotation } from './validation';
export {
  registerFunctionCompletionProvider,
  registerContextCompletionProvider,
  createFunctionCompletionProvider,
  createContextCompletionProvider,
  filterWhitelistedFunctions,
  getFunctionSignature,
} from './completion';
export {
  registerDiagnosticProvider,
  extractFunctionCalls,
  isFunctionWhitelisted,
  getNonWhitelistedFunctions,
} from './diagnostics';
export { registerHoverProvider, getFunctionAtPosition, findFunctionDefinition } from './hover';
