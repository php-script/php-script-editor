<?php

declare(strict_types=1);

/**
 * Dev backend: `php -S 0.0.0.0:8080 -t public public/index.php`
 *
 *   GET  /api/config          editor config (MonarchLanguageDefinitionService)
 *   POST /api/scripts         create -> 201 + Location
 *   GET  /api/scripts/{id}    read
 *   PUT  /api/scripts/{id}    update (422 + diagnostics when the linter finds errors)
 *   POST /api/lint            diagnostics only
 *   POST /api/run             run the script, return output/value
 *   POST /api/reset           wipe stored scripts (tests)
 */

use DevServer\SampleEngine;
use PhpScript\Exceptions\EngineException;

require __DIR__ . '/../vendor/autoload.php';

$storage = getenv('SCRIPT_STORAGE') ?: __DIR__ . '/../storage';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, X-CSRF-TOKEN');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');
header('Access-Control-Expose-Headers: Location');
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json(mixed $data, int $status = 200, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    foreach ($headers as $name => $value) {
        header("$name: $value");
    }
    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** @return array<string, mixed> */
function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = $raw === '' ? [] : json_decode($raw, true);

    return is_array($data) ? $data : [];
}

/** @return list<array<string, mixed>> */
function lint(string $code): array
{
    return array_map(
        static fn ($d) => $d->toArray(),
        SampleEngine::make()->linter($code)->diagnostics(),
    );
}

function validated(array $body): string
{
    $content = $body['content'] ?? null;
    if (! is_string($content)) {
        json(['message' => 'The content field is required.', 'errors' => ['content' => ['The content field is required.']]], 422);
    }
    $diagnostics = array_values(array_filter(lint($content), static fn ($d) => ($d['severity'] ?? 'error') === 'error'));
    if ($diagnostics !== []) {
        $message = $diagnostics[0]['message'];
        json(['message' => $message, 'errors' => ['content' => [$message]], 'diagnostics' => $diagnostics], 422);
    }

    return $content;
}

function scriptFile(string $storage, string $id): string
{
    return $storage . '/' . $id . '.json';
}

if (! is_dir($storage)) {
    mkdir($storage, 0777, true);
}

switch (true) {
    case $method === 'GET' && $path === '/api/config':
        json(SampleEngine::config());

    case $method === 'POST' && $path === '/api/scripts':
        $body = body();
        $content = validated($body);
        $id = bin2hex(random_bytes(4));
        $record = ['id' => $id, 'name' => $body['name'] ?? null, 'content' => $content, 'updated_at' => date(DATE_ATOM)];
        file_put_contents(scriptFile($storage, $id), json_encode($record));
        json($record + ['url' => "/api/scripts/$id"], 201, ['Location' => "/api/scripts/$id"]);

    case (bool) preg_match('#^/api/scripts/([a-f0-9]+)$#', $path, $m):
        $file = scriptFile($storage, $m[1]);
        if (! is_file($file)) {
            json(['message' => 'Not found'], 404);
        }
        if ($method === 'GET') {
            json(json_decode((string) file_get_contents($file), true));
        }
        if ($method === 'PUT' || $method === 'PATCH') {
            $body = body();
            $record = json_decode((string) file_get_contents($file), true);
            $record['content'] = validated($body);
            $record['updated_at'] = date(DATE_ATOM);
            file_put_contents($file, json_encode($record));
            json($record);
        }
        json(['message' => 'Method not allowed'], 405);

    case $method === 'POST' && $path === '/api/lint':
        $content = (string) (body()['content'] ?? '');
        json(['diagnostics' => lint($content)]);

    case $method === 'POST' && $path === '/api/run':
        $content = (string) (body()['content'] ?? '');
        try {
            $result = SampleEngine::make()->run($content);
            json(['output' => $result->output, 'value' => $result->value, 'operations' => $result->operations]);
        } catch (EngineException $e) {
            $reason = property_exists($e, 'reason') ? $e->reason : $e->getMessage();
            json([
                'message' => $reason,
                'diagnostics' => [[
                    'rule' => 'runtime', 'message' => $reason, 'line' => $e->line,
                    'column' => max(1, $e->column), 'offset' => $e->offset, 'length' => $e->length, 'severity' => 'error',
                ]],
            ], 422);
        }

    case $method === 'POST' && $path === '/api/reset':
        array_map('unlink', glob($storage . '/*.json') ?: []);
        json(['ok' => true]);

    case $path === '/' || $path === '/health':
        json(['ok' => true, 'php' => PHP_VERSION]);
}

json(['message' => 'Not found'], 404);
