# @hmray/api

NestJS domain API for HMRAY OMS (Phase 1). Everything is served under the global
prefix `/api`, except `/uploads/*` (static files) and `/health` (container probe,
an alias of `/api/health`).

## The one rule everything else protects

```
Request → Quote → Customer Confirm → Payment → Admin Confirm → Order → Purchase
```

- An `Order` can **only** be created from a `Quote` (`OrdersService.createFromQuote`
  is the single writer). There is no code path from a request to a purchase.
- A quote must be `ACCEPTED` by the customer before a payment can be filed
  against it, and before a confirmed payment will produce an order.
- Moving an order to `PURCHASING`/`PURCHASED` requires a `CONFIRMED` payment on
  that order (or on its quote). The only bypass is `force: true`, which needs the
  `orders.force_purchase` permission and writes `order.force_purchase` to the
  audit log plus a `FORCED ...` note on the status history. A blocked attempt is
  audited too (`order.purchase.blocked`).
- Order and request status changes are validated against the state machines in
  `src/common/state/`, which mirror `docs/domain.md`.

## Auth

| Surface | Mechanism |
| --- | --- |
| `/api/admin/*` | `Authorization: Bearer <JWT>` from `POST /api/auth/login` (bcryptjs, same hashes the seed writes) |
| `/api/bot/*` | `X-Bot-Secret: $BOT_INTERNAL_SECRET` header |
| `/api/public/*` | Unauthenticated; quotes are reached through an unguessable `publicToken` |

`RolesGuard` reads `@Roles(...)`; `OWNER` passes every role check. `PermissionsGuard`
reads `@RequirePermission(...)` and checks the `RolePermission` table — an empty
table means only `OWNER` holds the permission. Two permissions exist today:

| Permission | Gate |
| --- | --- |
| `orders.manual_create` | `POST /api/admin/orders/manual` (route guard) |
| `orders.force_purchase` | `force: true` on an order status change (service check) |

Grant them to `ADMIN`/`FINANCE` by inserting `RolePermission` rows if you want
anyone other than the owner to use those paths.

## Endpoints

### Auth

| Method | Path |
| --- | --- |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |

### Health

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| GET | `/health` (same handler, for Docker) |

### Bot (`X-Bot-Secret`)

| Method | Path |
| --- | --- |
| POST | `/api/bot/users/upsert` |
| POST | `/api/bot/requests` |
| GET | `/api/bot/requests/mine?telegramUserId=` |
| POST | `/api/bot/requests/:id/items` |
| DELETE | `/api/bot/requests/:id/items/:itemId?telegramUserId=` |
| POST | `/api/bot/requests/:id/finalize` |
| POST | `/api/bot/payments/:id/receipt` (multipart `receipt`) |
| GET | `/api/bot/addresses?telegramUserId=` |
| POST | `/api/bot/addresses` |
| PATCH | `/api/bot/addresses/:id` |
| DELETE | `/api/bot/addresses/:id?telegramUserId=` |
| POST | `/api/bot/tickets` |
| GET | `/api/bot/tickets/mine?telegramUserId=` |
| POST | `/api/bot/tickets/:id/messages` |
| POST | `/api/bot/uploads` (multipart `file`) |

### Public

| Method | Path |
| --- | --- |
| GET | `/api/public/channels/required` |
| GET | `/api/public/payment-methods` |
| GET | `/api/public/quotes/:codeOrToken` |
| POST | `/api/public/quotes/:codeOrToken/confirm` |
| POST | `/api/public/quotes/:codeOrToken/payments` (multipart `receipt` optional) |
| GET | `/api/public/orders/:code` |

### Admin (JWT)

| Method | Path |
| --- | --- |
| GET | `/api/admin/customers` |
| GET | `/api/admin/customers/:id` (id or `HM-#####`) |
| POST | `/api/admin/customers/:id/notes` |
| GET/POST | `/api/admin/channels` |
| PATCH/DELETE | `/api/admin/channels/:id` |
| GET/POST | `/api/admin/payment-methods` |
| PATCH/DELETE | `/api/admin/payment-methods/:id` (DELETE disables) |
| GET | `/api/admin/requests` |
| POST | `/api/admin/requests` (support path; `createdByAdminId` recorded) |
| GET | `/api/admin/requests/:id` (workspace payload) |
| PATCH | `/api/admin/requests/:id/status` |
| PATCH | `/api/admin/requests/:id/items/:itemId/price` |
| POST | `/api/admin/requests/:id/messages` |
| POST | `/api/admin/requests/:id/quotes` (create/update the DRAFT quote) |
| GET | `/api/admin/quotes/:id` |
| POST | `/api/admin/quotes/:id/notes` |
| POST | `/api/admin/quotes/:id/issue` |
| GET | `/api/admin/payments` |
| POST | `/api/admin/payments` (manual, source `SUPPORT`/`ADMIN`) |
| POST | `/api/admin/payments/:id/confirm` |
| POST | `/api/admin/payments/:id/reject` |
| GET | `/api/admin/orders` |
| POST | `/api/admin/orders/manual` |
| GET | `/api/admin/orders/:id` |
| PATCH | `/api/admin/orders/:id/status` |
| GET/POST | `/api/admin/tickets` |
| GET | `/api/admin/tickets/:id` |
| POST | `/api/admin/tickets/:id/messages` |
| PATCH | `/api/admin/tickets/:id/status` |
| GET | `/api/admin/search?q=` |
| GET | `/api/admin/dashboard/stats` |
| GET | `/api/admin/audit-logs` |
| GET | `/api/admin/settings` |
| PATCH | `/api/admin/settings` |
| POST | `/api/admin/settings/exchange-rates` |
| POST | `/api/admin/settings/test-notification` |
| POST | `/api/admin/uploads` (multipart `file`) |

Most `:id` params accept either the internal cuid or the public code
(`RQ-#####`, `Q-#####`, `P-#####`, `HM-YYYY-#####`, `T-#####`, `HM-#####`).

## Notes on a few decisions

**Draft requests.** `RequestStatus` has no `DRAFT`, so an open basket is
`REQUESTED` with `submittedAt = null`. `finalize` stamps `submittedAt` and fires
`NEW_REQUEST`.

**Quote acceptance.** Accepting a quote does not create an order, so the chosen
`inspectionType` has nowhere to live in the schema yet. It is stored in the
`Setting` key/value table under `internal:quote-acceptance:<quoteId>` and read
back when the order is finally created. Keys prefixed `internal:` are hidden
from `GET /api/admin/settings` and rejected by `PATCH`.

**Money.** All arithmetic uses `Prisma.Decimal`. `omrRate` is snapshotted onto
the quote at draft time, so later FX changes never move a price the customer is
looking at. Toman values are rounded to 2 decimal places.

**Enums.** Runtime enum values come from `@hmray/database` (Prisma). TypeScript
string enums are not assignable to Prisma's string-literal unions, so importing
from one place avoids a pile of casts. `@hmray/types` mirrors the same members
for cross-package DTOs.

**Serialization.** `BigInt.prototype.toJSON` is patched in `main.ts`, and
Telegram id columns are additionally normalized to strings in service responses.

## Notifications

Producers only. Jobs are pushed to the BullMQ queue `hmray-notifications` with
the shape `{ type, payload }`, where `type` is one of `telegram.user`,
`telegram.admin`, or `test`. Enqueueing is fire-and-forget so an unreachable
Redis cannot block a checkout; the durable record is the `Notification` row.
`apps/worker` consumes the queue.

## Uploads

Stored on disk under `UPLOAD_DIR` (default `./uploads`) in `receipts/`, `items/`
and `admin/` subdirectories, served read-only at `/uploads/*`. Only `image/*` is
accepted, max 5 MB, and filenames are rebuilt as
`<timestamp>-<random>-<sanitized>.<ext>` so nothing can escape the directory.

## Environment

Validated by `@hmray/config`; if validation fails the API still boots on logged
defaults. Beyond the shared variables:

| Variable | Purpose |
| --- | --- |
| `BOT_INTERNAL_SECRET` | Required for `/api/bot/*`. Unset ⇒ every bot route returns 401. |
| `QUOTE_PUBLIC_BASE_URL` | Base for customer quote links (`<base>/quote/<token>`). Defaults to `PUBLIC_URL`. |
| `CORS_ORIGINS` | Comma-separated allowlist. Defaults to `ADMIN_PUBLIC_URL` + `localhost:3000`. |
| `UPLOAD_DIR` | Upload root. Default `./uploads`. |
| `MAX_UPLOAD_BYTES` | Default 5 MB. |

`TELEGRAM_BOT_TOKEN` is never returned by the API — `GET /api/admin/settings`
only reports `telegram.configured`.

## Scripts

```bash
pnpm --filter @hmray/api dev     # watch mode
pnpm --filter @hmray/api build   # nest build
pnpm --filter @hmray/api lint    # tsc --noEmit
```
