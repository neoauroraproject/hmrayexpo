# MVP Acceptance — Phase 1

Manual / E2E checklist derived from the delivery plan (§16). Sign off when every item passes on a production-like stack (`docker compose up` or `/opt/hmray` install).

## Infrastructure & deploy

- [ ] `docker compose up` (or production install) brings all services healthy: postgres, redis, api, bot, worker, admin, caddy
- [ ] `deploy/scripts/healthcheck.sh` passes (API `/health` + container states)
- [ ] CI green on `main` (build + test jobs)
- [ ] Tagged release (`v*`) publishes `api`, `admin`, `bot`, `worker` images to GHCR
- [ ] `install.sh` wizard completes idempotently; re-run with existing `.env` offers reuse
- [ ] `update.sh` backs up DB, pulls new tag, migrates, and passes health checks
- [ ] Secrets (passwords, tokens) never appear in install logs

## Telegram bot — customer flow

- [ ] `/start` assigns Customer ID and shows main menu
- [ ] Channel membership gate works when configured
- [ ] Temu flow: multiple links/images in a row without “next product?” prompt
- [ ] Customer can remove an item from an open request
- [ ] Finalize produces `RQ-…` reference and “no payment yet” copy
- [ ] Bot token is masked in admin settings UI

## Admin — request & quote workspace

- [ ] Admin can open a request in the workspace
- [ ] Per-item pricing with OMR rate snapshot and notes
- [ ] Quote issuance sends Telegram notification + public link
- [ ] Test notification to admin Telegram chat succeeds

## Customer — quote acceptance

- [ ] Quote visible in Telegram and at `/q/…` (public token URL)
- [ ] Confirm requires checkbox(es) and inspection choice
- [ ] Expired quote cannot be confirmed

## Payments & orders

- [ ] Customer uploads payment receipt (bot or web handoff)
- [ ] Admin confirms payment → Order `HM-YYYY-…` with payment `CONFIRMED`
- [ ] Purchase path without confirmed payment is rejected by API
- [ ] Support can create manual Request and manual Payment (source recorded)
- [ ] Audit entries exist for rate changes, quotes, payments, manual orders

## Design & docs

- [ ] `docs/design-system.md` exists; admin and customer pages follow tokens / ui-ux-pro-max patterns
- [ ] `docs/domain.md` state machines match runtime behaviour

## Explicitly out of scope (Phase 2)

These must **not** block Phase 1 sign-off:

- Temu batch purchasing, full QC/return/refund, Iran shipping weight calc
- Broadcast campaigns, advanced analytics, site scrape
- Full DNS-ACME automation and automated DB rollback in installer
