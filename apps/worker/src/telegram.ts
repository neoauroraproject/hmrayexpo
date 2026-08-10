import { createLogger } from "./logger.js";
import { resolveTelegramBotToken } from "./settings.js";

const logger = createLogger("telegram");

const API_BASE = "https://api.telegram.org";
/** Telegram caption hard limit for sendPhoto. */
const CAPTION_MAX = 1024;

interface SendMessageResult {
  ok: boolean;
  description?: string;
  result?: { message_id: number };
}

export interface TelegramReplyMarkup {
  inline_keyboard: Array<
    Array<{ text: string; callback_data?: string; url?: string }>
  >;
}

function truncateCaption(text: string, max = CAPTION_MAX): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

/**
 * Thin wrapper over the raw Telegram Bot API (no grammy dependency needed for
 * a plain `sendMessage` / `sendPhoto`). Throws on failure so the caller's BullMQ job retries.
 */
export async function sendTelegramMessage(
  chatId: string | number | bigint,
  text: string,
  options?: { disableWebPagePreview?: boolean; replyMarkup?: TelegramReplyMarkup },
): Promise<number | null> {
  const token = await resolveTelegramBotToken();
  if (!token) {
    logger.warn("Telegram bot token not configured — skipping send", { chatId: String(chatId) });
    return null;
  }

  const url = `${API_BASE}/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: typeof chatId === "bigint" ? chatId.toString() : chatId,
      text,
      disable_web_page_preview: options?.disableWebPagePreview ?? false,
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  const data = (await response.json().catch(() => null)) as SendMessageResult | null;

  if (!response.ok || !data?.ok) {
    const description = data?.description ?? `HTTP ${response.status}`;
    throw new Error(`Telegram sendMessage failed for chat ${String(chatId)}: ${description}`);
  }

  return data.result?.message_id ?? null;
}

export async function sendTelegramPhoto(
  chatId: string | number | bigint,
  photoUrl: string,
  caption?: string,
  options?: { replyMarkup?: TelegramReplyMarkup },
): Promise<number | null> {
  const token = await resolveTelegramBotToken();
  if (!token) {
    logger.warn("Telegram bot token not configured — skipping photo send", {
      chatId: String(chatId),
    });
    return null;
  }

  const url = `${API_BASE}/bot${token}/sendPhoto`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: typeof chatId === "bigint" ? chatId.toString() : chatId,
      photo: photoUrl,
      ...(caption !== undefined && caption.length > 0
        ? { caption: truncateCaption(caption) }
        : {}),
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  const data = (await response.json().catch(() => null)) as SendMessageResult | null;

  if (!response.ok || !data?.ok) {
    const description = data?.description ?? `HTTP ${response.status}`;
    throw new Error(`Telegram sendPhoto failed for chat ${String(chatId)}: ${description}`);
  }

  return data.result?.message_id ?? null;
}
