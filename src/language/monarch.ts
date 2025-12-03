/**
 * Monarch language definition registration for php-script
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { LanguageDefinition } from '../config/types';
import { FALLBACK_LANGUAGE_DEFINITION } from '../config/defaults';

/**
 * Register php-script language with Monaco
 */
export function registerPhpScriptLanguage(languageDefinition?: LanguageDefinition): void {
  const definition = languageDefinition || FALLBACK_LANGUAGE_DEFINITION;

  // Register the language
  const languages = monaco.languages.getLanguages();
  const isRegistered = languages.some((lang) => lang.id === definition.languageId);

  if (!isRegistered) {
    monaco.languages.register({
      id: definition.languageId,
      extensions: definition.fileExtensions,
      mimetypes: definition.mimeTypes,
    });
  }

  // Set the Monarch tokenizer
  monaco.languages.setMonarchTokensProvider(
    definition.languageId,
    definition.monarchDefinition as monaco.languages.IMonarchLanguage
  );

  // Set language configuration
  if (definition.configuration) {
    monaco.languages.setLanguageConfiguration(
      definition.languageId,
      definition.configuration as monaco.languages.LanguageConfiguration
    );
  }
}

/**
 * Get the current language definition for php-script
 */
export function getLanguageDefinition(): string | undefined {
  const languages = monaco.languages.getLanguages();
  const phpScriptLang = languages.find((lang) => lang.id === 'php-script');
  return phpScriptLang?.id;
}

/**
 * Check if php-script language is registered
 */
export function isLanguageRegistered(): boolean {
  return getLanguageDefinition() !== undefined;
}
