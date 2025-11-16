import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'language/index': 'src/language/index.ts',
    'config/index': 'src/config/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true, // Generate .d.ts files
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
  external: ['monaco-editor'], // Don't bundle Monaco
  treeshake: true,
  minify: false, // Let consumers minify if needed
  target: 'es2020',
});
