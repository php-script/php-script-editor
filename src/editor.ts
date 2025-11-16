/**
 * Main editor initialization and configuration
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { ConfigurationBundle } from './config/types';
import { EditorInitializationError, ContentPersistenceError } from './utils/errors';
import { registerPhpScriptLanguage } from './language/monarch';
import {
  registerFunctionCompletionProvider,
  registerContextCompletionProvider,
} from './language/completion';
import { registerDiagnosticProvider } from './language/diagnostics';
import { registerHoverProvider } from './language/hover';
import {
  saveContent,
  loadContent,
  clearContent,
  hasPersistedContent,
  getStorageKey,
  loadOriginalContent,
} from './persistence/content-store';
import {
  checkStorageAvailable,
  canStoreContent,
  cleanupOldEntries,
} from './persistence/storage-manager';
import { logger } from './utils/logger';
import { AUTOSAVE_DEBOUNCE_MS } from './config/defaults';

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

  // Register php-script language
  registerPhpScriptLanguage(options.configuration.languageDefinition);

  // Register language providers
  const languageDisposables: monaco.IDisposable[] = [];

  // Function whitelist completion
  if (options.configuration.functionWhitelist) {
    const funcProvider = registerFunctionCompletionProvider(
      'php-script',
      options.configuration.functionWhitelist
    );
    languageDisposables.push(funcProvider);

    // Hover provider for function documentation
    const hoverProvider = registerHoverProvider(
      'php-script',
      options.configuration.functionWhitelist
    );
    languageDisposables.push(hoverProvider);

    // Diagnostic provider for non-whitelisted functions
    const diagnosticProvider = registerDiagnosticProvider(
      'php-script',
      options.configuration.functionWhitelist
    );
    languageDisposables.push(diagnosticProvider);
  }

  // Context variable completion
  if (options.configuration.contextSchema) {
    const contextProvider = registerContextCompletionProvider(
      'php-script',
      options.configuration.contextSchema
    );
    languageDisposables.push(contextProvider);
  }

  // Determine storage key
  const storageKey = getStorageKey(options.storageKey);
  const originalContent = options.initialValue || '';
  const persistenceEnabled = options.enableContentPersistence !== false;

  // Determine initial content (prioritize localStorage over server-provided)
  let initialContent = originalContent;
  let persistedContentLoaded = false;

  if (persistenceEnabled && checkStorageAvailable()) {
    try {
      if (hasPersistedContent(storageKey)) {
        const persisted = loadContent(storageKey);
        if (persisted !== null) {
          initialContent = persisted;
          persistedContentLoaded = true;
          logger.info('Restored content from localStorage', {
            storageKey,
            contentLength: persisted.length,
          });
        }
      }
    } catch (error) {
      // Log error but continue with server-provided content
      if (error instanceof ContentPersistenceError) {
        logger.error('Failed to load persisted content, using server content', {
          storageKey,
          error: error.message,
          code: error.code,
        });
      } else {
        logger.error('Unexpected error loading persisted content', { storageKey, error });
      }
      // If corrupted data was detected, it's already been cleared
      // Fall back to original content
      initialContent = originalContent;
    }
  }

  // Create editor with php-script language
  const editor = monaco.editor.create(container, {
    value: initialContent,
    language: 'php-script',
    theme: options.theme || 'vs-dark',
    ...options.monacoOptions,
  });

  // Setup debounced auto-save
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let contentChangeListener: monaco.IDisposable | null = null;

  if (persistenceEnabled && checkStorageAvailable()) {
    contentChangeListener = editor.onDidChangeModelContent(() => {
      // Clear previous timeout
      if (autoSaveTimeout !== null) {
        clearTimeout(autoSaveTimeout);
      }

      // Debounce save operation
      autoSaveTimeout = setTimeout(() => {
        const currentContent = editor.getValue();

        // Check if we can store the content
        if (!canStoreContent(currentContent)) {
          logger.warn('Storage quota exceeded, attempting cleanup', { storageKey });
          // Try to free space
          const freedSpace = cleanupOldEntries();
          logger.info('Cleanup freed space', { freedSpace });

          // Try again after cleanup
          if (!canStoreContent(currentContent)) {
            logger.error('Cannot save content even after cleanup', { storageKey });
            // Could emit an event here for UI notification
            return;
          }
        }

        try {
          saveContent(storageKey, currentContent, originalContent);
          logger.debug('Content auto-saved', {
            storageKey,
            contentLength: currentContent.length,
          });
        } catch (error) {
          if (error instanceof ContentPersistenceError && error.code === 'QUOTA_EXCEEDED') {
            logger.error('Storage quota exceeded during save', { storageKey, error });
            // Could emit an event here for UI notification
          } else {
            logger.error('Failed to auto-save content', { storageKey, error });
          }
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    });
  }

  const editorInstance: PhpScriptEditor = {
    monaco: editor,
    getValue: () => editor.getValue(),
    setValue: (value: string) => {
      editor.setValue(value);
      // Auto-save will be triggered by onDidChangeModelContent
    },
    getConfiguration: () => options.configuration,
    revertToOriginal: () => {
      if (!persistenceEnabled) {
        logger.warn('Content persistence is disabled, cannot revert');
        return;
      }

      // Clear localStorage
      clearContent(storageKey);
      logger.info('Cleared localStorage content', { storageKey });

      // Restore original content
      editor.setValue(originalContent);
      logger.info('Reverted to original content', {
        storageKey,
        contentLength: originalContent.length,
      });
    },
    hasUnsavedChanges: () => {
      if (!persistenceEnabled) {
        return false;
      }

      const currentContent = editor.getValue();
      const original = loadOriginalContent(storageKey) || originalContent;
      return currentContent !== original;
    },
    clearLocalStorage: () => {
      if (!persistenceEnabled) {
        logger.warn('Content persistence is disabled, nothing to clear');
        return;
      }

      clearContent(storageKey);
      logger.info('Cleared localStorage content (without changing editor)', { storageKey });
    },
    getOriginalContent: () => {
      if (!persistenceEnabled) {
        return originalContent;
      }

      return loadOriginalContent(storageKey) || originalContent;
    },
    dispose: () => {
      // Clear auto-save timeout
      if (autoSaveTimeout !== null) {
        clearTimeout(autoSaveTimeout);
      }

      // Dispose content change listener
      if (contentChangeListener) {
        contentChangeListener.dispose();
      }

      // Dispose language providers
      languageDisposables.forEach((d) => d.dispose());

      // Dispose editor
      editor.dispose();

      logger.info('Editor disposed', { storageKey, persistenceEnabled });
    },
  };

  // Log successful initialization
  logger.info('Editor initialized', {
    storageKey,
    persistenceEnabled,
    persistedContentLoaded,
    hasOriginalContent: !!originalContent,
  });

  return editorInstance;
}
