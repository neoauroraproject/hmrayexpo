#!/usr/bin/env bash
# HMRAY deploy helper scripts — stubs for production ops

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

case "${1:-help}" in
  backup)
    echo "Backup stub — postgres dump to backups/"
    ;;
  migrate)
    echo "Running prisma migrate…"
    cd "$ROOT_DIR" && pnpm db:migrate
    ;;
  health)
    curl -sf "${PUBLIC_URL:-http://localhost:4000}/health" || exit 1
    echo "API OK"
    ;;
  *)
    echo "Usage: $0 {backup|migrate|health}"
    exit 1
    ;;
esac
