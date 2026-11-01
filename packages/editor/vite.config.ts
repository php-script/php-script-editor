import { defineConfig, type LibraryOptions } from 'vite';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

// Library build: Monaco and Lit stay external (peer/dep), the host bundler dedupes them.
// Standalone build (`--mode standalone`): a small entry with Lit and the element, plus hashed
// chunks for Monaco and its worker that the entry loads on demand. CSS is injected by the chunk
// that imports it, so the entry stays small.
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    plugins: standalone ? [cssInjectedByJs({ relativeCSSInjection: true })] : [],
    worker: {
      format: 'es',
      // Library consumers copy the worker as an asset without minifying it, so minify it here.
      rollupOptions: { output: { entryFileNames: 'assets/[name]-[hash].js', minify: true } },
    },
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
        output: {
          // The entry keeps a stable name (Blade and Filament reference it); everything it loads
          // is content-hashed, so it can be cached forever.
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
