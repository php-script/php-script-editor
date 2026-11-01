import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type App,
  type PropType,
} from 'vue';
import { applyChangedProps } from '@php-script/editor/core';
import type {
  LintDiagnostic,
  PhpScriptConfig,
  PhpScriptEditor as PhpScriptEditorElement,
  PhpScriptTheme,
  SaveMethod,
  SaveResult,
  ThemeMode,
} from '@php-script/editor';

export type { LintDiagnostic, PhpScriptConfig, PhpScriptTheme, SaveResult, PhpScriptEditorElement };

let loader: Promise<unknown> | null = null;
/** Loads and registers the custom element in the browser only (SSR/Nuxt-safe). */
export const loadPhpScriptEditor = () => (loader ??= import('@php-script/editor'));

const PROPS = [
  'config',
  'configUrl',
  'saveUrl',
  'saveMethod',
  'saveField',
  'saveHeaders',
  'savePayload',
  'persisted',
  'csrfToken',
  'lintUrl',
  'lintDelay',
  'theme',
  'readonly',
  'name',
  'options',
  'labels',
  'noToolbar',
  'noSaveShortcut',
] as const;

/**
 * `<PhpScriptEditor v-model="code" :config="config" save-url="/scripts" />`
 *
 * Tell Vue that `php-script-editor` is a custom element when you use the tag directly:
 * `compilerOptions.isCustomElement: (tag) => tag === 'php-script-editor'`.
 * This wrapper renders it via `h()`, so it needs no compiler option.
 */
export const PhpScriptEditor = defineComponent({
  name: 'PhpScriptEditor',
  props: {
    modelValue: { type: String, default: undefined },
    config: {
      type: [Object, String] as PropType<PhpScriptConfig | string | null>,
      default: undefined,
    },
    configUrl: { type: String, default: undefined },
    saveUrl: { type: String, default: undefined },
    saveMethod: { type: String as PropType<SaveMethod>, default: undefined },
    saveField: { type: String, default: undefined },
    saveHeaders: { type: Object as PropType<Record<string, string>>, default: undefined },
    savePayload: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    persisted: { type: Boolean, default: undefined },
    csrfToken: { type: String, default: undefined },
    lintUrl: { type: String, default: undefined },
    lintDelay: { type: Number, default: undefined },
    theme: { type: [String, Object] as PropType<ThemeMode | PhpScriptTheme>, default: undefined },
    readonly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    options: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    labels: { type: Object as PropType<Record<string, string>>, default: undefined },
    noToolbar: { type: Boolean, default: false },
    noSaveShortcut: { type: Boolean, default: false },
    /** CSS height, e.g. `24rem`. */
    height: { type: String, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: string) => true,
    change: (_value: string) => true,
    ready: (_editor: unknown, _element: PhpScriptEditorElement) => true,
    'save-start': (_event: CustomEvent) => true,
    saved: (_result: SaveResult & { value: string }) => true,
    'save-error': (_error: Error) => true,
    diagnostics: (_diagnostics: LintDiagnostic[]) => true,
  },
  setup(props, { emit, expose }) {
    const element = shallowRef<PhpScriptEditorElement | null>(null);
    const loaded = ref(false);
    const cleanups: Array<() => void> = [];
    const synced = new Map<string, unknown>();

    const sync = () => {
      const el = element.value;
      if (!el) return;
      const next: Record<string, unknown> = {};
      for (const key of PROPS) next[key] = (props as Record<string, unknown>)[key];
      applyChangedProps(el, next, synced);
      if (props.modelValue !== undefined && el.value !== props.modelValue)
        el.value = props.modelValue;
    };

    onMounted(async () => {
      const el = element.value!;
      sync();
      const on = (type: string, handler: (event: CustomEvent) => void) => {
        const listener = (event: Event) => handler(event as CustomEvent);
        el.addEventListener(type, listener);
        cleanups.push(() => el.removeEventListener(type, listener));
      };
      on('ps-change', (e) => emit('update:modelValue', e.detail.value));
      on('change', () => emit('change', el.value));
      on('ps-ready', (e) => emit('ready', e.detail.editor, el));
      on('ps-save-start', (e) => emit('save-start', e));
      on('ps-saved', (e) => emit('saved', e.detail));
      on('ps-save-error', (e) => emit('save-error', e.detail.error));
      on('ps-diagnostics', (e) => emit('diagnostics', e.detail.diagnostics));
      await loadPhpScriptEditor();
      loaded.value = true;
    });

    onBeforeUnmount(() => cleanups.splice(0).forEach((fn) => fn()));
    watch(() => ({ ...props }), sync, { flush: 'post' });

    expose({
      element,
      get editor() {
        return element.value?.editor ?? null;
      },
      save: () => element.value!.save(),
      lint: () => element.value?.lint() ?? Promise.resolve([]),
      focus: () => element.value?.focus(),
    });

    return () =>
      h('php-script-editor', {
        ref: element,
        style: props.height ? { '--php-script-editor-height': props.height } : undefined,
      });
  },
});

/** `app.use(PhpScriptEditorPlugin)` registers `<PhpScriptEditor>` globally. */
export const PhpScriptEditorPlugin = {
  install(app: App) {
    app.component('PhpScriptEditor', PhpScriptEditor);
  },
};

export default PhpScriptEditor;
