#!/bin/sh
# Run inside the API container (WORKDIR may be /app/apps/api).
set -eu
cd /app

SCHEMA="packages/database/prisma/schema.prisma"

resolve_prisma() {
  if [ -x "node_modules/.bin/prisma" ]; then
    echo "node_modules/.bin/prisma"
    return 0
  fi
  if [ -x "packages/database/node_modules/.bin/prisma" ]; then
    echo "packages/database/node_modules/.bin/prisma"
    return 0
  fi
  # pnpm virtual store
  found="$(find node_modules -path '*/prisma/build/index.js' 2>/dev/null | head -n 1 || true)"
  if [ -n "$found" ]; then
    echo "node $found"
    return 0
  fi
  return 1
}

PRISMA_CMD="$(resolve_prisma)" || {
  echo "ERROR: prisma CLI not found in image" >&2
  exit 1
}

case "${1:-migrate}" in
  migrate)
    # shellcheck disable=SC2086
    $PRISMA_CMD migrate deploy --schema="$SCHEMA"
    ;;
  seed)
    if [ -x "node_modules/.bin/tsx" ]; then
      node_modules/.bin/tsx packages/database/prisma/seed.ts
    elif [ -x "packages/database/node_modules/.bin/tsx" ]; then
      packages/database/node_modules/.bin/tsx packages/database/prisma/seed.ts
    else
      node --import tsx packages/database/prisma/seed.ts
    fi
    ;;
  *)
    echo "Usage: $0 [migrate|seed]" >&2
    exit 1
    ;;
esac
