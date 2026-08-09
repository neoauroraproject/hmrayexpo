#!/usr/bin/env bash
# HMRAY in-place updater — backup, rebuild from source, migrate, health.

set -euo pipefail

INSTALL_DIR="${HMRAY_INSTALL_DIR:-/opt/hmray}"
SRC_DIR="${HMRAY_SRC_DIR:-/opt/hmray/src}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_root() {
  [[ "${EUID:-$(id -u)}" -ne 0 ]] || return 0
  die "Run as root: sudo $0"
}

load_env() {
  [[ -f "$ENV_FILE" ]] || die "Missing ${ENV_FILE} — run install.sh first."
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

main() {
  require_root
  echo "=== HMRAY Update ==="

  [[ -f "$COMPOSE_FILE" ]] || die "Missing ${COMPOSE_FILE}"
  [[ -d "$SRC_DIR" ]] || die "Missing source at ${SRC_DIR}"

  load_env

  echo "Creating database backup..."
  bash "${INSTALL_DIR}/scripts/backup-db.sh"

  if [[ -f "${REPO_ROOT}/deploy/docker-compose/docker-compose.yml" ]]; then
    cp "${REPO_ROOT}/deploy/docker-compose/docker-compose.yml" "$COMPOSE_FILE"
  fi
  if [[ -f "${REPO_ROOT}/deploy/caddy/Caddyfile" ]]; then
    cp "${REPO_ROOT}/deploy/caddy/Caddyfile" "${INSTALL_DIR}/Caddyfile"
  fi
  cp "${REPO_ROOT}/deploy/scripts/healthcheck.sh" "${INSTALL_DIR}/scripts/healthcheck.sh"
  cp "${REPO_ROOT}/deploy/scripts/backup-db.sh" "${INSTALL_DIR}/scripts/backup-db.sh"
  chmod +x "${INSTALL_DIR}/scripts/"*.sh

  if [[ ! -e "${INSTALL_DIR}/src" ]]; then
    ln -sfn "$SRC_DIR" "${INSTALL_DIR}/src"
  fi

  echo "Building images from source..."
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build; then
    echo "Build failed — retrying with npmmirror..."
    NPM_REGISTRY=https://registry.npmmirror.com \
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
  fi

  echo "Recreating services..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

  echo "Running migrations..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api sh -c \
    'npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma'

  echo "Health check..."
  bash "${INSTALL_DIR}/scripts/healthcheck.sh"

  echo "Update complete."
}

main "$@"
