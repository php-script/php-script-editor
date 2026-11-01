import type { ClassDefinition, CompletionEntry, PhpScriptConfig } from './types.js';

/** Monaco-free suggestion. `language.ts` maps it to a Monaco CompletionItem. */
export interface Suggestion {
  label: string;
  kind: string;
  insertText: string;
  snippet: boolean;
  detail: string;
  doc: string;
  /** Lower sorts first. */
  sort: number;
}

const IDENT = /[A-Za-z_]\w*/y;

/**
 * Replaces the contents of strings and `//` comments with spaces.
 * Positions stay the same, so later scans never see keywords or braces inside them.
 */
export function maskStringsAndComments(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i]!;
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? code.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      out += ch;
      i++;
      while (i < code.length && code[i] !== ch) {
        if (code[i] === '\\' && i + 1 < code.length) {
          out += '  ';
          i += 2;
          continue;
        }
        out += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < code.length) {
        out += ch;
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * True when the end of `textBefore` sits inside the body of a `for` or `foreach`.
 * Tracks a stack of blocks: a `{` opens a loop block if a loop header came before it.
 */
export function isInsideLoop(textBefore: string): boolean {
  const code = maskStringsAndComments(textBefore);
  const stack: boolean[] = [];
  let pendingLoop = false;
  let parenDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (/[A-Za-z_]/.test(ch) && (i === 0 || !/\w/.test(code[i - 1]!))) {
      IDENT.lastIndex = i;
      const word = IDENT.exec(code)?.[0] ?? '';
      if (word === 'for' || word === 'foreach') pendingLoop = true;
      i += word.length - 1;
      continue;
    }
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === ';' && parenDepth === 0) pendingLoop = false;
    else if (ch === '{') {
      stack.push(pendingLoop);
      pendingLoop = false;
    } else if (ch === '}') {
      stack.pop();
    }
  }
  return stack.includes(true);
}

/** Names assigned in the script (`x = …`, `foreach (… as k, v)`, `for (i = …`). */
export function findLocalVariables(code: string): string[] {
  const masked = maskStringsAndComments(code);
  const names = new Set<string>();
  for (const match of masked.matchAll(
    /(?:^|[^.\w])([A-Za-z_]\w*)\s*(?:\+\+|--|[+\-*/.%]?=(?!=))/g,
  )) {
    names.add(match[1]!);
  }
  for (const match of masked.matchAll(/\bas\s+([A-Za-z_]\w*)(?:\s*(?:,|=>)\s*([A-Za-z_]\w*))?/g)) {
    names.add(match[1]!);
    if (match[2]) names.add(match[2]);
  }
  return [...names];
}

/**
 * Returns the member chain right before the cursor, e.g. `user.logins.` -> ['user', 'logins'].
 * Method calls in the chain lose their arguments: `user.stats().` -> ['user', 'stats'].
 * Returns null when the text does not end in `identifier.`
 */
export function memberChainBefore(textBefore: string): string[] | null {
  const match = /([A-Za-z_]\w*(?:\([^()]*\))?(?:\.[A-Za-z_]\w*(?:\([^()]*\))?)*)\.$/.exec(
    textBefore,
  );
  if (!match) return null;
  // `'a'.b` or `1.5` are not member access.
  const before = textBefore.slice(0, match.index);
  if (/[\w'"]$/.test(before)) return null;
  return match[1]!.split('.').map((part) => part.replace(/\(.*\)$/, ''));
}

const cleanType = (type: string | undefined): string =>
  (type ?? '').trim().replace(/^\?/, '').replace(/^\\/, '');

/** Return type of a method entry, read from its `detail` (`name(args): Type`). */
export function returnTypeOf(entry: CompletionEntry): string {
  const detail = entry.detail ?? '';
  const index = detail.lastIndexOf('):');
  return index === -1 ? '' : cleanType(detail.slice(index + 2));
}

/** Resolves a chain like ['user', 'logins'] to a class name in `completions.classes`. */
export function resolveChain(chain: string[], config: PhpScriptConfig): string | null {
  const { completions } = config;
  const [head, ...rest] = chain;
  const variable = completions.globalVariables.find((v) => v.label === head);
  if (!variable) return null;

  let className = cleanType(variable.detail);
  for (const part of rest) {
    const classDef: ClassDefinition | undefined = completions.classes[className];
    if (!classDef) return null;
    const property = classDef.properties.find((p) => p.label === part);
    if (property) {
      className = cleanType(property.detail);
      continue;
    }
    const method = classDef.methods.find((m) => m.label === part);
    if (!method) return null;
    className = returnTypeOf(method);
  }
  return completions.classes[className] ? className : null;
}

const toSuggestion = (entry: CompletionEntry, sort: number, fallbackKind = 'Text'): Suggestion => ({
  label: entry.label,
  kind: entry.kind || fallbackKind,
  insertText: entry.snippet ?? entry.label,
  snippet: Boolean(entry.snippet),
  detail: entry.detail ?? '',
  doc: entry.doc ?? '',
  sort,
});

export interface CompletionContext {
  /** Text of the whole model. */
  code: string;
  /** Text from the start of the model up to the start of the word being typed. */
  textBeforeWord: string;
}

/** Suggestions for the cursor position. Member access (`user.`) only returns members. */
export function buildSuggestions(
  context: CompletionContext,
  config: PhpScriptConfig,
): Suggestion[] {
  const { completions, definition } = config;
  const lineBefore = context.textBeforeWord.slice(context.textBeforeWord.lastIndexOf('\n') + 1);
  const chain = memberChainBefore(lineBefore);

  if (chain) {
    const className = resolveChain(chain, config);
    const classDef = className ? completions.classes[className] : undefined;
    if (classDef) {
      return [
        ...classDef.properties.map((p) => toSuggestion(p, 0, 'Property')),
        ...classDef.methods.map((m) => toSuggestion(m, 1, 'Method')),
      ];
    }
    // `name.` on a scalar: `.` is string concatenation, fall through to normal suggestions.
  }

  const globals = new Set(completions.globalVariables.map((v) => v.label));
  const reserved = new Set([...definition.keywords, ...(definition.loopKeywords ?? [])]);
  const locals = findLocalVariables(context.code).filter(
    (name) => !globals.has(name) && !reserved.has(name),
  );
  const snippetLabels = new Set(completions.controlFlows.map((c) => c.label));

  const suggestions: Suggestion[] = [
    ...completions.globalVariables.map((v) => toSuggestion(v, 0, 'Variable')),
    ...locals.map((name) =>
      toSuggestion({ label: name, kind: 'Variable', detail: 'Local variable' }, 1, 'Variable'),
    ),
    ...completions.globalFunctions.map((f) => toSuggestion(f, 2, 'Function')),
    ...completions.controlFlows.map((c) => toSuggestion(c, 3, 'Snippet')),
    ...definition.keywords
      .filter((k) => !snippetLabels.has(k))
      .map((k) => toSuggestion({ label: k, kind: 'Keyword', detail: 'Keyword' }, 4)),
  ];

  if (isInsideLoop(context.textBeforeWord)) {
    suggestions.push(
      ...completions.loopControls.map((c) => toSuggestion(c, 3, 'Snippet')),
      ...completions.loopKeywords.map((k) =>
        toSuggestion({ label: k, kind: 'Keyword', detail: 'Loop control keyword' }, 4),
      ),
    );
  }

  return suggestions;
}

/** Hover text for the word under the cursor, or null. */
export function hoverFor(
  word: string,
  lineBeforeWord: string,
  config: PhpScriptConfig,
): { detail: string; doc: string } | null {
  const { completions } = config;
  const chain = memberChainBefore(lineBeforeWord);
  let entry: CompletionEntry | undefined;

  if (chain) {
    const className = resolveChain(chain, config);
    const classDef = className ? completions.classes[className] : undefined;
    entry =
      classDef?.properties.find((p) => p.label === word) ??
      classDef?.methods.find((m) => m.label === word);
  } else {
    entry =
      completions.globalVariables.find((v) => v.label === word) ??
      completions.globalFunctions.find((f) => f.label === word);
  }

  if (!entry) return null;
  const detail =
    entry.kind === 'Variable'
      ? `${entry.label}: ${entry.detail ?? 'mixed'}`
      : (entry.detail ?? entry.label);
  return { detail, doc: entry.doc ?? '' };
}
