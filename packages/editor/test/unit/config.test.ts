import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_CONFIG, configKey, normalizeConfig } from '../../src/config.js';
import sample from '../fixtures/sample-config.json';

describe('normalizeConfig', () => {
  it('returns the default config for empty input', () => {
    expect(normalizeConfig(null)).toBe(DEFAULT_CONFIG);
    expect(normalizeConfig('')).toBe(DEFAULT_CONFIG);
  });

  it('accepts the php-script v2 service output', () => {
    const config = normalizeConfig(sample);
    expect(config.definition.contextVariables).toEqual(['user', 'items', 'taxRate']);
    expect(config.definition.allowedFunctions).toContain('strtoupper');
    expect(Object.keys(config.completions.classes)).toContain('DevServer\\User');
    expect(config.completions.loopKeywords).toEqual(['break', 'continue']);
  });

  it('accepts JSON strings and alternative key names', () => {
    const config = normalizeConfig(
      JSON.stringify({ language: sample.definition, completionItems: sample.completions }),
    );
    expect(config.completions.globalVariables.map((v) => v.label)).toContain('user');
  });

  it('accepts a bare definition', () => {
    const config = normalizeConfig(sample.definition);
    expect(config.definition.tokenizer).toBeDefined();
    expect(config.completions.globalVariables).toEqual([]);
  });

  it('treats PHP empty arrays for classes as no classes', () => {
    const config = normalizeConfig({ completions: { ...sample.completions, classes: [] } });
    expect(config.completions.classes).toEqual({});
  });

  it('rejects broken input', () => {
    expect(() => normalizeConfig('{nope')).toThrow(ConfigError);
    expect(() => normalizeConfig({ foo: 1 })).toThrow(ConfigError);
    expect(() => normalizeConfig({ definition: { keywords: [] } })).toThrow(/tokenizer/);
    expect(() => normalizeConfig(42)).toThrow(ConfigError);
  });

  it('gives distinct configs distinct keys', () => {
    const a = normalizeConfig(sample);
    const b = normalizeConfig({
      ...sample,
      completions: { ...sample.completions, globalVariables: [] },
    });
    expect(configKey(DEFAULT_CONFIG)).toBe('default');
    expect(configKey(a)).toBe(configKey(normalizeConfig(sample)));
    expect(configKey(a)).not.toBe(configKey(b));
  });
});
