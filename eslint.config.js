import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import svelte from 'eslint-plugin-svelte';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.svelte-kit/**',
      '**/vendor/**',
      'packages/laravel/resources/dist/**',
      'dev-server/storage/**',
      'playground/test-results/**',
      'playground/playwright-report/**',
      'docs/_site/**',
      'docs/.jekyll-cache/**',
      'docs/vendor/**',
      '.specify/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/react/**/*.{ts,tsx}', 'playground/src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  ...vue.configs['flat/recommended'].map((config) => ({
    ...config,
    files: ['**/*.vue'],
  })),
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: {
      // Prettier owns formatting.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
  },
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
);
