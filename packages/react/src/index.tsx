'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { applyChangedProps } from '@php-script/editor/core';
import type {
  LintDiagnostic,
  PhpScriptConfig,
  PhpScriptEditor as PhpScriptEditorElement,
  PhpScriptTheme,
  SaveMethod,
  SaveResult,
  SaveStatus,
  ThemeMode,
} from '@php-script/editor';

export type { LintDiagnostic, PhpScriptConfig, PhpScriptTheme, SaveResult, SaveStatus };
export type { PhpScriptEditorElement };

type MonacoEditor = NonNullable<PhpScriptEditorElement['editor']>;

export interface PhpScriptEditorProps {
  /** Controlled value. Leave undefined and use `defaultValue` for uncontrolled use. */
  value?: string;
  defaultValue?: string;
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
  readOnly?: boolean;
  name?: string;
  options?: Record<string, unknown>;
  labels?: Partial<PhpScriptEditorElement['labels']>;
  noToolbar?: boolean;
  noSaveShortcut?: boolean;
  /** CSS height, e.g. `24rem`. Sets `--php-script-editor-height`. */
  height?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;

  onChange?: (value: string) => void;
  onReady?: (editor: MonacoEditor, element: PhpScriptEditorElement) => void;
  onSaveStart?: (
    event: CustomEvent<{ url: string; method: SaveMethod; body: Record<string, unknown> }>,
  ) => void;
  onSave?: (result: SaveResult & { value: string }) => void;
  onSaveError?: (error: Error) => void;
  onDiagnostics?: (diagnostics: LintDiagnostic[]) => void;
  onBlurChange?: (value: string) => void;
}

/** Imperative handle: `ref.current.save()`, `.element`, `.editor`. */
export interface PhpScriptEditorHandle {
  readonly element: PhpScriptEditorElement | null;
  readonly editor: MonacoEditor | null;
  save(): Promise<SaveResult>;
  lint(): Promise<LintDiagnostic[]>;
  focus(): void;
}

// Properties set on the element (not attributes), so objects pass without JSON.
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
  'name',
  'options',
  'labels',
  'noToolbar',
  'noSaveShortcut',
] as const;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

let loader: Promise<unknown> | null = null;
/** Loads and registers the custom element on the client only (SSR-safe). */
export const loadPhpScriptEditor = () => (loader ??= import('@php-script/editor'));

export const PhpScriptEditor = forwardRef<PhpScriptEditorHandle, PhpScriptEditorProps>(
  function PhpScriptEditor(props, ref): ReactElement {
    const elementRef = useRef<PhpScriptEditorElement | null>(null);
    const callbacks = useRef(props);
    callbacks.current = props;
    const [, setLoaded] = useState(false);
    const synced = useRef(new Map<string, unknown>());

    useImperativeHandle(
      ref,
      () => ({
        get element() {
          return elementRef.current;
        },
        get editor() {
          return elementRef.current?.editor ?? null;
        },
        save: () => elementRef.current!.save(),
        lint: () => elementRef.current?.lint() ?? Promise.resolve([]),
        focus: () => elementRef.current?.focus(),
      }),
      [],
    );

    useEffect(() => {
      let active = true;
      void loadPhpScriptEditor().then(() => active && setLoaded(true));
      return () => {
        active = false;
      };
    }, []);

    // Sync props to element properties.
    useIsoLayoutEffect(() => {
      const el = elementRef.current;
      if (!el) return;
      const next: Record<string, unknown> = { readonly: Boolean(props.readOnly) };
      for (const key of PROPS) next[key] = props[key];
      applyChangedProps(el, next, synced.current);
    });

    // Controlled value.
    useIsoLayoutEffect(() => {
      const el = elementRef.current;
      if (el && props.value !== undefined && el.value !== props.value) el.value = props.value;
    }, [props.value]);

    // Initial value (uncontrolled), before the element mounts Monaco.
    useIsoLayoutEffect(() => {
      const el = elementRef.current;
      if (el && props.value === undefined && props.defaultValue !== undefined)
        el.value = props.defaultValue;
    }, []);

    useEffect(() => {
      const el = elementRef.current;
      if (!el) return;
      const on = <T,>(type: string, handler: (event: CustomEvent<T>) => void) => {
        const listener = (event: Event) => handler(event as CustomEvent<T>);
        el.addEventListener(type, listener);
        return () => el.removeEventListener(type, listener);
      };
      const off = [
        on<{ value: string }>('ps-change', (e) => callbacks.current.onChange?.(e.detail.value)),
        on<{ editor: MonacoEditor }>('ps-ready', (e) =>
          callbacks.current.onReady?.(e.detail.editor, el),
        ),
        on<{ url: string; method: SaveMethod; body: Record<string, unknown> }>(
          'ps-save-start',
          (e) => callbacks.current.onSaveStart?.(e),
        ),
        on<SaveResult & { value: string }>('ps-saved', (e) => callbacks.current.onSave?.(e.detail)),
        on<{ error: Error }>('ps-save-error', (e) =>
          callbacks.current.onSaveError?.(e.detail.error),
        ),
        on<{ diagnostics: LintDiagnostic[] }>('ps-diagnostics', (e) =>
          callbacks.current.onDiagnostics?.(e.detail.diagnostics),
        ),
        on('change', () => callbacks.current.onBlurChange?.(el.value)),
      ];
      return () => off.forEach((fn) => fn());
    }, []);

    const style = props.height
      ? ({ ...props.style, '--php-script-editor-height': props.height } as CSSProperties)
      : props.style;

    return (
      <php-script-editor ref={elementRef} class={props.className} style={style} id={props.id} />
    );
  },
);

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'php-script-editor': {
        ref?: React.Ref<PhpScriptEditorElement>;
        class?: string | undefined;
        style?: React.CSSProperties | undefined;
        id?: string | undefined;
        children?: React.ReactNode;
      };
    }
  }
}

export default PhpScriptEditor;
