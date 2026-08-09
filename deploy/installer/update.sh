#!/usr/bin/env bash
# HMRAY in-place updater — backup, pull, migrate, health, prune old images.

set -euo pipefail

INSTALL_DIR="${HMRAY_INSTALL_DIR:-/opt/hmray}"
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

  load_env
  PREVIOUS_TAG="${HMRAY_IMAGE_TAG:-latest}"

  read -r -p "New image tag [${PREVIOUS_TAG}]: " NEW_TAG
  NEW_TAG="${NEW_TAG:-$PREVIOUS_TAG}"

  if [[ -n "${GHCR_TOKEN:-}" ]]; then
    echo "${GHCR_TOKEN}" | docker login ghcr.io -u hmray-updater --password-stdin >/dev/null
  else
    read -r -s -p "GHCR pull token (Enter to skip): " token
    echo
    if [[ -n "$token" ]]; then
      echo "$token" | docker login ghcr.io -u hmray-updater --password-stdin >/dev/null
    fi
  fi

  echo "Creating database backup…"
  bash "${INSTALL_DIR}/scripts/backup-db.sh"

  # Refresh compose/caddy from repo if available
  if [[ -f "${REPO_ROOT}/deploy/docker-compose/docker-compose.yml" ]]; then
    cp "${REPO_ROOT}/deploy/docker-compose/docker-compose.yml" "$COMPOSE_FILE"
  fi
  if [[ -f "${REPO_ROOT}/deploy/caddy/Caddyfile" ]]; then
    cp "${REPO_ROOT}/deploy/caddy/Caddyfile" "${INSTALL_DIR}/Caddyfile"
  fi

  sed -i "s/^HMRAY_IMAGE_TAG=.*/HMRAY_IMAGE_TAG=${NEW_TAG}/" "$ENV_FILE"
  export HMRAY_IMAGE_TAG="$NEW_TAG"

  echo "Pulling images (tag: ${NEW_TAG})…"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

  echo "Recreating services…"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

  echo "Running migrations…"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api sh -c \
    'npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma'

  echo "Health check…"
  bash "${INSTALL_DIR}/scripts/healthcheck.sh"

  echo "Pruning old HMRAY images (keeping ${NEW_TAG} and ${PREVIOUS_TAG})…"
  PREFIX="${HMRAY_IMAGE_PREFIX:-}"
  if [[ -n "$PREFIX" ]]; then
    for svc in api admin bot worker; do
      docker images --format '{{.Repository}}:{{.Tag}}' "${PREFIX}/${svc}" 2>/dev/null | while read -r img; do
        tag="${img##*:}"
        [[ "$tag" == "$NEW_TAG" || "$tag" == "$PREVIOUS_TAG" || "$tag" == "latest" ]] && continue
        docker rmi "$img" 2>/dev/null || true
      done
    done
    docker image prune -f --filter "label=org.opencontainers.image.title=hmray" 2>/dev/null || docker image prune -f
  fi

  echo "Update complete. Active tag: ${NEW_TAG}"
}

main "$@"
