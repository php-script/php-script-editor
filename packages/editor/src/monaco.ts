/**
 * Slim Monaco: the editor API plus the editor features a script editor needs.
 * No bundled languages (TypeScript, CSS, HTML, …), which keeps the bundle small.
 */
import 'monaco-editor/editor/browser/coreCommands.js';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/editor/common/standaloneStrings.js';
import 'monaco-editor/features/codeEditor/register.js';
import 'monaco-editor/features/codicon/register.js';
import 'monaco-editor/features/bracketMatching/register.js';
import 'monaco-editor/features/caretOperations/register.js';
import 'monaco-editor/features/clipboard/register.js';
import 'monaco-editor/features/comment/register.js';
import 'monaco-editor/features/contextmenu/register.js';
import 'monaco-editor/features/cursorUndo/register.js';
import 'monaco-editor/features/find/register.js';
import 'monaco-editor/features/folding/register.js';
import 'monaco-editor/features/fontZoom/register.js';
import 'monaco-editor/features/format/register.js';
import 'monaco-editor/features/gotoError/register.js';
import 'monaco-editor/features/hover/register.js';
import 'monaco-editor/features/indentation/register.js';
import 'monaco-editor/features/lineSelection/register.js';
import 'monaco-editor/features/linesOperations/register.js';
import 'monaco-editor/features/multicursor/register.js';
import 'monaco-editor/features/parameterHints/register.js';
import 'monaco-editor/features/placeholderText/register.js';
import 'monaco-editor/features/readOnlyMessage/register.js';
import 'monaco-editor/features/smartSelect/register.js';
import 'monaco-editor/features/snippet/register.js';
import 'monaco-editor/features/suggest/register.js';
import 'monaco-editor/features/tokenization/register.js';
import 'monaco-editor/features/wordHighlighter/register.js';
import 'monaco-editor/features/wordOperations/register.js';
import 'monaco-editor/features/wordPartOperations/register.js';
import * as monaco from 'monaco-editor/editor/editor.api.js';
// A separate file next to the chunks: cached on its own and loaded in parallel. Vite, webpack 5,
// Rollup and esbuild resolve the emitted `new URL(…, import.meta.url)` without extra config.
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';

type MonacoEnvironmentLike = { getWorker?: (workerId: string, label: string) => Worker };
const scope = globalThis as typeof globalThis & { MonacoEnvironment?: MonacoEnvironmentLike };

// Respect a MonacoEnvironment the host page already set up (e.g. for other languages).
if (
  !scope.MonacoEnvironment?.getWorker &&
  !(scope.MonacoEnvironment as { getWorkerUrl?: unknown })?.getWorkerUrl
) {
  scope.MonacoEnvironment = {
    ...scope.MonacoEnvironment,
    getWorker: () => new EditorWorker(),
  };
}

export { monaco };
export type Monaco = typeof monaco;
