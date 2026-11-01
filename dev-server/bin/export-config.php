<?php

declare(strict_types=1);

// Writes the sample config JSON used as test fixture by packages/editor.
// Usage: php bin/export-config.php [target-file]

require __DIR__ . '/../vendor/autoload.php';

$target = $argv[1] ?? __DIR__ . '/../../packages/editor/test/fixtures/sample-config.json';
@mkdir(dirname($target), 0777, true);
file_put_contents(
    $target,
    json_encode(DevServer\SampleEngine::config(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n",
);
fwrite(STDOUT, "Wrote $target\n");
