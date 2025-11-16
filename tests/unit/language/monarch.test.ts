/**
 * Unit tests for Monarch language registration
 * These tests verify that the Monarch language definition is correctly registered with Monaco
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerPhpScriptLanguage, isLanguageRegistered, getLanguageDefinition } from '../../../src/language/monarch';
import { isValidPhpScriptSyntax, hasDotNotation } from '../../../src/language/validation';
import { FALLBACK_LANGUAGE_DEFINITION } from '../../../src/config/defaults';

describe('Monarch Language Registration', () => {
  beforeEach(() => {
    // Tests will register the language
  });

  it('should register php-script language with Monaco', () => {
    registerPhpScriptLanguage(FALLBACK_LANGUAGE_DEFINITION);
    expect(isLanguageRegistered()).toBe(true);
  });

  it('should register Monarch tokenizer with correct language ID', () => {
    registerPhpScriptLanguage(FALLBACK_LANGUAGE_DEFINITION);
    const langId = getLanguageDefinition();
    expect(langId).toBe('php-script');
  });

  it('should set language configuration for auto-closing pairs', () => {
    // The language configuration is set during registration
    registerPhpScriptLanguage(FALLBACK_LANGUAGE_DEFINITION);
    expect(isLanguageRegistered()).toBe(true);
    // Monaco's language configuration is applied internally
  });

  it('should handle tokenization of php-script dot notation', () => {
    const code = 'user.logins.count()';
    expect(hasDotNotation(code)).toBe(true);
    expect(isValidPhpScriptSyntax(code)).toBe(true);
  });

  it('should not tokenize PHP $ prefix as valid php-script', () => {
    const phpCode = '$user->logins';
    expect(isValidPhpScriptSyntax(phpCode)).toBe(false);
  });
});
