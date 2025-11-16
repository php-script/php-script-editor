/**
 * Language validation logic for php-script
 */

import type { LanguageDefinition } from '../config/types';

/**
 * Validate that a language definition is well-formed
 */
export function validateLanguageDefinition(
  definition: LanguageDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate languageId format
  if (!/^[a-z][a-z0-9-]*$/.test(definition.languageId)) {
    errors.push('Language ID must match pattern ^[a-z][a-z0-9-]*$');
  }

  // Validate that tokenizer has a root state
  if (!definition.monarchDefinition.tokenizer.root) {
    errors.push('Monarch definition must contain a root tokenizer state');
  }

  // Validate file extensions
  if (!definition.fileExtensions || definition.fileExtensions.length === 0) {
    errors.push('At least one file extension is required');
  }

  definition.fileExtensions?.forEach((ext) => {
    if (!ext.startsWith('.')) {
      errors.push(`File extension must start with a dot: ${ext}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a piece of code contains valid php-script syntax
 */
export function isValidPhpScriptSyntax(code: string): boolean {
  // Check for invalid PHP-specific syntax
  const invalidPatterns = [
    /\$[a-zA-Z_]/,    // PHP variables ($variable)
    /->/,             // PHP object operator
    /::/,             // PHP static operator
  ];

  return !invalidPatterns.some((pattern) => pattern.test(code));
}

/**
 * Check if code contains valid dot notation (php-script style)
 */
export function hasDotNotation(code: string): boolean {
  // Match identifiers followed by dots (e.g., user.logins, data.count())
  return /[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*/.test(code);
}
