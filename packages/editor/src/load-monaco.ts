import type { Monaco } from './monaco.js';

let loading: Promise<Monaco> | null = null;

/**
 * Loads Monaco on demand. It is a separate chunk, so the element itself stays small and the page
 * renders before the editor code arrives. Every call resolves to the same namespace.
 */
export function loadMonaco(): Promise<Monaco> {
  loading ??= import('./monaco.js').then(
    (module) => module.monaco,
    (error: unknown) => {
      loading = null; // allow a retry, e.g. after a network error
      throw error;
    },
  );
  return loading;
}
