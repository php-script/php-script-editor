import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const php = process.env.PHP_SERVER ?? 'http://127.0.0.1:8080';
const pages = ['index', 'vanilla', 'react', 'vue', 'svelte', 'standalone'];

export default defineConfig({
  plugins: [react(), vue(), svelte()],
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    proxy: { '/api': { target: php, changeOrigin: true } },
    fs: { allow: ['..'] },
    // OrbStack serves containers as <service>.<project>.orb.local; Docker Desktop uses localhost.
    allowedHosts: ['.orb.local', 'localhost', '127.0.0.1'],
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: php, changeOrigin: true } },
    // OrbStack serves containers as <service>.<project>.orb.local; Docker Desktop uses localhost.
    allowedHosts: ['.orb.local', 'localhost', '127.0.0.1'],
  },
  resolve: {
    alias: {
      // The standalone page loads the prebuilt bundle, like a Laravel/Filament app would.
      '/standalone/php-script-editor.js': resolve(
        import.meta.dirname,
        '../packages/editor/dist/standalone/php-script-editor.js',
      ),
    },
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
});
