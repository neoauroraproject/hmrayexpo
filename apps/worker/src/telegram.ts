import { createLogger } from "./logger.js";
import { resolveTelegramBotToken } from "./settings.js";

const logger = createLogger("telegram");

const API_BASE = "https://api.telegram.org";

interface SendMessageResult {
  ok: boolean;
  description?: string;
  result?: { message_id: number };
}

/**
 * Thin wrapper over the raw Telegram Bot API (no grammy dependency needed for
 * a plain `sendMessage`). Throws on failure so the caller's BullMQ job retries.
 */
export async function sendTelegramMessage(
  chatId: string | number | bigint,
  text: string,
  options?: { disableWebPagePreview?: boolean },
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
    }),
  });

  const data = (await response.json().catch(() => null)) as SendMessageResult | null;

  if (!response.ok || !data?.ok) {
    const description = data?.description ?? `HTTP ${response.status}`;
    throw new Error(`Telegram sendMessage failed for chat ${String(chatId)}: ${description}`);
  }

  return data.result?.message_id ?? null;
}
