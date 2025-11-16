import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
    target: 'es2020',
  },
  worker: {
    format: 'es', // Use ES modules for workers
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
