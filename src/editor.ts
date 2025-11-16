/**
 * Main editor initialization and configuration
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { ConfigurationBundle } from './config/types';
import { EditorInitializationError } from './utils/errors';

/**
 * Editor creation options
 */
export interface CreateEditorOptions {
  /** Server-provided initial code content (can be overridden by localStorage) */
  initialValue?: string;

  /** Editor theme (default: 'vs-dark') */
  theme?: 'vs' | 'vs-dark' | 'hc-black' | string;

  /** Configuration bundle from server-side rendering (embedded in window object) */
  configuration: ConfigurationBundle;

  /** Monaco editor options (passed through to Monaco) */
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;

  /** Enable content persistence in localStorage (default: true) */
  enableContentPersistence?: boolean;

  /** localStorage key for content persistence (default: auto-generated from page URL) */
  storageKey?: string;
}

/**
 * PHP-Script Editor instance
 */
export interface PhpScriptEditor {
  /** Underlying Monaco editor instance */
  readonly monaco: monaco.editor.IStandaloneCodeEditor;

  /** Get current editor value */
  getValue(): string;

  /** Set editor value (also updates localStorage if persistence enabled) */
  setValue(value: string): void;

  /** Get current configuration bundle */
  getConfiguration(): ConfigurationBundle;

  /** Revert to server-provided initial content (discards localStorage) */
  revertToOriginal(): void;

  /** Check if content differs from server-provided initial value */
  hasUnsavedChanges(): boolean;

  /** Clear localStorage without changing editor content */
  clearLocalStorage(): void;

  /** Get server-provided initial content */
  getOriginalContent(): string;

  /** Dispose editor and cleanup resources */
  dispose(): void;
}

/**
 * Setup Monaco Environment for web workers
 */
export function setupMonacoWorkers(): void {
  if (typeof window !== 'undefined') {
    // @ts-expect-error Monaco worker configuration
    window.MonacoEnvironment = {
      getWorker(_: string, label: string): Worker {
        // This is a placeholder - actual worker configuration
        // will be implemented based on the bundler setup
        const workerMap: Record<string, string> = {
          json: 'json.worker.js',
          css: 'css.worker.js',
          html: 'html.worker.js',
          typescript: 'ts.worker.js',
          javascript: 'ts.worker.js',
        };

        const workerUrl = workerMap[label] || 'editor.worker.js';
        return new Worker(workerUrl, { type: 'module' });
      },
    };
  }
}

/**
 * Create and initialize a php-script Monaco Editor
 */
export async function createPhpScriptEditor(
  container: HTMLElement,
  options: CreateEditorOptions
): Promise<PhpScriptEditor> {
  if (!container) {
    throw new EditorInitializationError('Container element is required');
  }

  if (!options.configuration) {
    throw new EditorInitializationError('Configuration bundle is required');
  }

  // Setup Monaco workers
  setupMonacoWorkers();

  // Placeholder implementation - will be completed in subsequent tasks
  const editor = monaco.editor.create(container, {
    value: options.initialValue || '',
    language: 'plaintext', // Will be set to 'php-script' after language registration
    theme: options.theme || 'vs-dark',
    ...options.monacoOptions,
  });

  const editorInstance: PhpScriptEditor = {
    monaco: editor,
    getValue: () => editor.getValue(),
    setValue: (value: string) => editor.setValue(value),
    getConfiguration: () => options.configuration,
    revertToOriginal: () => {
      // Placeholder
      console.warn('revertToOriginal not yet implemented');
    },
    hasUnsavedChanges: () => false,
    clearLocalStorage: () => {
      // Placeholder
      console.warn('clearLocalStorage not yet implemented');
    },
    getOriginalContent: () => options.initialValue || '',
    dispose: () => editor.dispose(),
  };

  return editorInstance;
}
