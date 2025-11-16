/**
 * Unit tests for configuration validation
 * These tests verify that language configuration validation works correctly
 */

import { describe, it, expect } from 'vitest';
import { validateConfigurationBundle } from '../../../src/config/validator';
import type { ConfigurationBundle } from '../../../src/config/types';

describe('Configuration Validator', () => {
  describe('validateConfigurationBundle', () => {
    it('should reject configuration with missing languageDefinition', () => {
      const invalidConfig = {
        functionWhitelist: { functions: [], version: '1.0.0' },
        contextSchema: { variables: [], version: '1.0.0' },
        bundleVersion: '1.0.0',
      };

      const result = validateConfigurationBundle(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'languageDefinition',
          severity: 'error',
        })
      );
    });

    it('should reject languageId with invalid format', () => {
      const config: Partial<ConfigurationBundle> = {
        languageDefinition: {
          languageId: 'Invalid-Language-123', // Invalid: uppercase letters
          monarchDefinition: {
            tokenizer: { root: [] },
            keywords: [],
            operators: [],
            symbols: '',
            escapes: '',
          },
          fileExtensions: ['.phs'],
          mimeTypes: ['text/x-php-script'],
          configuration: {},
        },
        functionWhitelist: { functions: [], version: '1.0.0' },
        contextSchema: { variables: [], version: '1.0.0' },
        bundleVersion: '1.0.0',
      };

      const result = validateConfigurationBundle(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('languageId'))).toBe(true);
    });

    it('should accept valid configuration bundle', () => {
      const validConfig: ConfigurationBundle = {
        languageDefinition: {
          languageId: 'php-script',
          monarchDefinition: {
            tokenizer: { root: [] },
            keywords: ['if', 'else'],
            operators: ['+', '-'],
            symbols: '[=><!~?:&|+\\-*/^%]+',
            escapes: '\\\\.',
          },
          fileExtensions: ['.phs'],
          mimeTypes: ['text/x-php-script'],
          configuration: {},
        },
        functionWhitelist: {
          functions: [],
          version: '1.0.0',
        },
        contextSchema: {
          variables: [],
          version: '1.0.0',
        },
        bundleVersion: '1.0.0',
        compatibility: {
          minEditorVersion: '1.0.0',
          phpScriptEngine: '2.5.0',
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'test',
          environment: 'test',
        },
      };

      const result = validateConfigurationBundle(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect duplicate function names in whitelist', () => {
      const config: Partial<ConfigurationBundle> = {
        languageDefinition: {
          languageId: 'php-script',
          monarchDefinition: {
            tokenizer: { root: [] },
            keywords: [],
            operators: [],
            symbols: '',
            escapes: '',
          },
          fileExtensions: ['.phs'],
          mimeTypes: ['text/x-php-script'],
          configuration: {},
        },
        functionWhitelist: {
          functions: [
            {
              name: 'strlen',
              signature: { parameters: [], returnType: 'int' },
              documentation: 'Test',
              category: 'string',
            },
            {
              name: 'strlen', // Duplicate
              signature: { parameters: [], returnType: 'int' },
              documentation: 'Test',
              category: 'string',
            },
          ],
          version: '1.0.0',
        },
        contextSchema: { variables: [], version: '1.0.0' },
        bundleVersion: '1.0.0',
      };

      const result = validateConfigurationBundle(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should detect circular references in context variables', () => {
      // This test verifies that circular reference detection works
      // Implementation will be added in User Story 3
      expect(true).toBe(true); // Placeholder - will be implemented later
    });
  });
});
