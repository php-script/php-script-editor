#!/bin/sh
# Laravel 13 + Filament 5 demo for packages/laravel and packages/filament, served on :8000.
#
# Idempotent, runs on every start of the compose `laravel` service:
# 1. Generates a fresh app into the named volume (/srv/laravel) once: composer create-project,
#    filament:install --panels, and both packages through composer path repositories (symlinked,
#    so changes in packages/ are live).
# 2. Copies demo/laravel-overlay over it (model, migration, seeder, Filament resource, Blade page,
#    Engine binding, auto-login), every start, so overlay edits apply on restart.
# 3. Publishes the editor module from the local build packages/editor/dist/standalone (never a CDN),
#    migrates, seeds and serves.
#
# Start over: docker compose rm -sf laravel && docker volume rm php-script-editor_demo-laravel-app
set -e

APP=/srv/laravel
OVERLAY=/app/demo/laravel-overlay
DIST=/app/packages/editor/dist/standalone/php-script-editor.js

set_env() { # KEY VALUE: replace or append a .env line
  if grep -q "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    printf '%s=%s\n' "$1" "$2" >>.env
  fi
}

path_repo() { # NAME DIR: composer path repository with a version, so ^0.1 constraints resolve
  composer config "repositories.$1" \
    "{\"type\":\"path\",\"url\":\"$2\",\"options\":{\"symlink\":true,\"versions\":{\"php-script/$1\":\"0.1.x-dev\"}}}"
}

if [ ! -f "$APP/artisan" ]; then
  echo "Generating the Laravel 13 + Filament 5 app in $APP ..."
  tmp="$APP.partial"
  rm -rf "$tmp"
  composer create-project laravel/laravel:^13.0 "$tmp" --no-interaction --no-progress --prefer-dist
  cd "$tmp"
  path_repo editor-laravel /app/packages/laravel
  path_repo editor-filament /app/packages/filament
  composer config minimum-stability dev
  composer config prefer-stable true
  composer require --no-interaction --no-progress --no-update 'php:^8.5'
  composer require --no-interaction --no-progress -W \
    'filament/filament:^5.0' 'php-script/php-script:^2.0' \
    'php-script/editor-laravel:^0.1' 'php-script/editor-filament:^0.1'
  php artisan filament:install --panels --no-interaction
  cd /
  [ ! -d "$APP" ] || rmdir "$APP" # empty leftover, e.g. a working_dir created by Docker
  mv "$tmp" "$APP"
fi

cd "$APP"
composer install --no-interaction --no-progress --quiet

echo "Applying $OVERLAY ..."
cp -R "$OVERLAY/." "$APP/"

[ -f .env ] || cp .env.example .env
set_env APP_NAME '"php-script editor demo"'
set_env APP_ENV local
set_env APP_DEBUG true
set_env APP_URL "${APP_URL:-http://localhost:8000}"
set_env DB_CONNECTION sqlite
set_env SESSION_DRIVER file
set_env CACHE_STORE file
set_env QUEUE_CONNECTION sync
set_env DEMO_AUTO_LOGIN "${DEMO_AUTO_LOGIN:-true}"
grep -q '^APP_KEY=base64' .env || php artisan key:generate --ansi
[ -f database/database.sqlite ] || touch database/database.sqlite

i=0
until [ -f "$DIST" ]; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then
    echo "Missing $DIST. Build it: docker compose up -d playground (or pnpm --filter @php-script/editor build)" >&2
    exit 1
  fi
  echo "Waiting for $DIST ..."
  sleep 5
done

# packages/editor dist -> packages/laravel/resources/dist -> public/vendor/php-script-editor.
php /app/packages/laravel/bin/build-asset.php
php artisan vendor:publish --tag=php-script-editor-assets --force --ansi
php artisan optimize:clear --ansi >/dev/null
# The seeder is idempotent (updateOrCreate / firstOrCreate): data survives restarts.
php artisan migrate --seed --force --ansi

exec php artisan serve --host=0.0.0.0 --port=8000 --no-reload
