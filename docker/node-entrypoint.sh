#!/bin/sh
# Installs dependencies into the container's own node_modules volumes and builds the packages
# the playground imports, then runs the given command.
set -e
pnpm install --frozen-lockfile
pnpm build
exec "$@"
