import type { Job } from "bullmq";
import { prisma } from "@hmray/database";
import { formatToman } from "@hmray/shared";
import { JOB, env, type NotificationJob } from "../queues.js";
import { createLogger } from "../logger.js";
import { sendTelegramMessage } from "../telegram.js";
import { resolveAdminChatId, isAdminEventAllowed } from "../settings.js";
import { processBroadcastChunk } from "./broadcast.js";
import * as copy from "../copy.js";

const logger = createLogger("notifications");

type Target = "user" | "admin";

/** Handled `NotificationEvent` values — anything else falls back to `copy.generic`. */
const HANDLED_EVENTS = new Set([
  "NEW_REQUEST",
  "QUOTE_SENT",
  "QUOTE_EXPIRED",
  "PAYMENT_SUBMITTED",
  "PAYMENT_RECEIPT_UPLOADED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_REJECTED",
  "SUPPORT_MESSAGE",
  "NEW_ORDER",
]);

function adminUrl(path: string): string {
  return `${env.ADMIN_PUBLIC_URL.replace(/\/$/, "")}${path}`;
}

async function quoteLineItems(quoteId: unknown): Promise<copy.QuoteLineItem[]> {
  if (typeof quoteId !== "string") return [];
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { displayIndex: "asc" } } },
  });
  if (!quote) return [];
  return quote.items.map((item) => ({
    index: item.displayIndex,
    label: item.title ?? item.productCode,
    priceLabel: copy.formatAmount(Number(item.price) * item.quantity, item.currency),
  }));
}

async function buildText(
  event: string,
  payload: Record<string, unknown>,
  target: Target,
): Promise<string> {
  switch (event) {
    case "NEW_REQUEST":
      return copy.newRequestAdmin({
        requestCode: payload.requestCode,
        customerCode: payload.customerCode,
        itemCount: payload.itemCount,
        url: payload.url ?? adminUrl(`/requests/${payload.requestCode ?? ""}`),
      });

    case "QUOTE_SENT":
      return copy.quoteSentCustomer({
        quoteCode: payload.quoteCode,
        totalLabel: typeof payload.productsTotal !== "undefined"
          ? formatToman(Number(payload.productsTotal))
          : undefined,
        expiresAt: payload.expiresAt,
        url: payload.url,
        items: await quoteLineItems(payload.quoteId),
      });

    case "QUOTE_EXPIRED":
      return copy.quoteExpiredCustomer({ quoteCode: payload.quoteCode });

    case "PAYMENT_SUBMITTED":
      return copy.paymentSubmittedAdmin({
        paymentCode: payload.paymentCode,
        customerCode: payload.customerCode,
        amount: payload.amount,
        currency: payload.currency,
        url: adminUrl(`/payments/${payload.paymentCode ?? ""}`),
      });

    case "PAYMENT_RECEIPT_UPLOADED":
      return copy.paymentReceiptUploadedAdmin({
        paymentCode: payload.paymentCode,
        url: adminUrl(`/payments/${payload.paymentCode ?? ""}`),
      });

    case "PAYMENT_CONFIRMED":
      return copy.paymentConfirmedCustomer({ orderCode: payload.orderCode });

    case "PAYMENT_REJECTED":
      return copy.paymentRejectedCustomer({
        paymentCode: payload.paymentCode,
        reason: extractReason(payload.body),
      });

    case "SUPPORT_MESSAGE":
      return copy.supportMessage({ title: payload.title, body: payload.body });

    case "NEW_ORDER":
      return target === "admin"
        ? copy.newOrderAdmin({
            orderCode: payload.orderCode,
            customerCode: payload.customerCode,
            totalLabel: typeof payload.totalToman !== "undefined"
              ? formatToman(Number(payload.totalToman))
              : undefined,
            url: adminUrl(`/orders/${payload.orderCode ?? ""}`),
          })
        : copy.newOrderCustomer({
            orderCode: payload.orderCode,
            totalLabel: typeof payload.totalToman !== "undefined"
              ? formatToman(Number(payload.totalToman))
              : undefined,
          });

    default:
      return copy.generic({ title: payload.title, body: payload.body });
  }
}

/** `PAYMENT_REJECTED`'s body is already `دلیل: ...` from the API — strip the label back out. */
function extractReason(body: unknown): string | undefined {
  if (typeof body !== "string") return undefined;
  const match = body.match(/دلیل:\s*(.+)/);
  return match ? match[1] : body;
}

async function handleTelegramTarget(
  target: Target,
  payload: Record<string, unknown>,
): Promise<void> {
  const event = typeof payload.event === "string" ? payload.event : "UNKNOWN";

  let chatId: string | number | bigint | null;
  if (target === "admin") {
    if (!(await isAdminEventAllowed(event))) {
      logger.info("Admin notification skipped by preference", { event });
      return;
    }
    chatId = (payload.chatId as string | null | undefined) ?? (await resolveAdminChatId());
  } else {
    chatId = (payload.telegramUserId as string | null | undefined) ?? null;
  }

  if (!chatId) {
    logger.warn("No chat id resolved for notification — dropping", { event, target });
    return;
  }

  if (!HANDLED_EVENTS.has(event)) {
    logger.warn("Unhandled notification event — using generic fallback", { event, target });
  }

  const text = await buildText(event, payload, target);
  await sendTelegramMessage(chatId, text);
}

async function handleTest(payload: Record<string, unknown>): Promise<void> {
  const chatId = await resolveAdminChatId();
  if (!chatId) {
    logger.warn("No admin chat id configured — cannot deliver test notification");
    return;
  }
  await sendTelegramMessage(chatId, copy.testMessage(payload));
}

export async function processNotificationJob(job: Job<NotificationJob>): Promise<void> {
  const { type, payload } = job.data;

  switch (type) {
    case JOB.TELEGRAM_USER:
      await handleTelegramTarget("user", payload);
      return;
    case JOB.TELEGRAM_ADMIN:
      await handleTelegramTarget("admin", payload);
      return;
    case JOB.BROADCAST_SEND:
      await processBroadcastChunk(payload);
      return;
    case JOB.TEST:
      await handleTest(payload);
      return;
    default:
      logger.warn("Unknown job type on notifications queue — logging and skipping", {
        type,
        payload,
      });
  }
}
