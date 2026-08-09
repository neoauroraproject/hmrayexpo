# HMRAY Shopping Platform

پلتفرم خرید و مدیریت سفارش (OMS) — مونورепو با NestJS، Next.js، grammY و BullMQ.

---

## Quick start — local development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (optional, for full stack)

### Setup

```bash
pnpm install
cp .env.example .env
# Edit TELEGRAM_BOT_TOKEN, JWT_SECRET, ADMIN_PASSWORD, etc.

pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| App    | URL                          |
|--------|------------------------------|
| API    | http://localhost:4000/health |
| Admin  | http://localhost:3000        |
| Bot    | Telegram (long polling)      |
| Worker | Redis queue consumer         |

### Docker Compose (development)

Builds images from source and exposes dev ports:

```bash
cp .env.example .env
docker compose up -d --build
```

| Service  | Port (default) |
|----------|----------------|
| API      | 4000           |
| Admin    | 3000           |
| Caddy    | 8080 (set `PANEL_PORT`) |
| Postgres | 5432           |
| Redis    | 6379           |

Run migrations and seed inside the API container:

```bash
docker compose exec api npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma
docker compose exec api node --import tsx /app/packages/database/prisma/seed.ts
```

---

## Production install (Ubuntu) — one line + menu

```bash
curl -fsSL https://raw.githubusercontent.com/neoauroraproject/hmrayexpo/main/install \
  -o /tmp/hmray-setup && sudo bash /tmp/hmray-setup
```

English menu:

```text
1) Install / Reinstall
2) Update
3) Health check
4) Backup database
5) Uninstall
0) Exit
```

Installer asks only **4 questions**: Domain, Port, Admin username, Admin password.  
Telegram Bot Token + Admin Chat ID → set later in **Admin Panel → Settings**.

Images are pulled from **GitHub Container Registry** (`ghcr.io/neoauroraproject/hmrayexpo/*:latest`).
Every push to `main` publishes fresh images via GitHub Actions.

If GHCR is unreachable, the installer falls back to a local source build.

After first install:

```bash
sudo hmray
```

### Requirements

- Ubuntu 22.04+ with root/sudo
- DNS A/AAAA pointing your domain to the server
- Open panel port (default **8443**)

### Publish images (maintainers)

Push a version tag; [`.github/workflows/release.yml`](.github/workflows/release.yml) builds and pushes:

```
ghcr.io/neoauroraproject/hmrayexpo/api:<tag>
ghcr.io/neoauroraproject/hmrayexpo/admin:<tag>
ghcr.io/neoauroraproject/hmrayexpo/bot:<tag>
ghcr.io/neoauroraproject/hmrayexpo/worker:<tag>
```

### Installer prompts

| Input | Default |
| --- | --- |
| Domain | — |
| Panel TLS port | `8443` |
| Admin username / password | `owner` / (required) |
| Telegram bot token | — |
| Admin Telegram chat ID | — |
| Timezone | `Asia/Tehran` |
| PostgreSQL password | — |
| GHCR image prefix | `ghcr.io/neoauroraproject/hmrayexpo` |
| Image tag | `latest` |
| GHCR pull token | optional (private packages) |

The installer:

1. Installs Docker + Compose plugin if missing
2. Writes `/opt/hmray/.env` (passwords are never logged)
3. Copies `docker-compose.yml` + `Caddyfile`
4. Pulls images and starts the stack
5. Runs `prisma migrate deploy` and seed
6. Runs health checks

On success you get:

```
https://<DOMAIN>:<PANEL_PORT>
```

If `.env` already exists, the installer asks whether to **reuse** or regenerate it (idempotent re-runs).

### Operations

```bash
sudo hmray              # منوی اصلی
sudo hmray update       # آپدیت مستقیم
sudo hmray health       # سلامت
sudo hmray backup       # بکاپ
sudo hmray uninstall    # حذف
```

Or via scripts under `/opt/hmray/scripts/`.

See also [docs/mvp-acceptance.md](docs/mvp-acceptance.md) and [docs/phases.md](docs/phases.md).

---

## Monorepo structure

```
apps/
  api/      NestJS REST API
  bot/      Telegram bot (grammY)
  admin/    Next.js admin panel (RTL/fa)
  worker/   BullMQ background jobs
packages/
  database/ Prisma ORM
  types/    Shared enums & DTOs
  config/   Zod env validation
  shared/   ID generators, money helpers
deploy/     Production configs, Caddy, installer scripts
docker/     Dockerfiles per service
docs/       Domain, phases, acceptance checklists
```

---

## Scripts

| Command            | Description              |
|--------------------|--------------------------|
| `pnpm build`       | Build all packages/apps  |
| `pnpm dev`         | Start dev servers        |
| `pnpm lint`        | Type-check / lint        |
| `pnpm db:generate` | Prisma client generate   |
| `pnpm db:migrate`  | Run migrations (dev)     |
| `pnpm db:seed`     | Seed owner admin + defaults |

---

## License

Private — HMRAY © 2026
