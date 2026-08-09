#!/usr/bin/env bash
# PostgreSQL backup for HMRAY production stack.

set -euo pipefail

INSTALL_DIR="${HMRAY_INSTALL_DIR:-/opt/hmray}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"
BACKUP_DIR="${INSTALL_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/hmray_${TIMESTAMP}.sql.gz"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

main() {
  [[ -f "$COMPOSE_FILE" && -f "$ENV_FILE" ]] || die "HMRAY not installed at ${INSTALL_DIR}"

  mkdir -p "$BACKUP_DIR"

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  POSTGRES_USER="${POSTGRES_USER:-hmray}"
  POSTGRES_DB="${POSTGRES_DB:-hmray}"

  echo "Backing up ${POSTGRES_DB} → ${BACKUP_FILE}"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
    | gzip -9 > "$BACKUP_FILE"

  echo "Backup saved: ${BACKUP_FILE} ($(du -h "$BACKUP_FILE" | cut -f1))"
}

main "$@"
