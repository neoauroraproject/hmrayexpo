#!/usr/bin/env bash
# HMRAY health check — API /health + container status.

set -euo pipefail

INSTALL_DIR="${HMRAY_INSTALL_DIR:-/opt/hmray}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"

die() {
  echo "FAIL: $*" >&2
  exit 1
}

main() {
  [[ -f "$COMPOSE_FILE" && -f "$ENV_FILE" ]] || die "HMRAY not installed at ${INSTALL_DIR}"

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  DOMAIN="${DOMAIN:-localhost}"
  PANEL_PORT="${PANEL_PORT:-8443}"
  HEALTH_URL="https://${DOMAIN}:${PANEL_PORT}/health"

  echo "── Container status ──"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

  echo
  echo "── Docker health states ──"
  unhealthy=0
  while IFS= read -r line; do
    name="${line%% *}"
    state="${line#* }"
    echo "  ${name}: ${state}"
    if [[ "$state" != "healthy" && "$state" != "running" && "$state" != "no-healthcheck" ]]; then
      unhealthy=$((unhealthy + 1))
    fi
  done < <(
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format '{{.Name}} {{.Health}}' 2>/dev/null \
      | sed 's/ $/ no-healthcheck/'
  )

  echo
  echo "── API health (via Caddy) ──"
  if curl -sfk --max-time 15 "$HEALTH_URL" >/dev/null; then
    echo "  OK  ${HEALTH_URL}"
  else
    echo "  Caddy probe failed — trying internal API…"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api sh -c \
      "node -e \"require('http').get('http://127.0.0.1:4000/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(d);process.exit(r.statusCode===200?0:1)})}).on('error',()=>process.exit(1))\"" \
      || die "API health check failed"
    echo "  OK  internal api:4000/health"
  fi

  [[ $unhealthy -eq 0 ]] || die "${unhealthy} container(s) not healthy"
  echo
  echo "All checks passed."
}

main "$@"
