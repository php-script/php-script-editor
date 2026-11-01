<?php

declare(strict_types=1);

/*
 * Copies the standalone <php-script-editor> module into resources/dist/.
 *
 *   php bin/build-asset.php            copy packages/editor/dist/standalone/php-script-editor.js
 *   php bin/build-asset.php --build    run `pnpm --filter @php-script/editor build` first
 *   php bin/build-asset.php --from=/path/to/php-script-editor.js
 *
 * Only works inside the php-script-editor monorepo (or with --from).
 */

$options = getopt('', ['build', 'from:']);
$packageDir = dirname(__DIR__);
$monorepoRoot = dirname($packageDir, 2);
$source = is_string($options['from'] ?? null)
    ? $options['from']
    : $monorepoRoot.'/packages/editor/dist/standalone/php-script-editor.js';
$target = $packageDir.'/resources/dist/php-script-editor.js';

if (array_key_exists('build', $options)) {
    $command = 'pnpm --dir '.escapeshellarg($monorepoRoot).' --filter @php-script/editor build';
    fwrite(STDOUT, "> {$command}\n");
    passthru($command, $exitCode);

    if ($exitCode !== 0) {
        fwrite(STDERR, "Building the editor failed.\n");
        exit($exitCode);
    }
}

if (! is_file($source)) {
    fwrite(STDERR, "Missing {$source}.\nRun `pnpm --filter @php-script/editor build` in the monorepo root, or pass --build.\n");
    exit(1);
}

if (! is_dir(dirname($target)) && ! mkdir(dirname($target), 0o755, true)) {
    fwrite(STDERR, 'Cannot create '.dirname($target).".\n");
    exit(1);
}

if (! copy($source, $target)) {
    fwrite(STDERR, "Copying to {$target} failed.\n");
    exit(1);
}

fwrite(STDOUT, sprintf("Copied %s (%s KB) to %s\n", $source, number_format(filesize($target) / 1024), $target));
