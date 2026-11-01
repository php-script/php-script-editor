import { describe, expect, it } from 'vitest';
import { dedent } from '../../src/text.js';

describe('dedent', () => {
  it('removes shared indentation and blank edge lines', () => {
    expect(dedent('\n      if (a) {\n        echo a;\n      }\n    ')).toBe('if (a) {\n  echo a;\n}');
  });
  it('keeps single-line and unindented text', () => {
    expect(dedent('echo 1;')).toBe('echo 1;');
    expect(dedent('a\n  b')).toBe('a\n  b');
  });
  it('ignores blank lines when measuring indentation', () => {
    expect(dedent('    a\n\n    b')).toBe('a\n\nb');
  });
  it('returns empty string for whitespace only', () => {
    expect(dedent('  \n \n')).toBe('');
  });
});
