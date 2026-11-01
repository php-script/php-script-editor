import { LitElement, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { ConfigError, DEFAULT_CONFIG, hashString, normalizeConfig } from './config.js';
import { MARKER_OWNER, ensureLanguage, toMarkers } from './language.js';
import { monaco } from './monaco.js';
import { dedent } from './text.js';
import {
  SaveError,
  buildSaveRequest,
  requestLint,
  resolveSaveMethod,
  sendSave,
  type SaveResult,
} from './save-client.js';
import {
  detectPageBase,
  parseThemeAttribute,
  readCssOverrides,
  resolveTheme,
  toMonacoTheme,
  watchPageBase,
  type PhpScriptTheme,
  type ResolvedTheme,
  type ThemeMode,
} from './theme.js';
import type { LintDiagnostic, PhpScriptConfig, SaveMethod, SaveStatus } from './types.js';

export const TAG_NAME = 'php-script-editor';

export interface EditorLabels {
  save: string;
  saving: string;
  saved: string;
  dirty: string;
  error: string;
}

const DEFAULT_LABELS: EditorLabels = {
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved',
  dirty: 'Unsaved changes',
  error: 'Save failed',
};

export interface PhpScriptEditorEventMap {
  'ps-ready': CustomEvent<{ editor: monaco.editor.IStandaloneCodeEditor; monaco: typeof monaco }>;
  'ps-change': CustomEvent<{ value: string }>;
  'ps-save-start': CustomEvent<{ url: string; method: SaveMethod; body: Record<string, unknown> }>;
  'ps-saved': CustomEvent<SaveResult & { value: string }>;
  'ps-save-error': CustomEvent<{ error: Error; status?: number; data?: unknown }>;
  'ps-diagnostics': CustomEvent<{ diagnostics: LintDiagnostic[] }>;
  'ps-config-error': CustomEvent<{ error: Error }>;
}

const jsonAttribute = {
  fromAttribute(value: string | null): unknown {
    if (value === null || value === '') return null;
    try {
      return JSON.parse(value);
    } catch {
      return value; // reported as config error later
    }
  },
  toAttribute: (value: unknown) => (value == null ? null : JSON.stringify(value)),
};

const STYLE_ID = 'php-script-editor-styles';
const STYLES = `
${TAG_NAME}{display:block;position:relative;box-sizing:border-box;height:var(--php-script-editor-height,20rem);min-height:6rem;border:1px solid var(--pse-border);border-radius:var(--php-script-editor-radius,.5rem);overflow:hidden;background:var(--pse-background);color:var(--pse-foreground);font-family:var(--php-script-editor-ui-font,system-ui,sans-serif)}
${TAG_NAME}:focus-within{outline:2px solid var(--php-script-editor-focus-ring,transparent);outline-offset:1px}
${TAG_NAME} .pse-root{display:flex;flex-direction:column;height:100%}
/* Monaco themes are page-global; background and gutter follow each element's own colors. */
${TAG_NAME} .monaco-editor,${TAG_NAME} .monaco-editor .margin,${TAG_NAME} .monaco-editor-background{background-color:var(--pse-background)}
${TAG_NAME} .pse-editor{flex:1 1 auto;min-height:0}
${TAG_NAME} .pse-toolbar{display:flex;align-items:center;gap:.5rem;padding:.375rem .5rem;border-top:1px solid var(--pse-border);font-size:12px;line-height:1.4}
${TAG_NAME} .pse-status{margin-right:auto;opacity:.75}
${TAG_NAME} .pse-status[data-status=error]{color:var(--pse-danger);opacity:1}
${TAG_NAME} .pse-status[data-status=saved]{color:var(--pse-success);opacity:1}
${TAG_NAME} .pse-save{appearance:none;border:1px solid var(--pse-accent);background:var(--pse-accent);color:var(--php-script-editor-accent-contrast,#fff);border-radius:var(--php-script-editor-button-radius,.375rem);padding:.25rem .75rem;font:inherit;font-weight:600;cursor:pointer}
${TAG_NAME} .pse-save:disabled{opacity:.5;cursor:default}
${TAG_NAME} .pse-save:focus-visible{outline:2px solid var(--pse-accent);outline-offset:2px}
`;

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.prepend(style); // first, so page CSS can override it
}

const definedThemes = new Set<string>();

/**
 * `<php-script-editor>`: Monaco editor for php-script v2.
 *
 * Renders into light DOM (no shadow root) because Monaco injects its CSS into `document.head`.
 */
export class PhpScriptEditor extends LitElement {
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    value: { type: String },
    config: { converter: jsonAttribute },
    configUrl: { type: String, attribute: 'config-url' },
    saveUrl: { type: String, attribute: 'save-url' },
    saveMethod: { type: String, attribute: 'save-method' },
    saveField: { type: String, attribute: 'save-field' },
    saveHeaders: { converter: jsonAttribute, attribute: 'save-headers' },
    savePayload: { converter: jsonAttribute, attribute: 'save-payload' },
    persisted: { type: Boolean },
    csrfToken: { type: String, attribute: 'csrf-token' },
    lintUrl: { type: String, attribute: 'lint-url' },
    lintDelay: { type: Number, attribute: 'lint-delay' },
    theme: { converter: { fromAttribute: parseThemeAttribute, toAttribute: () => null } },
    readonly: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    options: { converter: jsonAttribute },
    labels: { converter: jsonAttribute },
    noToolbar: { type: Boolean, attribute: 'no-toolbar' },
    noSaveShortcut: { type: Boolean, attribute: 'no-save-shortcut' },
    status: { type: String, reflect: true },
    _message: { state: true },
  };

  /** Script content. Updates while the user types. */
  declare value: string;
  /** Output of the MonarchLanguageDefinitionService: `{ definition, completions }` (object or JSON). */
  declare config: PhpScriptConfig | string | null;
  /** URL that returns the config JSON. Used when `config` is not set. */
  declare configUrl: string | null;
  declare saveUrl: string | null;
  /** Override for the save method. Default: POST for new scripts, PUT once saved. */
  declare saveMethod: SaveMethod | null;
  /** JSON field the content is sent in. Default `content`. */
  declare saveField: string;
  declare saveHeaders: Record<string, string> | null;
  /** Extra fields merged into the save body. */
  declare savePayload: Record<string, unknown> | null;
  /** The script already exists on the server (forces PUT). Default: true when `value` starts non-empty. */
  declare persisted: boolean | undefined;
  /** CSRF token. Default: `<meta name="csrf-token">`. */
  declare csrfToken: string | null;
  /** Optional endpoint that returns php-script lint diagnostics. */
  declare lintUrl: string | null;
  declare lintDelay: number;
  /** `light`, `dark`, `auto` (default, follows the page) or a {@link PhpScriptTheme} object. */
  declare theme: ThemeMode | PhpScriptTheme;
  declare readonly: boolean;
  declare name: string | null;
  /** Extra Monaco editor options. */
  declare options: monaco.editor.IStandaloneEditorConstructionOptions | null;
  declare labels: Partial<EditorLabels> | null;
  declare noToolbar: boolean;
  declare noSaveShortcut: boolean;
  /** Save state, reflected as `status` attribute for styling. */
  declare status: SaveStatus;
  declare _message: string;

  #editor: monaco.editor.IStandaloneCodeEditor | null = null;
  #model: monaco.editor.ITextModel | null = null;
  #resolvedConfig: PhpScriptConfig = DEFAULT_CONFIG;
  #loadedConfigUrl: string | null = null;
  #initialValue: string | null = null;
  #savedValue = '';
  #valueAtFocus = '';
  #applyingExternalValue = false;
  #unwatchTheme: (() => void) | null = null;
  #lintTimer: ReturnType<typeof setTimeout> | undefined;
  #lintAbort: AbortController | null = null;
  #mounting: Promise<void> | null = null;
  #readyResolve!: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  #ready = new Promise<monaco.editor.IStandaloneCodeEditor>(
    (resolve) => (this.#readyResolve = resolve),
  );
  #internals: ElementInternals | null = null;
  #currentTheme: ResolvedTheme | null = null;
  #disabledByForm = false;

  constructor() {
    super();
    this.value = '';
    this.config = null;
    this.configUrl = null;
    this.saveUrl = null;
    this.saveMethod = null;
    this.saveField = 'content';
    this.saveHeaders = null;
    this.savePayload = null;
    this.persisted = undefined;
    this.csrfToken = null;
    this.lintUrl = null;
    this.lintDelay = 400;
    this.theme = 'auto';
    this.readonly = false;
    this.name = null;
    this.options = null;
    this.labels = null;
    this.noToolbar = false;
    this.noSaveShortcut = false;
    this.status = 'idle';
    this._message = '';
    try {
      this.#internals = this.attachInternals();
    } catch {
      this.#internals = null; // old browsers / test DOMs
    }
  }

  /** Monaco namespace used by this element. */
  get monaco(): typeof monaco {
    return monaco;
  }

  /** The Monaco editor instance, or null before `ps-ready`. */
  get editor(): monaco.editor.IStandaloneCodeEditor | null {
    return this.#editor;
  }

  /** The config in use after normalization. */
  get resolvedConfig(): PhpScriptConfig {
    return this.#resolvedConfig;
  }

  /** Resolves with the Monaco editor once it is mounted. */
  whenReady(): Promise<monaco.editor.IStandaloneCodeEditor> {
    return this.#ready;
  }

  /** True when the content differs from the last saved (or initial) content. */
  get dirty(): boolean {
    return this.value !== this.#savedValue;
  }

  // Light DOM: Monaco's global CSS must reach the editor.
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    if (this.#initialValue === null) this.#takeInitialContent();
    injectStyles();
    super.connectedCallback();
    this.#unwatchTheme = watchPageBase(() => this.refreshTheme());
    if (this.hasUpdated && !this.#editor) void this.#mount();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unwatchTheme?.();
    this.#unwatchTheme = null;
    clearTimeout(this.#lintTimer);
    this.#lintAbort?.abort();
    this.#editor?.dispose();
    this.#model?.dispose();
    this.#editor = null;
    this.#model = null;
    this.#mounting = null;
    this.#ready = new Promise((resolve) => (this.#readyResolve = resolve));
  }

  /** Reads `<script type="text/php-script">` / `<template>` children as initial content (dedented). */
  #takeInitialContent(): void {
    const source = this.querySelector<HTMLScriptElement | HTMLTemplateElement>(
      ':scope > script[type="text/php-script"], :scope > template',
    );
    if (source) {
      const text =
        source instanceof HTMLTemplateElement
          ? (source.content.textContent ?? '')
          : (source.textContent ?? '');
      if (!this.value) this.value = dedent(text);
      source.remove();
    }
    this.#initialValue = this.value ?? '';
    this.#savedValue = this.#initialValue;
    this.#internals?.setFormValue(this.#initialValue);
  }

  protected override render() {
    const labels = { ...DEFAULT_LABELS, ...this.labels };
    const showToolbar = Boolean(this.saveUrl) && !this.noToolbar;
    const statusText =
      this.status === 'error'
        ? this._message || labels.error
        : this.status === 'saving'
          ? labels.saving
          : this.status === 'saved'
            ? labels.saved
            : this.status === 'dirty'
              ? labels.dirty
              : '';
    return html`<div class="pse-root">
      <div class="pse-editor"></div>
      ${
        showToolbar
          ? html`<div class="pse-toolbar">
              <span class="pse-status" data-status=${this.status} role="status" aria-live="polite"
                >${statusText}</span
              >
              <button
                type="button"
                class="pse-save"
                ?disabled=${this.status === 'saving' || this.readonly}
                @click=${() => void this.save().catch(() => undefined)}
              >
                ${labels.save}
              </button>
            </div>`
          : nothing
      }
    </div>`;
  }

  protected override firstUpdated(): void {
    void this.#mount();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!this.#editor || !this.#model) return;

    if (
      changed.has('value') &&
      !this.#applyingExternalValue &&
      this.value !== this.#model.getValue()
    ) {
      this.#applyingExternalValue = true;
      this.#model.pushEditOperations(
        [],
        [{ range: this.#model.getFullModelRange(), text: this.value ?? '' }],
        () => null,
      );
      this.#applyingExternalValue = false;
    }
    if (changed.has('readonly') || changed.has('options')) {
      this.#editor.updateOptions({
        ...this.options,
        readOnly: this.readonly || this.#disabledByForm,
      });
    }
    if (changed.has('theme')) this.refreshTheme();
    if (changed.has('config') || (changed.has('configUrl') && !this.config))
      void this.reloadConfig();
  }

  async #loadConfig(): Promise<PhpScriptConfig> {
    try {
      if (this.config) return normalizeConfig(this.config);
      if (this.configUrl) {
        const response = await fetch(this.configUrl, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        if (!response.ok) throw new ConfigError(`Loading config failed (HTTP ${response.status})`);
        this.#loadedConfigUrl = this.configUrl;
        return normalizeConfig(await response.json());
      }
    } catch (error) {
      this.#emit('ps-config-error', { error: error as Error });
      console.error('[php-script-editor]', error);
    }
    return DEFAULT_CONFIG;
  }

  #mount(): Promise<void> {
    this.#mounting ??= (async () => {
      this.#resolvedConfig = await this.#loadConfig();
      const container = this.querySelector<HTMLElement>('.pse-editor');
      if (!this.isConnected || !container || this.#editor) return;

      const languageId = ensureLanguage(monaco, this.#resolvedConfig);
      this.#model = monaco.editor.createModel(this.value ?? '', languageId);
      this.#applyTheme();
      this.#editor = monaco.editor.create(container, {
        model: this.#model,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fixedOverflowWidgets: true,
        roundedSelection: true,
        snippetSuggestions: 'inline',
        tabSize: 4,
        fontSize: 14,
        padding: { top: 8, bottom: 8 },
        ...this.options,
        readOnly: this.readonly || this.#disabledByForm,
      });

      this.#editor.onDidChangeModelContent(() => this.#onContentChange());
      this.#editor.onDidFocusEditorText(() => (this.#valueAtFocus = this.value));
      this.#editor.onDidBlurEditorText(() => {
        if (this.value !== this.#valueAtFocus)
          this.dispatchEvent(new Event('change', { bubbles: true }));
      });
      this.#editor.addAction({
        id: 'php-script.save',
        label: 'Save script',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        precondition: undefined,
        run: () => {
          if (!this.noSaveShortcut && this.saveUrl) void this.save().catch(() => undefined);
        },
      });

      this.#readyResolve(this.#editor);
      this.#emit('ps-ready', { editor: this.#editor, monaco });
      if (this.lintUrl && this.value) this.#scheduleLint();
    })();
    return this.#mounting;
  }

  #onContentChange(): void {
    if (!this.#model) return;
    const value = this.#model.getValue();
    const external = this.#applyingExternalValue;
    this.value = value;
    this.#internals?.setFormValue(value);
    if (this.status !== 'saving')
      this.status = this.dirty ? 'dirty' : this.status === 'dirty' ? 'idle' : this.status;
    if (external) return;
    this.dispatchEvent(new Event('input', { bubbles: true }));
    this.#emit('ps-change', { value });
    this.#scheduleLint();
  }

  /** Reloads the config from `config` / `config-url` and re-tokenizes. */
  async reloadConfig(): Promise<void> {
    if (!this.#model) return;
    if (!this.config && this.configUrl === this.#loadedConfigUrl && this.#loadedConfigUrl) {
      // forced reload of the same URL
      this.#loadedConfigUrl = null;
    }
    this.#resolvedConfig = await this.#loadConfig();
    if (this.#model)
      monaco.editor.setModelLanguage(this.#model, ensureLanguage(monaco, this.#resolvedConfig));
  }

  /** Re-reads the theme (mode, CSS custom properties, theme object) and applies it. */
  refreshTheme(): void {
    this.#applyTheme();
  }

  #applyTheme(): void {
    const theme = typeof this.theme === 'string' ? parseThemeAttribute(this.theme) : this.theme;
    const mode: ThemeMode = typeof theme === 'string' ? theme : 'auto';
    const custom: PhpScriptTheme = typeof theme === 'object' && theme ? theme : {};
    const base = mode === 'auto' ? detectPageBase() : mode;
    const style = getComputedStyle(this);
    const resolved = resolveTheme(
      base,
      readCssOverrides((name) => style.getPropertyValue(name)),
      custom,
    );
    const data = toMonacoTheme(resolved);
    const name = `php-script-${hashString(JSON.stringify(data))}`;
    if (!definedThemes.has(name)) {
      monaco.editor.defineTheme(name, data);
      definedThemes.add(name);
    }
    monaco.editor.setTheme(name);
    this.#currentTheme = resolved;
    for (const key of [
      'background',
      'foreground',
      'border',
      'accent',
      'danger',
      'success',
    ] as const) {
      this.style.setProperty(`--pse-${key}`, resolved.colors[key]);
    }
    this.dataset.themeBase = resolved.base;
  }

  /** The theme currently applied (after merging palette, CSS variables and theme object). */
  get currentTheme(): ResolvedTheme | null {
    return this.#currentTheme;
  }

  /** Saves the content to `save-url`. Resolves with the server response; rejects with a SaveError. */
  async save(): Promise<SaveResult> {
    if (!this.saveUrl) throw new SaveError('No save-url set', 0, null);
    const content = this.value;
    const persisted = this.persisted ?? this.#initialValue !== '';
    const request = buildSaveRequest({
      url: this.saveUrl,
      method: this.saveMethod,
      persisted,
      field: this.saveField || 'content',
      content,
      payload: this.savePayload,
      headers: this.saveHeaders,
      csrfToken: this.csrfToken,
    });

    const proceed = this.#emit(
      'ps-save-start',
      { url: request.url, method: request.method, body: request.body },
      true,
    );
    if (!proceed) throw new SaveError('Save cancelled', 0, null);

    this.status = 'saving';
    this._message = '';
    try {
      const result = await sendSave(request, { field: this.saveField || 'content' });
      this.#savedValue = content;
      this.status = this.dirty ? 'dirty' : 'saved';
      if (resolveSaveMethod(this.saveMethod, persisted) === 'POST' && !this.saveMethod) {
        this.persisted = true;
        this.saveUrl = result.nextUrl;
      }
      this.#emit('ps-saved', { ...result, value: content });
      return result;
    } catch (error) {
      const saveError =
        error instanceof SaveError ? error : new SaveError((error as Error).message, 0, null);
      this.status = 'error';
      this._message = saveError.message;
      if (saveError.diagnostics.length) this.setDiagnostics(saveError.diagnostics);
      this.#emit('ps-save-error', {
        error: saveError,
        status: saveError.status,
        data: saveError.data,
      });
      throw saveError;
    }
  }

  /** Shows php-script `LintDiagnostic`s as editor markers. Pass [] to clear. */
  setDiagnostics(diagnostics: LintDiagnostic[]): void {
    if (this.#model)
      monaco.editor.setModelMarkers(this.#model, MARKER_OWNER, toMarkers(monaco, diagnostics));
    this.#emit('ps-diagnostics', { diagnostics });
  }

  /** Runs the `lint-url` endpoint now. */
  async lint(): Promise<LintDiagnostic[]> {
    if (!this.lintUrl) return [];
    this.#lintAbort?.abort();
    const abort = new AbortController();
    this.#lintAbort = abort;
    try {
      const diagnostics = await requestLint(this.lintUrl, this.value, {
        field: this.saveField || 'content',
        csrfToken: this.csrfToken,
        headers: this.saveHeaders,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) this.setDiagnostics(diagnostics);
      return diagnostics;
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        console.warn('[php-script-editor] lint failed', error);
      return [];
    }
  }

  #scheduleLint(): void {
    if (!this.lintUrl) return;
    clearTimeout(this.#lintTimer);
    this.#lintTimer = setTimeout(() => void this.lint(), this.lintDelay);
  }

  override focus(options?: FocusOptions): void {
    if (this.#editor) this.#editor.focus();
    else super.focus(options);
  }

  // Form-associated custom element callbacks.
  formResetCallback(): void {
    this.value = this.#initialValue ?? '';
  }

  formDisabledCallback(disabled: boolean): void {
    this.#disabledByForm = disabled;
    this.#editor?.updateOptions({ readOnly: this.readonly || disabled });
  }

  #emit<K extends keyof PhpScriptEditorEventMap>(
    type: K,
    detail: PhpScriptEditorEventMap[K]['detail'],
    cancelable = false,
  ): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'php-script-editor': PhpScriptEditor;
  }
  interface HTMLElementEventMap extends PhpScriptEditorEventMap {}
}
