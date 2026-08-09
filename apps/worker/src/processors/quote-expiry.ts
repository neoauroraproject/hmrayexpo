import { prisma, QuoteStatus, RequestStatus, NotificationEvent } from "@hmray/database";
import { JOB, notificationsQueue } from "../queues.js";
import { createLogger } from "../logger.js";

const logger = createLogger("quote-expiry");

const FA_TITLE = (code: string) => `پیش‌فاکتور ${code} منقضی شد`;
const FA_BODY = "مهلت این پیش‌فاکتور به پایان رسیده است. لطفاً درخواست جدید ثبت کنید.";

/** Statuses that still count as "the request has a live quote". */
const ACTIVE_QUOTE_STATUSES: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.ACCEPTED];

/**
 * Runs every minute (see `queues.ts#scheduleQuoteExpirySweep`). Flips overdue
 * `SENT` quotes to `EXPIRED`, cascades the parent request when it has no other
 * live quote, persists the customer notification, and hands delivery off to
 * the notifications queue so Telegram sending goes through the normal retrying path.
 */
export async function runQuoteExpirySweep(): Promise<{ expired: number }> {
  const due = await prisma.quote.findMany({
    where: { status: QuoteStatus.SENT, expiresAt: { lt: new Date() } },
    select: { id: true, code: true, userId: true, requestId: true },
  });

  if (due.length === 0) {
    return { expired: 0 };
  }

  logger.info(`Found ${due.length} overdue quote(s) to expire`);

  for (const quote of due) {
    await expireOne(quote);
  }

  return { expired: due.length };
}

async function expireOne(quote: { id: string; code: string; userId: string; requestId: string }): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.quote.updateMany({
        where: { id: quote.id, status: QuoteStatus.SENT },
        data: { status: QuoteStatus.EXPIRED },
      });
      if (updated.count === 0) {
        // Already handled by a concurrent worker or the API's lazy `expireIfDue`.
        return;
      }

      const request = await tx.purchaseRequest.findUnique({
        where: { id: quote.requestId },
        select: { id: true, status: true },
      });

      if (request?.status === RequestStatus.QUOTED) {
        const otherActiveQuote = await tx.quote.findFirst({
          where: {
            requestId: quote.requestId,
            id: { not: quote.id },
            status: { in: ACTIVE_QUOTE_STATUSES },
          },
          select: { id: true },
        });
        if (!otherActiveQuote) {
          await tx.purchaseRequest.update({
            where: { id: quote.requestId },
            data: { status: RequestStatus.EXPIRED, closedAt: new Date() },
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: quote.userId,
          event: NotificationEvent.QUOTE_EXPIRED,
          title: FA_TITLE(quote.code),
          body: FA_BODY,
          meta: { quoteId: quote.id, quoteCode: quote.code },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "quote.auto_expired",
          entityType: "Quote",
          entityId: quote.id,
          newValue: { status: QuoteStatus.EXPIRED, quoteCode: quote.code },
        },
      });
    });

    const telegram = await prisma.telegramAccount.findUnique({
      where: { userId: quote.userId },
      select: { telegramUserId: true },
    });

    await notificationsQueue.add(
      JOB.TELEGRAM_USER,
      {
        type: JOB.TELEGRAM_USER,
        payload: {
          event: NotificationEvent.QUOTE_EXPIRED,
          userId: quote.userId,
          telegramUserId: telegram?.telegramUserId?.toString() ?? null,
          title: FA_TITLE(quote.code),
          body: FA_BODY,
          quoteId: quote.id,
          quoteCode: quote.code,
        },
      },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000,
      },
    );

    logger.info("Quote expired", { quoteId: quote.id, quoteCode: quote.code });
  } catch (error) {
    logger.error(`Failed to expire quote ${quote.code}: ${(error as Error).message}`, {
      quoteId: quote.id,
    });
    throw error;
  }
}
