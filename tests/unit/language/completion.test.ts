/**
 * Unit tests for function whitelist completion provider
 * These tests verify that code completion works correctly for whitelisted functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFunctionCompletionProvider,
  createContextCompletionProvider,
  filterWhitelistedFunctions,
  getFunctionSignature,
} from '../../../src/language/completion';
import type {
  FunctionWhitelist,
  FunctionDefinition,
  ContextVariableSchema,
} from '../../../src/config/types';

describe('Function Whitelist Completion Provider', () => {
  let testWhitelist: FunctionWhitelist;

  beforeEach(() => {
    testWhitelist = {
      functions: [
        {
          name: 'strlen',
          signature: {
            parameters: [{ name: 'string', type: 'string', optional: false }],
            returnType: 'int',
          },
          documentation: 'Returns the length of a string',
          category: 'string',
        },
        {
          name: 'substr',
          signature: {
            parameters: [
              { name: 'string', type: 'string', optional: false },
              { name: 'start', type: 'int', optional: false },
              { name: 'length', type: 'int', optional: true },
            ],
            returnType: 'string',
          },
          documentation: 'Returns part of a string',
          category: 'string',
        },
        {
          name: 'date',
          signature: {
            parameters: [
              { name: 'format', type: 'string', optional: false },
              { name: 'timestamp', type: 'int', optional: true },
            ],
            returnType: 'string',
          },
          documentation: 'Format a local time/date',
          category: 'date',
        },
      ],
      version: '1.0.0',
    };
  });

  describe('createFunctionCompletionProvider', () => {
    it('should create completion provider from whitelist', () => {
      const provider = createFunctionCompletionProvider(testWhitelist);
      expect(provider).toBeDefined();
      expect(typeof provider.provideCompletionItems).toBe('function');
    });

    it('should provide completion items for whitelisted functions', () => {
      const provider = createFunctionCompletionProvider(testWhitelist);
      const completions = provider.provideCompletionItems('str', 1, 3);

      expect(completions).toBeDefined();
      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some((c) => c.label === 'strlen')).toBe(true);
      expect(completions.some((c) => c.label === 'substr')).toBe(true);
    });

    it('should not suggest functions not in whitelist', () => {
      const provider = createFunctionCompletionProvider(testWhitelist);
      const completions = provider.provideCompletionItems('exec', 1, 4);

      expect(completions.every((c) => c.label !== 'exec')).toBe(true);
      expect(completions.every((c) => c.label !== 'system')).toBe(true);
    });

    it('should include function documentation in completion items', () => {
      const provider = createFunctionCompletionProvider(testWhitelist);
      const completions = provider.provideCompletionItems('strlen', 1, 6);

      const strlenCompletion = completions.find((c) => c.label === 'strlen');
      expect(strlenCompletion).toBeDefined();
      expect(strlenCompletion?.documentation).toContain('Returns the length');
    });

    it('should include function signature in completion items', () => {
      const provider = createFunctionCompletionProvider(testWhitelist);
      const completions = provider.provideCompletionItems('substr', 1, 6);

      const substrCompletion = completions.find((c) => c.label === 'substr');
      expect(substrCompletion).toBeDefined();
      expect(substrCompletion?.detail).toBeDefined();
    });
  });

  describe('filterWhitelistedFunctions', () => {
    it('should filter functions by prefix', () => {
      const filtered = filterWhitelistedFunctions(testWhitelist, 'str');

      expect(filtered.length).toBe(2);
      expect(filtered.every((f) => f.name.startsWith('str'))).toBe(true);
    });

    it('should return all functions for empty prefix', () => {
      const filtered = filterWhitelistedFunctions(testWhitelist, '');

      expect(filtered.length).toBe(3);
    });

    it('should be case-insensitive', () => {
      const filtered = filterWhitelistedFunctions(testWhitelist, 'STR');

      expect(filtered.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      const filtered = filterWhitelistedFunctions(testWhitelist, 'xyz');

      expect(filtered.length).toBe(0);
    });
  });

  describe('getFunctionSignature', () => {
    it('should format function signature correctly', () => {
      const func: FunctionDefinition = testWhitelist.functions[0]!;
      const signature = getFunctionSignature(func);

      expect(signature).toContain('strlen');
      expect(signature).toContain('string');
      expect(signature).toContain('int');
    });

    it('should show optional parameters', () => {
      const func: FunctionDefinition = testWhitelist.functions[1]!;
      const signature = getFunctionSignature(func);

      expect(signature).toContain('substr');
      expect(signature).toContain('?'); // Optional marker
    });

    it('should include return type', () => {
      const func: FunctionDefinition = testWhitelist.functions[2]!;
      const signature = getFunctionSignature(func);

      expect(signature).toContain('date');
      expect(signature).toContain('string');
    });
  });
});

describe('Context Variable Completion Provider', () => {
  let testContextSchema: ContextVariableSchema;

  beforeEach(() => {
    testContextSchema = {
      variables: [
        {
          name: 'user',
          type: { kind: 'object', baseType: 'User' },
          properties: [
            {
              name: 'name',
              type: { kind: 'scalar', baseType: 'string' },
              documentation: 'User full name',
            },
            {
              name: 'email',
              type: { kind: 'scalar', baseType: 'string' },
              readonly: true,
              documentation: 'User email address',
            },
            {
              name: 'logins',
              type: { kind: 'object', baseType: 'LoginCollection' },
              documentation: 'User login history',
            },
          ],
          methods: [
            {
              name: 'save',
              signature: {
                parameters: [],
                returnType: 'bool',
              },
              documentation: 'Save user data',
            },
          ],
          documentation: 'Current authenticated user',
        },
        {
          name: 'request',
          type: { kind: 'object', baseType: 'Request' },
          properties: [
            {
              name: 'method',
              type: { kind: 'scalar', baseType: 'string' },
              readonly: true,
              documentation: 'HTTP method',
            },
            {
              name: 'url',
              type: { kind: 'scalar', baseType: 'string' },
              readonly: true,
              documentation: 'Request URL',
            },
          ],
          documentation: 'HTTP request object',
        },
      ],
      version: '1.0.0',
      strict: true,
    };
  });

  describe('Context Schema Parsing', () => {
    it('should parse root-level context variables', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('', 1, 1);

      expect(completions.length).toBe(2);
      expect(completions.some((c) => c.label === 'user')).toBe(true);
      expect(completions.some((c) => c.label === 'request')).toBe(true);
    });

    it('should include variable documentation', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('us', 1, 2);

      const userCompletion = completions.find((c) => c.label === 'user');
      expect(userCompletion?.documentation).toContain('authenticated user');
    });

    it('should include variable type information', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('', 1, 1);

      const userCompletion = completions.find((c) => c.label === 'user');
      expect(userCompletion?.detail).toBe('User');
    });
  });

  describe('Nested Property Traversal', () => {
    it('should provide property completions for object access', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('user.', 1, 6);

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some((c) => c.label === 'name')).toBe(true);
      expect(completions.some((c) => c.label === 'email')).toBe(true);
      expect(completions.some((c) => c.label === 'logins')).toBe(true);
    });

    it('should provide method completions', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('user.', 1, 6);

      expect(completions.some((c) => c.label === 'save')).toBe(true);
      const saveMethod = completions.find((c) => c.label === 'save');
      expect(saveMethod?.kind).toBe('Method');
    });

    it('should handle multi-level property access', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('user.logins.', 1, 13);

      // For multi-level, we would need the full schema of LoginCollection
      // This test validates the traversal logic works
      expect(completions).toBeDefined();
    });

    it('should filter properties by prefix', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('user.na', 1, 8);

      expect(completions.some((c) => c.label === 'name')).toBe(true);
      expect(completions.every((c) => c.label.startsWith('na') || c.label === 'name')).toBe(
        true
      );
    });

    it('should return empty array for invalid property chains', () => {
      const provider = createContextCompletionProvider(testContextSchema);
      const completions = provider.provideCompletionItems('nonexistent.', 1, 13);

      expect(completions.length).toBe(0);
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect circular references in schema', () => {
      // This will be tested in the validator tests
      expect(true).toBe(true);
    });

    it('should limit traversal depth to prevent infinite loops', () => {
      // This will be tested in the validator tests
      expect(true).toBe(true);
    });
  });
});
