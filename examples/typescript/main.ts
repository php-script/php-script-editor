import { createPhpScriptEditor, type PhpScriptEditor } from '../../src/index';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    phpScriptEditorConfig: any;
    phpScriptInitialContent: string;
  }
}

let editor: PhpScriptEditor;

async function initializeEditor() {
  const container = document.getElementById('editor-container');

  if (!container) {
    console.error('Editor container not found');
    return;
  }

  try {
    // Create the editor with configuration from server-side rendering
    editor = await createPhpScriptEditor(container, {
      configuration: window.phpScriptEditorConfig,
      initialValue: window.phpScriptInitialContent,
      theme: 'vs-dark',
      enableContentPersistence: true,
      storageKey: 'typescript-example-content',
      monacoOptions: {
        fontSize: 14,
        minimap: { enabled: true },
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        automaticLayout: true
      }
    });

    updateStatus('Editor initialized successfully');

    // Setup event listeners
    setupEventListeners();
    setupEditorEvents();

  } catch (error) {
    console.error('Failed to initialize editor:', error);
    updateStatus(`Error: ${(error as Error).message}`, true);
  }
}

function setupEditorEvents() {
  // Listen to content changes
  editor.monaco.onDidChangeModelContent(() => {
    const lineCount = editor.monaco.getModel()?.getLineCount() || 0;
    updateStatus(`Content changed | Lines: ${lineCount}`);
  });

  // Listen to content persistence
  editor.onContentPersisted((content) => {
    console.log('Content auto-saved to localStorage');
    updateStatus('Content auto-saved');
  });

  // Listen to configuration changes
  editor.onConfigurationChanged((config) => {
    console.log('Configuration updated:', config.bundleVersion);
    updateStatus(`Configuration updated: v${config.bundleVersion}`);
  });

  // Listen to validation errors
  editor.onValidationError((error) => {
    console.error('Validation error:', error);
    updateStatus(`Validation error: ${error.message}`, true);
  });
}

function setupEventListeners() {
  // Get Value button
  document.getElementById('getValue')?.addEventListener('click', () => {
    const value = editor.getValue();
    console.log('Current editor value:', value);
    alert(`Editor content:\n\n${value}`);
  });

  // Set Value button
  document.getElementById('setValue')?.addEventListener('click', () => {
    const sampleCode = `// Sample php-script code
if (user.logins.count > 10) {
    result = "Frequent user: " + user.name
} else {
    result = "New user"
}

// String manipulation
username = substr(user.email, 0, strlen(user.email) - 4)`;

    editor.setValue(sampleCode);
    updateStatus('Sample code loaded');
  });

  // Revert button
  document.getElementById('revert')?.addEventListener('click', () => {
    if (confirm('Revert to original content? This will discard all changes.')) {
      editor.revertToOriginal();
      updateStatus('Reverted to original content');
    }
  });

  // Clear Storage button
  document.getElementById('clearStorage')?.addEventListener('click', () => {
    if (confirm('Clear localStorage? Content will not be auto-saved anymore.')) {
      editor.clearLocalStorage();
      updateStatus('localStorage cleared');
    }
  });

  // Check Changes button
  document.getElementById('checkChanges')?.addEventListener('click', () => {
    const hasChanges = editor.hasUnsavedChanges();
    const original = editor.getOriginalContent();
    const current = editor.getValue();

    alert(`Has unsaved changes: ${hasChanges}\n\nOriginal content:\n${original}\n\nCurrent content:\n${current}`);
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (editor.hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function updateStatus(message: string, isError: boolean = false) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.background = isError ? '#f44747' : '#007acc';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEditor);
} else {
  initializeEditor();
}

// Export for debugging
(window as any).editor = editor;
