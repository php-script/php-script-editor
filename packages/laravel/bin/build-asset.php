<?php

declare(strict_types=1);

/*
 * Copies the standalone <php-script-editor> build into resources/dist/: the entry module
 * php-script-editor.js plus the chunks/ and assets/ it loads on demand. Source maps are skipped.
 *
 *   php bin/build-asset.php            copy packages/editor/dist/standalone
 *   php bin/build-asset.php --build    run `pnpm --filter @php-script/editor build` first
 *   php bin/build-asset.php --from=/path/to/dist/standalone
 *
 * Only works inside the php-script-editor monorepo (or with --from).
 */

$options = getopt('', ['build', 'from:']);
$packageDir = dirname(__DIR__);
$monorepoRoot = dirname($packageDir, 2);
$source = rtrim(is_string($options['from'] ?? null)
    ? $options['from']
    : $monorepoRoot.'/packages/editor/dist/standalone', '/');
$target = $packageDir.'/resources/dist';

if (array_key_exists('build', $options)) {
    $command = 'pnpm --dir '.escapeshellarg($monorepoRoot).' --filter @php-script/editor build';
    fwrite(STDOUT, "> {$command}\n");
    passthru($command, $exitCode);

    if ($exitCode !== 0) {
        fwrite(STDERR, "Building the editor failed.\n");
        exit($exitCode);
    }
}

if (! is_file($source.'/php-script-editor.js')) {
    fwrite(STDERR, "Missing {$source}/php-script-editor.js.\nRun `pnpm --filter @php-script/editor build` in the monorepo root, or pass --build.\n");
    exit(1);
}

// Start clean: old hashed chunks would otherwise pile up.
if (is_dir($target)) {
    $existing = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($target, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );
    foreach ($existing as $file) {
        $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
    }
}

$bytes = 0;
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS));

foreach ($files as $file) {
    if ($file->isDir() || str_ends_with($file->getFilename(), '.map')) {
        continue;
    }

    $destination = $target.substr($file->getPathname(), strlen($source));

    if (! is_dir(dirname($destination)) && ! mkdir(dirname($destination), 0o755, true)) {
        fwrite(STDERR, 'Cannot create '.dirname($destination).".\n");
        exit(1);
    }

    if (! copy($file->getPathname(), $destination)) {
        fwrite(STDERR, "Copying to {$destination} failed.\n");
        exit(1);
    }

    $bytes += $file->getSize();
}

fwrite(STDOUT, sprintf("Copied %s (%s KB) to %s\n", $source, number_format($bytes / 1024), $target));
