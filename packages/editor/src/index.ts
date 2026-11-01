import { PhpScriptEditor, TAG_NAME } from './php-script-editor.js';

export * from './core.js';
export { PhpScriptEditor, TAG_NAME } from './php-script-editor.js';
export type { EditorLabels, PhpScriptEditorEventMap } from './php-script-editor.js';
export { monaco } from './monaco.js';
export type { Monaco } from './monaco.js';
export { ensureLanguage, toMarkers } from './language.js';

/** Registers `<php-script-editor>` (no-op if already defined, e.g. two bundles on one page). */
export function defineElement(tag: string = TAG_NAME): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(
      tag,
      tag === TAG_NAME ? PhpScriptEditor : class extends PhpScriptEditor {},
    );
  }
}

defineElement();
