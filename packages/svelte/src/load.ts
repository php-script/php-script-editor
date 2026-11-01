let loader: Promise<unknown> | null = null;

/** Loads and registers the custom element in the browser only (SvelteKit SSR-safe). */
export const loadPhpScriptEditor = () => (loader ??= import('@php-script/editor'));
