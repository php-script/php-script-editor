import type { CompletionItems, MonarchDefinition, PhpScriptConfig } from './types.js';

/**
 * Fallback language definition. Mirrors php-script v2's
 * `MonarchLanguageDefinitionService::getDefinition()` without any allowed
 * functions or context variables, so the editor highlights correctly even
 * before (or without) a server config.
 */
export const DEFAULT_DEFINITION: MonarchDefinition = {
  keywords: [
    'if',
    'else',
    'for',
    'foreach',
    'as',
    'echo',
    'return',
    'true',
    'false',
    'null',
    'LINEBREAK',
  ],
  loopKeywords: ['break', 'continue'],
  allowedFunctions: [],
  contextVariables: [],
  operators: [
    '==',
    '===',
    '!=',
    '!==',
    '=',
    '.',
    '+',
    '-',
    '*',
    '/',
    '%',
    '>',
    '<',
    '>=',
    '<=',
    '&&',
    '||',
    '!',
    '++',
    '--',
    ':',
  ],
  symbols: '[=><!~?&|+\\-*/^%.,;()\\{}\\[\\]]',
  tokenizer: {
    root: [
      [
        '[a-zA-Z_]\\w*',
        {
          cases: {
            '@keywords': 'keyword',
            '@loopKeywords': 'keyword',
            '@allowedFunctions': 'predefined',
            '@contextVariables': 'variable.predefined',
            '@default': 'identifier',
          },
        },
      ],
      { include: '@whitespace' },
      ['[{}()\\[\\]]', '@brackets'],
      ['[<>](?!@symbols)', '@brackets'],
      ['@symbols', { cases: { '@operators': 'operator', '@default': '' } }],
      ['\\d+(\\.\\d+)?', 'number'],
      ['"', 'string.quote', '@string_double'],
      ["'", 'string.quote', '@string_single'],
    ],
    whitespace: [
      ['[ \\t\\r\\n]+', ''],
      ['\\/\\/.*$', 'comment'],
    ],
    string_double: [
      ['[^\\\\"]+', 'string'],
      ['\\\\.', 'string.escape'],
      ['"', 'string.quote', '@pop'],
    ],
    string_single: [
      ["[^\\\\']+", 'string'],
      ['\\\\.', 'string.escape'],
      ["'", 'string.quote', '@pop'],
    ],
  },
};

export const DEFAULT_COMPLETIONS: CompletionItems = {
  globalFunctions: [],
  globalVariables: [],
  classes: {},
  controlFlows: [
    {
      label: 'for',
      kind: 'Snippet',
      snippet: 'for (${1:i} = ${2:0}; ${1} < ${3:count}(${4}); ${1}++) {\n    $0\n}',
      doc: 'For-Loop',
      detail: 'for (int $i = 0; $i < count($items); $i++) {',
    },
    {
      label: 'foreach',
      kind: 'Snippet',
      snippet: 'foreach (${1:items} as ${2:item}) {\n    $0\n}',
      doc: 'Foreach-Loop',
      detail: 'foreach ($items as $item) {',
    },
    {
      label: 'foreach (key, value)',
      kind: 'Snippet',
      snippet: 'foreach (${1:map} as ${2:key}, ${3:value}) {\n    $0\n}',
      doc: 'Foreach-Loop for Key/Value Pairs',
      detail: 'foreach ($map as $key => $value) {',
    },
    {
      label: 'if',
      kind: 'Snippet',
      snippet: 'if (${1:condition}) {\n    $0\n}',
      doc: 'If-Condition',
      detail: 'if ($condition) {',
    },
    {
      label: 'ifelse',
      kind: 'Snippet',
      snippet: 'if (${1:condition}) {\n    $2\n} else {\n    $0\n}',
      doc: 'If-Else-Condition',
      detail: 'if ($condition) { ... } else { ... }',
    },
  ],
  loopControls: [
    {
      label: 'break 2',
      kind: 'Snippet',
      snippet: 'break ${1:2};',
      doc: 'Break from nested loops',
      detail: 'break N;',
    },
    {
      label: 'continue 2',
      kind: 'Snippet',
      snippet: 'continue ${1:2};',
      doc: 'Continue outer loop from nested loops',
      detail: 'continue N;',
    },
  ],
  loopKeywords: ['break', 'continue'],
};

export const DEFAULT_CONFIG: PhpScriptConfig = {
  definition: DEFAULT_DEFINITION,
  completions: DEFAULT_COMPLETIONS,
};

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const looksLikeDefinition = (value: unknown): value is MonarchDefinition =>
  isObject(value) && isObject(value.tokenizer) && Array.isArray(value.keywords);

const looksLikeCompletions = (value: unknown): value is Partial<CompletionItems> =>
  isObject(value) &&
  ('globalFunctions' in value ||
    'globalVariables' in value ||
    'classes' in value ||
    'controlFlows' in value);

const asArray = <T>(value: unknown, fallback: T[]): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

/**
 * Accepts the JSON a backend sends and returns a complete config.
 *
 * Accepted shapes:
 * - `{ definition, completions }` (recommended)
 * - `{ language, completionItems }` or `{ definition, completionItems }`
 * - a bare `getDefinition()` result
 * - a JSON string of any of the above
 */
export function normalizeConfig(input: unknown): PhpScriptConfig {
  if (input === null || input === undefined || input === '') return DEFAULT_CONFIG;

  let value: unknown = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw new ConfigError(`Invalid php-script config JSON: ${(error as Error).message}`);
    }
  }

  if (!isObject(value)) throw new ConfigError('php-script config must be an object.');

  const definitionSource =
    value.definition ?? value.language ?? (looksLikeDefinition(value) ? value : undefined);
  const completionSource = value.completions ?? value.completionItems ?? value.suggestions;

  if (definitionSource !== undefined && !looksLikeDefinition(definitionSource)) {
    throw new ConfigError('php-script config "definition" needs "keywords" and "tokenizer".');
  }
  if (completionSource !== undefined && !looksLikeCompletions(completionSource)) {
    throw new ConfigError('php-script config "completions" has an unknown shape.');
  }
  if (definitionSource === undefined && completionSource === undefined) {
    throw new ConfigError('php-script config needs "definition" and/or "completions".');
  }

  const definition: MonarchDefinition = definitionSource
    ? {
        ...DEFAULT_DEFINITION,
        ...definitionSource,
        loopKeywords: asArray(definitionSource.loopKeywords, DEFAULT_DEFINITION.loopKeywords ?? []),
        allowedFunctions: asArray(definitionSource.allowedFunctions, []),
        contextVariables: asArray(definitionSource.contextVariables, []),
      }
    : DEFAULT_DEFINITION;

  const c = (completionSource ?? {}) as Partial<CompletionItems>;
  const completions: CompletionItems = {
    globalFunctions: asArray(c.globalFunctions, []),
    globalVariables: asArray(c.globalVariables, []),
    // PHP's json_encode turns an empty array into [] instead of {}.
    classes: isObject(c.classes) ? (c.classes as CompletionItems['classes']) : {},
    controlFlows: asArray(c.controlFlows, DEFAULT_COMPLETIONS.controlFlows),
    loopControls: asArray(c.loopControls, DEFAULT_COMPLETIONS.loopControls),
    loopKeywords: asArray(c.loopKeywords, definition.loopKeywords ?? []),
  };

  return { definition, completions };
}

/** Small stable hash (FNV-1a) used to give each distinct config its own Monaco language id. */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function configKey(config: PhpScriptConfig): string {
  return config === DEFAULT_CONFIG ? 'default' : hashString(JSON.stringify(config));
}
