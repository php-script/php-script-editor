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
 *
 * Configuration object for initializing a php-script Monaco Editor instance.
 * All options except `configuration` are optional and have sensible defaults.
 *
 * @example
 * ```typescript
 * const options: CreateEditorOptions = {
 *   initialValue: 'user.name',
 *   theme: 'vs-dark',
 *   configuration: window.phpScriptConfig, // From server
 *   enableContentPersistence: true,
 *   monacoOptions: {
 *     minimap: { enabled: false },
 *     fontSize: 14
 *   }
 * };
 * ```
 */
export interface CreateEditorOptions {
  /**
   * Server-provided initial code content
   *
   * This value can be overridden by localStorage if persistence is enabled
   * and the user has previously edited content on this page.
   *
   * @default ''
   */
  initialValue?: string;

  /**
   * Editor color theme
   *
   * @default 'vs-dark'
   */
  theme?: 'vs' | 'vs-dark' | 'hc-black' | string;

  /**
   * Configuration bundle from server-side rendering
   *
   * This object should be embedded in the HTML via a script tag during
   * server-side rendering. It contains language definitions, function
   * whitelists, and context variable schemas.
   *
   * @example
   * ```html
   * <script>
   *   window.phpScriptConfig = <?php echo json_encode($config); ?>;
   * </script>
   * ```
   */
  configuration: ConfigurationBundle;

  /**
   * Monaco editor construction options
   *
   * These options are passed directly to Monaco's `create()` method.
   * See Monaco Editor documentation for available options.
   *
   * @see https://microsoft.github.io/monaco-editor/docs.html
   */
  monacoOptions?: monaco.editor.IStandaloneEditorConstructionOptions;

  /**
   * Enable automatic content persistence to localStorage
   *
   * When enabled, editor content is auto-saved to localStorage every 500ms
   * after the last keystroke. On page reload, localStorage content takes
   * precedence over server-provided `initialValue`.
   *
   * @default true
   */
  enableContentPersistence?: boolean;

  /**
   * localStorage key for content persistence
   *
   * If not provided, a key is auto-generated from the current page URL.
   * Use a custom key when you have multiple editors on the same page.
   *
   * @default Auto-generated from URL hash
   */
  storageKey?: string;
}

/**
 * Event callback types for editor events
 */

/**
 * Callback invoked when editor configuration is updated
 *
 * @param config - The new configuration bundle
 */
export type ConfigurationChangedCallback = (_config: ConfigurationBundle) => void;

/**
 * Callback invoked when validation errors occur
 *
 * @param errors - Array of error messages
 */
export type ValidationErrorCallback = (_errors: string[]) => void;

/**
 * Callback invoked when content is persisted to localStorage
 *
 * @param storageKey - The localStorage key used
 * @param contentLength - Size of persisted content in characters
 */
export type ContentPersistedCallback = (_storageKey: string, _contentLength: number) => void;

/**
 * PHP-Script Editor instance with full API surface
 *
 * Provides methods for content management, configuration updates, persistence control,
 * and event subscriptions. Automatically saves content to localStorage and provides
 * language-aware code completion.
 *
 * @example
 * ```typescript
 * const editor = await createPhpScriptEditor(container, options);
 *
 * // Get/set content
 * const code = editor.getValue();
 * editor.setValue('user.email');
 *
 * // Update configuration dynamically
 * editor.updateFunctionWhitelist(newWhitelist);
 * editor.updateContextSchema(newSchema);
 *
 * // Listen to events
 * editor.onContentPersisted((key, length) => {
 *   console.log(`Saved ${length} bytes`);
 * });
 *
 * // Check for unsaved changes
 * if (editor.hasUnsavedChanges()) {
 *   editor.revertToOriginal();
 * }
 *
 * // Cleanup
 * editor.dispose();
 * ```
 */
export interface PhpScriptEditor {
  /**
   * Underlying Monaco editor instance
   *
   * Direct access to the Monaco editor for advanced use cases.
   * Use this to access Monaco-specific features not exposed by the wrapper API.
   *
   * @example
   * ```typescript
   * // Get cursor position
   * const position = editor.monaco.getPosition();
   *
   * // Add custom action
   * editor.monaco.addAction({
   *   id: 'my-action',
   *   label: 'My Action',
   *   run: () => console.log('Action triggered')
   * });
   * ```
   */
  readonly monaco: monaco.editor.IStandaloneCodeEditor;

  // === Content Management ===

  /**
   * Get current editor content
   *
   * @returns The complete text content of the editor
   */
  getValue(): string;

  /**
   * Set editor content
   *
   * Updates the editor with new content. If persistence is enabled,
   * this will trigger auto-save after the debounce delay (500ms).
   *
   * @param value - New content to set in the editor
   */
  setValue(_value: string): void;

  // === Configuration Management ===

  /**
   * Get current configuration bundle
   *
   * Returns the active configuration including language definition,
   * function whitelist, and context schema.
   *
   * @returns Current configuration bundle
   */
  getConfiguration(): ConfigurationBundle;

  /**
   * Update function whitelist dynamically
   *
   * Re-registers completion, hover, and diagnostic providers with the new whitelist.
   * Preserves existing context schema if present. Triggers `onConfigurationChanged` event.
   *
   * @param whitelist - New function whitelist configuration
   *
   * @example
   * ```typescript
   * editor.updateFunctionWhitelist({
   *   functions: [
   *     { name: 'newFunction', description: 'New function', category: 'string' }
   *   ],
   *   version: '2.0.0',
   *   namespace: 'global'
   * });
   * ```
   */
  updateFunctionWhitelist(_whitelist: import('./config/types').FunctionWhitelist): void;

  /**
   * Update context variable schema dynamically
   *
   * Re-registers context completion provider with the new schema.
   * Preserves existing function whitelist if present. Triggers `onConfigurationChanged` event.
   *
   * @param schema - New context variable schema
   *
   * @example
   * ```typescript
   * editor.updateContextSchema({
   *   variables: [
   *     { name: 'user', type: 'object', description: 'Current user', properties: [] }
   *   ],
   *   version: '2.0.0',
   *   strict: true
   * });
   * ```
   */
  updateContextSchema(_schema: import('./config/types').ContextVariableSchema): void;

  // === Content Persistence ===

  /**
   * Revert to server-provided initial content
   *
   * Clears localStorage and restores the original content from server.
   * Useful for implementing a "Reset" or "Discard Changes" button.
   *
   * @example
   * ```typescript
   * if (editor.hasUnsavedChanges()) {
   *   if (confirm('Discard all changes?')) {
   *     editor.revertToOriginal();
   *   }
   * }
   * ```
   */
  revertToOriginal(): void;

  /**
   * Check if editor content differs from original
   *
   * Compares current content against the server-provided initial value.
   * Returns `false` if persistence is disabled.
   *
   * @returns `true` if content has been modified, `false` otherwise
   */
  hasUnsavedChanges(): boolean;

  /**
   * Clear localStorage without changing editor content
   *
   * Removes persisted content from localStorage but keeps the current
   * editor content unchanged. Useful for manual cache clearing.
   */
  clearLocalStorage(): void;

  /**
   * Get server-provided initial content
   *
   * Returns the original content from server, not the current editor content.
   * Useful for implementing diff/comparison views.
   *
   * @returns Original content from server
   */
  getOriginalContent(): string;

  // === Event Listeners ===

  /**
   * Subscribe to configuration change events
   *
   * Invoked when configuration is updated via `updateFunctionWhitelist()`
   * or `updateContextSchema()`.
   *
   * @param callback - Function to call when configuration changes
   *
   * @example
   * ```typescript
   * editor.onConfigurationChanged((config) => {
   *   console.log('Config updated:', config.bundleVersion);
   * });
   * ```
   */
  onConfigurationChanged(_callback: ConfigurationChangedCallback): void;

  /**
   * Subscribe to validation error events
   *
   * Invoked when storage quota is exceeded or other validation errors occur.
   *
   * @param callback - Function to call when validation errors occur
   *
   * @example
   * ```typescript
   * editor.onValidationError((errors) => {
   *   alert('Error: ' + errors.join(', '));
   * });
   * ```
   */
  onValidationError(_callback: ValidationErrorCallback): void;

  /**
   * Subscribe to content persisted events
   *
   * Invoked after content is successfully saved to localStorage (debounced 500ms).
   *
   * @param callback - Function to call when content is persisted
   *
   * @example
   * ```typescript
   * editor.onContentPersisted((key, length) => {
   *   document.getElementById('status').textContent = `Saved ${length} bytes`;
   * });
   * ```
   */
  onContentPersisted(_callback: ContentPersistedCallback): void;

  // === Lifecycle ===

  /**
   * Dispose editor and cleanup resources
   *
   * Cleans up Monaco editor instance, language providers, event listeners,
   * and auto-save timers. Call this when removing the editor from the DOM.
   *
   * @example
   * ```typescript
   * // Cleanup when component unmounts
   * useEffect(() => {
   *   return () => editor.dispose();
   * }, [editor]);
   * ```
   */
  dispose(): void;
}

/**
 * Setup Monaco Environment for web workers
 *
 * Configures the Monaco Editor's web worker system for syntax highlighting,
 * IntelliSense, and other background processing tasks.
 *
 * @example
 * ```typescript
 * import { setupMonacoWorkers } from 'php-script-monaco-editor';
 *
 * // Call before creating any editors
 * setupMonacoWorkers();
 * ```
 */
export function setupMonacoWorkers(): void {
  if (typeof window !== 'undefined') {
    // Monaco worker configuration - MonacoEnvironment is global
    (window as any).MonacoEnvironment = {
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
 *
 * Creates a fully-configured Monaco Editor instance for editing php-script language code.
 * Automatically registers language providers, sets up content persistence, and configures
 * completion providers based on the provided configuration bundle.
 *
 * @param container - DOM element to host the editor
 * @param options - Editor configuration options
 * @returns Promise resolving to a PhpScriptEditor instance
 *
 * @throws {EditorInitializationError} If container is missing or configuration is invalid
 *
 * @example
 * ```typescript
 * import { createPhpScriptEditor } from 'php-script-monaco-editor';
 *
 * // Get configuration from server-rendered script tag
 * const config = window.phpScriptConfig;
 *
 * const editor = await createPhpScriptEditor(
 *   document.getElementById('editor-container'),
 *   {
 *     initialValue: '<?php echo "Hello"; ?>',
 *     theme: 'vs-dark',
 *     configuration: config,
 *     enableContentPersistence: true
 *   }
 * );
 *
 * // Listen to events
 * editor.onConfigurationChanged((config) => {
 *   console.log('Configuration updated:', config);
 * });
 *
 * editor.onContentPersisted((key, length) => {
 *   console.log(`Saved ${length} bytes to ${key}`);
 * });
 * ```
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

  // Register php-script language with fallback handling
  try {
    registerPhpScriptLanguage(options.configuration.languageDefinition);
    logger.info('Language definition registered successfully');
  } catch (error) {
    logger.error('Failed to register language definition, using fallback minimal mode', { error });
    // Try again with fallback (no language definition - monarch.ts will use default)
    try {
      registerPhpScriptLanguage(undefined);
      logger.warn('Using minimal syntax highlighting mode due to malformed configuration');
    } catch (fallbackError) {
      logger.error('Critical: Even fallback language registration failed', { fallbackError });
      throw new EditorInitializationError('Failed to register language definition');
    }
  }

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

  // Setup event callbacks
  const configurationChangedCallbacks: ConfigurationChangedCallback[] = [];
  const validationErrorCallbacks: ValidationErrorCallback[] = [];
  const contentPersistedCallbacks: ContentPersistedCallback[] = [];

  // Track current configuration (mutable for updates)
  let currentConfiguration = options.configuration;

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

          // Emit content persisted event
          contentPersistedCallbacks.forEach((callback) => {
            try {
              callback(storageKey, currentContent.length);
            } catch (error) {
              logger.error('Error in onContentPersisted callback', { error });
            }
          });
        } catch (error) {
          if (error instanceof ContentPersistenceError && error.code === 'QUOTA_EXCEEDED') {
            logger.error('Storage quota exceeded during save', { storageKey, error });
            // Emit validation error event
            validationErrorCallbacks.forEach((callback) => {
              try {
                callback(['Storage quota exceeded. Cannot save editor content.']);
              } catch (cbError) {
                logger.error('Error in onValidationError callback', { error: cbError });
              }
            });
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
    getConfiguration: () => currentConfiguration,
    updateFunctionWhitelist: (whitelist) => {
      logger.info('Updating function whitelist', {
        functionCount: whitelist.functions.length,
      });

      // Update configuration
      currentConfiguration = {
        ...currentConfiguration,
        functionWhitelist: whitelist,
      };

      // Re-register providers
      const newFuncProvider = registerFunctionCompletionProvider('php-script', whitelist);
      const newHoverProvider = registerHoverProvider('php-script', whitelist);
      const newDiagnosticProvider = registerDiagnosticProvider('php-script', whitelist);

      // Dispose old providers
      languageDisposables.forEach((d) => d.dispose());
      languageDisposables.length = 0;

      // Add new providers
      languageDisposables.push(newFuncProvider, newHoverProvider, newDiagnosticProvider);

      // Re-add context provider if exists
      if (currentConfiguration.contextSchema) {
        const contextProvider = registerContextCompletionProvider(
          'php-script',
          currentConfiguration.contextSchema
        );
        languageDisposables.push(contextProvider);
      }

      // Emit configuration changed event
      configurationChangedCallbacks.forEach((callback) => {
        try {
          callback(currentConfiguration);
        } catch (error) {
          logger.error('Error in onConfigurationChanged callback', { error });
        }
      });

      logger.info('Function whitelist updated successfully');
    },
    updateContextSchema: (schema) => {
      logger.info('Updating context schema', {
        variableCount: schema.variables.length,
      });

      // Update configuration
      currentConfiguration = {
        ...currentConfiguration,
        contextSchema: schema,
      };

      // Re-register providers
      const contextProvider = registerContextCompletionProvider('php-script', schema);

      // Dispose old providers
      languageDisposables.forEach((d) => d.dispose());
      languageDisposables.length = 0;

      // Add new context provider
      languageDisposables.push(contextProvider);

      // Re-add function providers if exist
      if (currentConfiguration.functionWhitelist) {
        const funcProvider = registerFunctionCompletionProvider(
          'php-script',
          currentConfiguration.functionWhitelist
        );
        const hoverProvider = registerHoverProvider(
          'php-script',
          currentConfiguration.functionWhitelist
        );
        const diagnosticProvider = registerDiagnosticProvider(
          'php-script',
          currentConfiguration.functionWhitelist
        );
        languageDisposables.push(funcProvider, hoverProvider, diagnosticProvider);
      }

      // Emit configuration changed event
      configurationChangedCallbacks.forEach((callback) => {
        try {
          callback(currentConfiguration);
        } catch (error) {
          logger.error('Error in onConfigurationChanged callback', { error });
        }
      });

      logger.info('Context schema updated successfully');
    },
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
    onConfigurationChanged: (callback) => {
      configurationChangedCallbacks.push(callback);
      logger.debug('Registered onConfigurationChanged callback');
    },
    onValidationError: (callback) => {
      validationErrorCallbacks.push(callback);
      logger.debug('Registered onValidationError callback');
    },
    onContentPersisted: (callback) => {
      contentPersistedCallbacks.push(callback);
      logger.debug('Registered onContentPersisted callback');
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
