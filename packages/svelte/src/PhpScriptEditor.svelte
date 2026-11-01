<script lang="ts">
  import type {
    LintDiagnostic,
    PhpScriptConfig,
    PhpScriptEditor as PhpScriptEditorElement,
    PhpScriptTheme,
    SaveMethod,
    SaveResult,
    ThemeMode,
  } from '@php-script/editor';
  import { applyChangedProps } from '@php-script/editor/core';
  import { onMount } from 'svelte';
  import { loadPhpScriptEditor } from './load.js';

  type MonacoEditor = NonNullable<PhpScriptEditorElement['editor']>;

  interface Props {
    value?: string;
    config?: PhpScriptConfig | string | null;
    configUrl?: string;
    saveUrl?: string;
    saveMethod?: SaveMethod;
    saveField?: string;
    saveHeaders?: Record<string, string>;
    savePayload?: Record<string, unknown>;
    persisted?: boolean;
    csrfToken?: string;
    lintUrl?: string;
    lintDelay?: number;
    theme?: ThemeMode | PhpScriptTheme;
    readonly?: boolean;
    name?: string;
    options?: Record<string, unknown>;
    labels?: Record<string, string>;
    noToolbar?: boolean;
    noSaveShortcut?: boolean;
    /** CSS height, e.g. `24rem`. */
    height?: string;
    class?: string;
    /** The custom element (bindable). */
    element?: PhpScriptEditorElement | null;
    onchange?: (value: string) => void;
    onready?: (editor: MonacoEditor, element: PhpScriptEditorElement) => void;
    onsavestart?: (event: CustomEvent) => void;
    onsaved?: (result: SaveResult & { value: string }) => void;
    onsaveerror?: (error: Error) => void;
    ondiagnostics?: (diagnostics: LintDiagnostic[]) => void;
  }

  let {
    value = $bindable(''),
    element = $bindable(null),
    height,
    class: className,
    onchange,
    onready,
    onsavestart,
    onsaved,
    onsaveerror,
    ondiagnostics,
    ...rest
  }: Props = $props();

  // Push props to element properties (objects pass without JSON).
  // Only changed props, so the element's own updates (persisted, saveUrl after POST) survive.
  const synced = new Map<string, unknown>();
  $effect(() => {
    if (element) applyChangedProps(element, { ...rest }, synced);
  });

  $effect(() => {
    if (element && value !== undefined && element.value !== value) element.value = value;
  });

  onMount(() => {
    const el = element!;
    const listeners: Array<[string, (event: Event) => void]> = [
      [
        'ps-change',
        (e) => {
          value = (e as CustomEvent<{ value: string }>).detail.value;
          onchange?.(value);
        },
      ],
      [
        'ps-ready',
        (e) => onready?.((e as CustomEvent<{ editor: MonacoEditor }>).detail.editor, el),
      ],
      ['ps-save-start', (e) => onsavestart?.(e as CustomEvent)],
      ['ps-saved', (e) => onsaved?.((e as CustomEvent<SaveResult & { value: string }>).detail)],
      ['ps-save-error', (e) => onsaveerror?.((e as CustomEvent<{ error: Error }>).detail.error)],
      [
        'ps-diagnostics',
        (e) =>
          ondiagnostics?.((e as CustomEvent<{ diagnostics: LintDiagnostic[] }>).detail.diagnostics),
      ],
    ];
    for (const [type, fn] of listeners) el.addEventListener(type, fn);
    void loadPhpScriptEditor();
    return () => {
      for (const [type, fn] of listeners) el.removeEventListener(type, fn);
    };
  });
</script>

<php-script-editor bind:this={element} class={className} style:--php-script-editor-height={height}
></php-script-editor>
