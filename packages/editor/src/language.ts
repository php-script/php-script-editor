import { buildSuggestions, hoverFor } from './completion.js';
import { configKey } from './config.js';
import type { Monaco } from './monaco.js';
import type { LintDiagnostic, PhpScriptConfig } from './types.js';

export const LANGUAGE_PREFIX = 'php-script';
export const MARKER_OWNER = 'php-script';

const registered = new Map<string, string>();

/**
 * Registers a Monaco language for a config and returns its id.
 * Each distinct config gets its own id, because Monaco tokenizers and providers are global:
 * two editors with different context variables on one page must not share one.
 */
export function ensureLanguage(monaco: Monaco, config: PhpScriptConfig): string {
  const key = configKey(config);
  const existing = registered.get(key);
  if (existing) return existing;

  const id = key === 'default' ? LANGUAGE_PREFIX : `${LANGUAGE_PREFIX}-${key}`;
  registered.set(key, id);

  monaco.languages.register({ id, aliases: ['php-script', 'PHP Script'] });
  monaco.languages.setMonarchTokensProvider(id, config.definition as never);
  monaco.languages.setLanguageConfiguration(id, {
    comments: { lineComment: '//' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}"']*$/,
      decreaseIndentPattern: /^\s*\}/,
    },
  });

  const kinds = monaco.languages.CompletionItemKind;
  const kindMap: Record<string, number> = {
    Function: kinds.Function,
    Method: kinds.Method,
    Variable: kinds.Variable,
    Property: kinds.Property,
    Keyword: kinds.Keyword,
    Snippet: kinds.Snippet,
  };

  monaco.languages.registerCompletionItemProvider(id, {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const textBeforeWord = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: word.startColumn,
      });
      const items = buildSuggestions({ code: model.getValue(), textBeforeWord }, config);
      return {
        suggestions: items.map((item) => ({
          label: item.label,
          kind: kindMap[item.kind] ?? kinds.Text,
          detail: item.detail,
          documentation: item.doc,
          insertText: item.insertText,
          insertTextRules: item.snippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
          sortText: `${item.sort}${item.label}`,
          range,
        })),
      };
    },
  });

  monaco.languages.registerHoverProvider(id, {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const lineBefore = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const info = hoverFor(word.word, lineBefore, config);
      if (!info) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        ),
        contents: [
          { value: '```php-script\n' + info.detail + '\n```' },
          ...(info.doc ? [{ value: info.doc }] : []),
        ],
      };
    },
  });

  return id;
}

/** Maps php-script `LintDiagnostic`s (1-based line/column) to Monaco markers. */
export function toMarkers(monaco: Monaco, diagnostics: LintDiagnostic[]) {
  return diagnostics.map((d) => ({
    startLineNumber: Math.max(1, d.line),
    startColumn: Math.max(1, d.column),
    endLineNumber: Math.max(1, d.line),
    endColumn: Math.max(1, d.column) + Math.max(d.length ?? 1, 1),
    message: d.message,
    source: d.rule ?? 'php-script',
    severity:
      d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
  }));
}
