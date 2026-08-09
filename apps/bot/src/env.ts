import { tryLoadEnv } from "@hmray/config";

export interface BotEnv {
  nodeEnv: string;
  telegramBotToken: string;
  adminTelegramChatId?: string;
  redisUrl?: string;
  /** Base URL of the API, including the `/api` prefix. */
  apiBaseUrl: string;
  botInternalSecret: string;
  botMode: "polling" | "webhook";
  webhookUrl?: string;
  webhookPort: number;
  webhookSecretToken?: string;
}

function raw(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export function loadBotEnvBase(): Omit<BotEnv, "telegramBotToken" | "adminTelegramChatId"> & {
  telegramBotToken?: string;
  adminTelegramChatId?: string;
} {
  const shared = tryLoadEnv();

  const botInternalSecret = raw("BOT_INTERNAL_SECRET");
  if (!botInternalSecret) {
    throw new Error(
      "BOT_INTERNAL_SECRET is required — the API rejects every /api/bot/* call without it.",
    );
  }

  const publicUrl = (shared?.PUBLIC_URL ?? raw("PUBLIC_URL") ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  const apiBaseUrl = (raw("API_BASE_URL") ?? `${publicUrl}/api`).replace(/\/$/, "");

  const webhookUrl = raw("WEBHOOK_URL");
  const requestedMode = raw("BOT_MODE")?.toLowerCase();
  const botMode: BotEnv["botMode"] =
    webhookUrl && requestedMode !== "polling"
      ? "webhook"
      : requestedMode === "webhook" && webhookUrl
        ? "webhook"
        : "polling";

  return {
    nodeEnv: shared?.NODE_ENV ?? raw("NODE_ENV") ?? "development",
    telegramBotToken: shared?.TELEGRAM_BOT_TOKEN || raw("TELEGRAM_BOT_TOKEN"),
    adminTelegramChatId: shared?.ADMIN_TELEGRAM_CHAT_ID ?? raw("ADMIN_TELEGRAM_CHAT_ID"),
    redisUrl: shared?.REDIS_URL ?? raw("REDIS_URL"),
    apiBaseUrl,
    botInternalSecret,
    botMode,
    webhookUrl,
    webhookPort: Number(raw("BOT_WEBHOOK_PORT") ?? 8088),
    webhookSecretToken: raw("BOT_WEBHOOK_SECRET"),
  };
}

export async function resolveBotEnv(): Promise<BotEnv> {
  const base = loadBotEnvBase();

  if (base.telegramBotToken) {
    return base as BotEnv;
  }

  // Wait until Admin Panel → Settings provides a token.
  const pollMs = 10_000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(
      "[hmray-bot] Waiting for Telegram bot token (set it in Admin Panel → Settings)...",
    );
    try {
      const res = await fetch(`${base.apiBaseUrl}/bot/runtime-config`, {
        headers: { "X-Bot-Secret": base.botInternalSecret },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          telegramBotToken?: string | null;
          adminTelegramChatId?: string | null;
          botMode?: string;
          webhookUrl?: string | null;
        };
        if (data.telegramBotToken) {
          return {
            ...base,
            telegramBotToken: data.telegramBotToken,
            adminTelegramChatId: data.adminTelegramChatId ?? base.adminTelegramChatId,
            botMode:
              data.botMode === "webhook" && data.webhookUrl
                ? "webhook"
                : "polling",
            webhookUrl: data.webhookUrl ?? base.webhookUrl,
          };
        }
      }
    } catch (err) {
      console.warn("[hmray-bot] runtime-config poll failed:", err);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
