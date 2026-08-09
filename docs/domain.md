# HMRAY Domain Model

Canonical TypeScript enums live in `packages/types/src/enums.ts`; the Prisma
schema in `packages/database/prisma/schema.prisma` mirrors them one-to-one.

## Core aggregates

- **User** — Telegram-linked customer, public code `HM-#####`
- **PurchaseRequest** — basket of items the customer wants, code `RQ-#####`
- **Quote** — admin pricing response with a frozen OMR rate, code `Q-#####`
- **Order** — accepted quote in fulfillment, code `HM-YYYY-#####`
- **Payment** — receipt/transfer awaiting confirmation, code `P-#####`
- **Shipment** — Oman → Iran → doorstep logistics
- **SupportTicket** — customer conversation, code `T-#####`

## Public code formats

| Entity   | Format          | Generator (`@hmray/shared`) |
| -------- | --------------- | --------------------------- |
| Customer | `HM-#####`      | `generateCustomerId()`      |
| Request  | `RQ-#####`      | `generateRequestId()`       |
| Quote    | `Q-#####`       | `generateQuoteId()`         |
| Order    | `HM-YYYY-#####` | `generateOrderId()`         |
| Payment  | `P-#####`       | `generatePaymentId()`       |
| Ticket   | `T-#####`       | `generateTicketId()`        |
| Product  | `TM-XXXX` / `EX-XXXX` | `generateProductCode()` |

## State machines

### Request

```
REQUESTED → UNDER_REVIEW → QUOTED
    │             │
    │             └──────→ CANCELLED
    └──→ EXPIRED / CANCELLED
```

A request stays open while quotes are issued; issuing a newer quote marks the
previous one `SUPERSEDED` rather than reopening the request.

### Quote

```
DRAFT → SENT → ACCEPTED  (creates the Order)
          │
          ├──→ EXPIRED     (past expiresAt, default quoteValidityDays = 3)
          └──→ SUPERSEDED  (a revised quote was sent for the same request)
```

`omrRate` and `rateSetAt` are frozen on the quote, so an FX change never
retroactively alters a quote the customer is looking at.

### Payment

```
PENDING → UNDER_REVIEW → CONFIRMED → REFUNDED
                │
                └──────→ REJECTED
```

`source` records where the payment was registered (`BOT`, `WEB`, `SUPPORT`,
`ADMIN`); `receivedByAdminId` and `confirmedByAdminId` keep the finance trail.

### Order

Happy path:

```
CONFIRMED → PAID → PURCHASING → PURCHASED → IN_TRANSIT_TO_OMAN
  → ARRIVED_OMAN → QUALITY_CHECK → READY_FOR_IRAN → SHIPPING_TO_IRAN
  → ARRIVED_IRAN → DOMESTIC_DELIVERY → DELIVERED
```

Exit paths, reachable from the states noted:

- `CANCELLED` — before `PURCHASED`
- `RETURN_REQUESTED → RETURN_PROCESSING → REFUND_PENDING → REFUNDED` — after `DELIVERED`

Every transition is appended to `OrderStatusHistory` with the acting admin.

### Return

```
RETURN_REQUESTED → ADMIN_REVIEW → RETURN_APPROVED → RETURN_TO_SELLER → REFUND
                        └──→ REJECTED
```

### Temu batch

```
OPEN → READY → PURCHASING → PURCHASED
  └──→ CANCELLED
```

A batch flips to `READY` when `currentOmr` reaches `targetOmr` (or the deadline
passes), which fires the `TEMU_BATCH_READY` notification.

### Shipment

```
PENDING → IN_TRANSIT → ARRIVED → DELIVERED
   └──→ CANCELLED
```

`TrackingEvent.leg` splits the journey into `SUPPLIER`, `INTERNATIONAL`, `IRAN`
and `DOMESTIC` segments, each with its own tracking number.

### Support ticket

```
OPEN → PENDING → RESOLVED → CLOSED
```

## Money

All amounts are `Decimal`, never `Float`. Toman columns use `(18,2)`; FX rates
and foreign-currency prices use `(18,4)` so OMR (3 decimals) and USDT fit
exactly. `ExchangeRate` is append-only — the newest row per currency is live,
and quotes/refunds snapshot the rate they used.
