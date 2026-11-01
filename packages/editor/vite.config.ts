import { defineConfig, type LibraryOptions } from 'vite';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

// Library build: Monaco and Lit stay external (peer/dep), the host bundler dedupes them.
// Standalone build (`--mode standalone`): one ES module with Monaco, Lit and CSS inlined.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    plugins: standalone ? [cssInjectedByJs()] : [],
    worker: { format: 'es' },
    build: {
      target: 'es2022',
      sourcemap: true,
      emptyOutDir: !standalone,
      outDir: standalone ? 'dist/standalone' : 'dist',
      minify: standalone,
      lib: {
        entry: (standalone
          ? { 'php-script-editor': 'src/standalone.ts' }
          : { index: 'src/index.ts', core: 'src/core.ts' }) as Record<string, string>,
        formats: ['es'],
      } satisfies LibraryOptions,
      rollupOptions: {
        // `?worker&inline` is never external: the worker is bundled as a blob so any host bundler works.
        external: standalone
          ? []
          : (id: string) =>
              !id.includes('?worker') && /^(lit|@lit\/|lit-html|monaco-editor)($|\/)/.test(id),
        output: standalone ? { codeSplitting: false } : {},
      },
    },
  };
});
