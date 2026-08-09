# HMRAY Delivery Phases

Map of what ships in each phase. Phase 1 (MVP OMS) is **deploy-complete** when [mvp-acceptance.md](./mvp-acceptance.md) is signed off.

## Phase 0 — Scaffold ✅

| Area | Delivered |
| --- | --- |
| Monorepo | pnpm + turbo, apps (`api`, `bot`, `admin`, `worker`), packages |
| Data | Prisma schema stub, migrations tooling |
| Dev UX | `.env.example`, local `docker compose`, CI build |
| Docs | Domain stub, phase placeholders |

## Phase 1 — MVP OMS ✅ (this release)

| Spec area | Phase 1 scope | Status |
| --- | --- | --- |
| § Request → Quote → Pay → Order | Core happy path, state machines, audit | Done |
| § Telegram bot | Customer menu, Temu intake, quote notify | Done |
| § Admin panel | Request workspace, pricing, quote composer, payments | Done |
| § Customer web | Public quote page, confirm + receipt handoff | Done |
| § Worker | Notifications queue, quote expiry jobs | Done |
| § Deploy | Dockerfiles, compose, Caddy TLS custom port, GHCR release | **Done** |
| § Installer | `install.sh` / `update.sh` / `uninstall.sh`, backup & health scripts | **Done** |
| § CI | Build, test (migrate), release on `v*` tags | **Done** |

### Phase 1 deploy artefacts

```
deploy/installer/install.sh      # Ubuntu wizard → /opt/hmray
deploy/installer/update.sh       # backup → pull → migrate → health
deploy/installer/uninstall.sh    # selective teardown
deploy/scripts/backup-db.sh
deploy/scripts/healthcheck.sh
deploy/docker-compose/docker-compose.yml   # production GHCR stack
deploy/caddy/Caddyfile           # TLS on PANEL_PORT
.github/workflows/release.yml    # push images on tag
```

## Phase 2 — Logistics & ops

| Spec area | Planned |
| --- | --- |
| Shipment tracking | Carrier statuses, customer notify |
| Returns / refunds | Partial flows beyond MVP audit stub |
| Broadcast | Template library, segmented sends |
| Analytics | Dashboards, export |
| Scrape | Best-effort product metadata |
| Installer polish | DNS pre-check, ACME DNS challenge, rollback automation |

## Phase 3 — Scale

| Area | Planned |
| --- | --- |
| Multi-origin catalog | Several Temu/store sources |
| Automation | Rules engine, auto-quote hints |
| Performance | Read replicas, cache tuning |

## How to use this doc

- **P1 done** = functional MVP **and** production install path works on Ubuntu with GHCR images.
- **P2** items may exist as schema fields or stubs; they must not block P1 acceptance.
- Do not edit the master plan file; track delivery status here and in `mvp-acceptance.md`.
