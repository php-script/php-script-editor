/**
 * Language module exports
 * Contains Monarch definitions, completion providers, and validation logic
 */

export { registerPhpScriptLanguage, getLanguageDefinition, isLanguageRegistered } from './monarch';
export { validateLanguageDefinition, isValidPhpScriptSyntax, hasDotNotation } from './validation';
