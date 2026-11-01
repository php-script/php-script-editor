---
title: Server and language config
nav_order: 5
---

# Server and language config
{: .no_toc }

The editor does not hard-code the language. Highlighting and completions come from your PHP Script
`Engine`, so users see exactly the functions and variables they may use.

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## The config JSON

PHP Script v2's `MonarchLanguageDefinitionService` produces two parts. The editor expects them as
`{ "definition": …, "completions": … }`:

```php
use PhpScript\Core\Engine;

$engine = new Engine()
    ->allow('strtoupper', 'round')
    ->set('order', $order, 'The current order');

$service = $engine->monarchLanguageDefinition();

echo json_encode([
    'definition' => $service->getDefinition(),
    'completions' => $service->getCompletionItems(),
]);
```

| Part          | Source                 | Contents                                                                                                                                      |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `definition`  | `getDefinition()`      | Monarch tokenizer: `keywords`, `loopKeywords`, `allowedFunctions`, `contextVariables`, `operators`, `symbols`, `tokenizer`                    |
| `completions` | `getCompletionItems()` | `globalFunctions`, `globalVariables`, `classes` (properties and methods of reflected objects), `controlFlows`, `loopControls`, `loopKeywords` |

How these are built, and how loop-aware completion works, is described in PHP Script's
[editor integration guide](https://php-script.github.io/php-script/php/editor.html). Which
functions and variables appear depends on
[`allow()`](https://php-script.github.io/php-script/php/functions.html) and
[`set()`](https://php-script.github.io/php-script/php/context.html).

The element does the Monaco work for you: it registers a language per distinct config, a
completion provider (member completion along `order.customer.` chains, loop keywords only inside
loops, local variables) and hovers.

### Passing the config

- **Inline:** `config` as an object property or a JSON attribute. Good for server-rendered pages.
- **URL:** `config-url`. The element fetches it with `Accept: application/json` and
  `credentials: 'same-origin'`.
- With Laravel, `EditorConfig::fromEngine($engine)` builds it and can be returned from a
  controller. See [Laravel](./packages/laravel.html#editor-config).

The element also accepts `{ language, completionItems }`, `{ definition, completionItems }` or a
bare `getDefinition()` result. Without any config it highlights the core language with no allowed
functions or variables. An invalid config fires `ps-config-error` and falls back to that default.
Call `el.reloadConfig()` after the engine changed.

{: .note }
PHP's `json_encode()` turns an empty `classes` map into `[]`. The editor accepts that;
`EditorConfig` encodes it as `{}`.

## Lint endpoint

`lint-url` receives a `POST` with `{"content": "…"}` and returns PHP Script's diagnostics:

```php
$diagnostics = array_map(
    fn ($diagnostic) => $diagnostic->toArray(),
    $engine->linter($content)->diagnostics(),
);

http_response_code($hasErrors ? 422 : 200);
echo json_encode(['diagnostics' => $diagnostics]);
```

Each entry has `message`, 1-based `line` and `column`, and optionally `length`, `rule` and
`severity` (`error` or `warning`). See PHP Script's
[Linting](https://php-script.github.io/php-script/php/linting.html) page for the rules.

## Save endpoints

| Request                     | Body                          | Expected response                                                        |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `POST save-url` (new)       | `{ ...savePayload, content }` | `201` with a `Location` header (or a `url` field) for later `PUT`s       |
| `PUT <Location>` (existing) | `{ ...savePayload, content }` | `2xx`                                                                    |
| Validation error            |                               | `422` `{ "message", "errors": { "content": ["…"] }, "diagnostics": [] }` |

The toolbar shows `errors.content[0]` or `message`, and `diagnostics` become markers. Validate
with the same engine's linter before storing a script. Requests carry `X-CSRF-TOKEN` from
`<meta name="csrf-token">` when present.

The repository's [dev server](https://github.com/php-script/php-script-editor/blob/main/dev-server/public/index.php)
is a complete plain-PHP example with config, CRUD, lint and run endpoints. For Laravel, see
[Controllers](./packages/laravel.html#controllers).

## Security

The editor is a convenience, not a security boundary. Always validate and run scripts on the server
with an engine that allows only what users may use. See PHP Script's
[limits](https://php-script.github.io/php-script/php/limits.html) and
[error handling](https://php-script.github.io/php-script/php/error-handling.html).
