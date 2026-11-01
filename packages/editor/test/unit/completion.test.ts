import { describe, expect, it } from 'vitest';
import {
  buildSuggestions,
  findLocalVariables,
  hoverFor,
  isInsideLoop,
  maskStringsAndComments,
  memberChainBefore,
  resolveChain,
} from '../../src/completion.js';
import { normalizeConfig } from '../../src/config.js';
import sample from '../fixtures/sample-config.json';

const config = normalizeConfig(sample);
const labels = (code: string, textBeforeWord = code) =>
  buildSuggestions({ code, textBeforeWord }, config).map((s) => s.label);

describe('maskStringsAndComments', () => {
  it('keeps positions and hides string and comment contents', () => {
    const code = `x = "a{b}"; // foreach {\ny = 'c'`;
    const masked = maskStringsAndComments(code);
    expect(masked).toHaveLength(code.length);
    expect(masked).not.toContain('{');
    expect(masked).not.toContain('foreach');
    expect(masked).toContain('y =');
  });
});

describe('isInsideLoop', () => {
  it('detects open loop bodies', () => {
    expect(isInsideLoop('foreach (items as i) {\n  ')).toBe(true);
    expect(isInsideLoop('for (i = 0; i < 3; i++) { if (x) { ')).toBe(true);
    expect(isInsideLoop('foreach (items as i) { }\n')).toBe(false);
    expect(isInsideLoop('if (x) { ')).toBe(false);
    expect(isInsideLoop('x = "foreach (a as b) {"; ')).toBe(false);
  });
});

describe('findLocalVariables', () => {
  it('finds assignments and foreach variables', () => {
    expect(
      findLocalVariables('total = 0;\nforeach (items as key, value) { count++; }').sort(),
    ).toEqual(['count', 'key', 'total', 'value'].sort());
  });
  it('ignores comparisons', () => {
    expect(findLocalVariables('if (a == b) { }')).toEqual([]);
  });
});

describe('memberChainBefore', () => {
  it('parses chains and drops call arguments', () => {
    expect(memberChainBefore('echo user.')).toEqual(['user']);
    expect(memberChainBefore('x = user.address().')).toEqual(['user', 'address']);
    expect(memberChainBefore('user.greet("x").')).toEqual(['user', 'greet']);
  });
  it('rejects non-member dots', () => {
    expect(memberChainBefore("'a'.")).toBeNull();
    expect(memberChainBefore('1.')).toBeNull();
    expect(memberChainBefore('user')).toBeNull();
  });
});

describe('resolveChain', () => {
  it('follows properties and method return types', () => {
    expect(resolveChain(['user'], config)).toBe('DevServer\\User');
    expect(resolveChain(['user', 'address'], config)).toBe('DevServer\\Address');
    expect(resolveChain(['user', 'name'], config)).toBeNull();
    expect(resolveChain(['nobody'], config)).toBeNull();
  });
});

describe('buildSuggestions', () => {
  it('offers globals, functions, snippets and keywords', () => {
    const result = labels('');
    expect(result).toEqual(
      expect.arrayContaining(['user', 'items', 'taxRate', 'strtoupper', 'foreach', 'echo']),
    );
    expect(result).not.toContain('break');
  });

  it('adds local variables', () => {
    expect(labels('total = 1;\n')).toContain('total');
  });

  it('offers only members after a dot', () => {
    const result = labels('echo user.');
    expect(result).toEqual(expect.arrayContaining(['name', 'age', 'address', 'greet', 'isAdult']));
    expect(result).not.toContain('strtoupper');
    expect(labels('echo user.address.')).toEqual(['city', 'zip']);
  });

  it('offers loop controls inside loops', () => {
    expect(labels('foreach (items as i) {\n  ')).toEqual(
      expect.arrayContaining(['break', 'continue']),
    );
  });

  it('marks method snippets', () => {
    const greet = buildSuggestions({ code: 'user.', textBeforeWord: 'user.' }, config).find(
      (s) => s.label === 'greet',
    );
    expect(greet).toMatchObject({ snippet: true, kind: 'Method' });
    expect(greet?.insertText).toContain('${1:');
  });
});

describe('hoverFor', () => {
  it('describes variables, functions and members', () => {
    expect(hoverFor('user', '', config)?.detail).toBe('user: DevServer\\User');
    expect(hoverFor('greet', 'user.', config)?.doc).toBe('Full greeting for the user.');
    expect(hoverFor('nothing', '', config)).toBeNull();
  });
});
