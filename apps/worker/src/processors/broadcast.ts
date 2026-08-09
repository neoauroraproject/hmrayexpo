import { BroadcastStatus, prisma } from "@hmray/database";
import { createLogger } from "../logger.js";
import { sendTelegramMessage } from "../telegram.js";

const logger = createLogger("broadcast");

/**
 * Telegram allows roughly 30 messages/second to distinct chats; 40ms between
 * sends keeps a comfortable margin so a large broadcast is never throttled.
 */
const SEND_INTERVAL_MS = 40;

interface Recipient {
  userId: string;
  telegramUserId: string;
}

interface Tally {
  sent: number;
  failed: number;
  blocked: number;
}

/** 403 means the customer blocked the bot — not a delivery failure worth retrying. */
function isBlocked(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bot was blocked") ||
    lower.includes("user is deactivated") ||
    lower.includes("chat not found") ||
    lower.includes("forbidden")
  );
}

function parseRecipients(value: unknown): Recipient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = entry as Partial<Recipient>;
    return typeof row?.telegramUserId === "string" && typeof row?.userId === "string"
      ? [{ userId: row.userId, telegramUserId: row.telegramUserId }]
      : [];
  });
}

function composeText(payload: Record<string, unknown>): string {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const mediaUrl = typeof payload.mediaUrl === "string" ? payload.mediaUrl.trim() : "";
  return [title, body, mediaUrl].filter(Boolean).join("\n\n");
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Process-wide send budget. Chunks are processed concurrently, so pacing inside
 * a single chunk would not be enough to stay under Telegram's global ceiling.
 */
let nextSendAt = 0;

async function reserveSendSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSendAt);
  nextSendAt = slot + SEND_INTERVAL_MS;
  if (slot > now) {
    await sleep(slot - now);
  }
}

/**
 * Delivers one chunk of a broadcast. Every recipient is isolated so a single
 * blocked chat cannot fail — and therefore re-send — the whole chunk.
 */
export async function processBroadcastChunk(payload: Record<string, unknown>): Promise<void> {
  const broadcastId = typeof payload.broadcastId === "string" ? payload.broadcastId : null;
  const recipients = parseRecipients(payload.recipients);
  if (!broadcastId || recipients.length === 0) {
    logger.warn("Broadcast chunk with no broadcast id or recipients — skipping", {
      broadcastId,
      recipients: recipients.length,
    });
    return;
  }

  const text = composeText(payload);
  const tally: Tally = { sent: 0, failed: 0, blocked: 0 };

  for (const recipient of recipients) {
    await reserveSendSlot();
    try {
      await sendTelegramMessage(recipient.telegramUserId, text, {
        disableWebPagePreview: true,
      });
      tally.sent += 1;
    } catch (error) {
      const message = (error as Error).message;
      if (isBlocked(message)) {
        tally.blocked += 1;
      } else {
        tally.failed += 1;
        logger.warn("Broadcast delivery failed", { broadcastId, error: message });
      }
    }
  }

  const updated = await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      sentCount: { increment: tally.sent },
      failedCount: { increment: tally.failed },
      blockedCount: { increment: tally.blocked },
    },
  });

  const total = typeof payload.totalRecipients === "number" ? payload.totalRecipients : null;
  const processed = updated.sentCount + updated.failedCount + updated.blockedCount;
  if (total !== null && processed >= total) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status:
          updated.sentCount > 0 ? BroadcastStatus.COMPLETED : BroadcastStatus.FAILED,
        completedAt: new Date(),
      },
    });
  }

  logger.info("Broadcast chunk delivered", {
    broadcastId,
    chunkIndex: payload.chunkIndex,
    ...tally,
  });
}
