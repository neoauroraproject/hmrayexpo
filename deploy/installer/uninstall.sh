#!/usr/bin/env bash
# HMRAY uninstaller — selective removal with optional backup.

set -euo pipefail

INSTALL_DIR="${HMRAY_INSTALL_DIR:-/opt/hmray}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_root() {
  [[ "${EUID:-$(id -u)}" -ne 0 ]] || return 0
  die "Run as root: sudo $0"
}

confirm() {
  local question="$1"
  read -r -p "${question} [y/N]: " answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

main() {
  require_root

  echo "=== HMRAY Uninstaller ==="
  echo "Install directory: ${INSTALL_DIR}"
  echo

  [[ -d "$INSTALL_DIR" ]] || die "Nothing to uninstall at ${INSTALL_DIR}"

  REMOVE_CONTAINERS=false
  REMOVE_VOLUMES=false
  REMOVE_CONFIG=false

  confirm "Stop and remove HMRAY containers?" && REMOVE_CONTAINERS=true
  confirm "Remove Docker volumes (postgres, redis, uploads — DATA LOSS)?" && REMOVE_VOLUMES=true
  confirm "Remove config (.env, Caddyfile, compose) from ${INSTALL_DIR}?" && REMOVE_CONFIG=true

  if confirm "Create a database backup before removal?"; then
    if [[ -x "${INSTALL_DIR}/scripts/backup-db.sh" ]]; then
      bash "${INSTALL_DIR}/scripts/backup-db.sh"
    else
      echo "backup-db.sh not found — skipping backup."
    fi
  fi

  if [[ "$REMOVE_CONTAINERS" == true && -f "$COMPOSE_FILE" && -f "$ENV_FILE" ]]; then
    echo "Stopping containers…"
    if [[ "$REMOVE_VOLUMES" == true ]]; then
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
    else
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    fi
  fi

  if [[ "$REMOVE_CONFIG" == true ]]; then
    echo "Removing configuration files…"
    rm -f "${INSTALL_DIR}/.env" "${INSTALL_DIR}/docker-compose.yml" "${INSTALL_DIR}/Caddyfile"
    rm -rf "${INSTALL_DIR}/scripts"
    rmdir "${INSTALL_DIR}/backups" 2>/dev/null || true
    rmdir "$INSTALL_DIR" 2>/dev/null || true
  fi

  if confirm "Prune unused HMRAY container images?"; then
    docker images --format '{{.Repository}}:{{.Tag}}' | grep -E 'ghcr\.io/.+/hmray/(api|admin|bot|worker)' | while read -r img; do
      docker rmi "$img" 2>/dev/null || true
    done
  fi

  echo "Uninstall finished."
}

main "$@"
