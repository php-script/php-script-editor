# php-script-editor

pnpm monorepo: `<php-script-editor>` web component (Lit + Monaco) for php-script v2, wrappers for
React/Vue/Svelte, and a Laravel/Filament composer package. See README.md for the public API.

## Stack

TypeScript ~6.0 (stay below 7), Vite 8, Vitest 5 (happy-dom + Playwright browser mode), Lit 3,
monaco-editor 0.57, Playwright e2e, ESLint flat config, Prettier. PHP 8.4, php-script ^2.0, Pest.

## Layout

```text
packages/editor   web component; src/core.ts exports framework-free helpers for the wrappers
packages/{react,vue,svelte}  thin wrappers, client-only loading, applyChangedProps for prop sync
packages/laravel  composer package php-script/editor-laravel (Pest tests)
dev-server        plain PHP php-script v2 API (config, scripts CRUD, lint, run)
playground        Vite multi-page app + Playwright e2e (e2e/*.spec.ts)
docker, compose.yaml  dev + test containers (Docker Desktop or OrbStack)
```

## Commands

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # before committing
pnpm test:e2e                                            # needs php for the dev server
docker compose up -d                                     # playground :5173, PHP API :8080
docker compose --profile test run --rm test              # full JS suite in a container
docker compose --profile test run --rm test-php          # Laravel package Pest suite
```

## Gotchas

- The element renders into light DOM, because Monaco injects its CSS into `document.head`.
- Monaco themes are global per page. Per-element background and gutter come from the `--pse-*`
  variables.
- Playwright's Desktop Chrome and Firefox devices use a Windows UA, so Monaco expects Control.
  Use `mod(page)` from `e2e/helpers.ts` instead of a hardcoded Meta.
- php-script v2: `.` is member access only. There is no string concat after a member.
- Build the editor before running the wrapper or playground tests, because the wrappers import
  `@php-script/editor/dist`.
- Commits use Conventional Commits. GitHub Actions are pinned by commit SHA.
