# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the packages use
[Semantic Versioning](https://semver.org/).

## [2.0.0] - Unreleased

Complete rewrite on top of php-script v2.

### Added

- `@php-script/editor`: the `<php-script-editor>` Lit web component.
  - Monaco configured from the `MonarchLanguageDefinitionService` JSON.
  - Saving: `POST` for new scripts, then `PUT`; the method can be overridden.
  - Lint markers.
  - Light, dark and auto themes, plus external themes through CSS custom properties or a theme object.
  - Form association.
  - Standalone bundle.
- `@php-script/editor-react`, `@php-script/editor-vue` and `@php-script/editor-svelte` wrappers.
- `php-script/editor-laravel`: `EditorConfig`, `LintResponse`, the `ValidPhpScript` rule, the Blade
  component and the Filament form field.
- PHP dev server, Vite playground and Playwright e2e tests (Chromium, Firefox, WebKit).
- Docker Compose setup, GitHub Actions CI and Dependabot.

### Removed

- The v1 `php-script-monaco-editor` package and its localStorage persistence.
