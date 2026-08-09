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

/**
 * Bot-specific environment loader. Reuses `@hmray/config` for the variables
 * shared with the rest of the monorepo (documented in the root
 * `.env.example`) and reads the handful of bot-only knobs directly, the same
 * way `AppConfigService` does on the API side.
 */
export function loadBotEnv(): BotEnv {
  const shared = tryLoadEnv();

  const telegramBotToken = shared?.TELEGRAM_BOT_TOKEN ?? raw("TELEGRAM_BOT_TOKEN");
  if (!telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to start the bot.");
  }

  const botInternalSecret = raw("BOT_INTERNAL_SECRET");
  if (!botInternalSecret) {
    throw new Error(
      "BOT_INTERNAL_SECRET is required — the API rejects every /api/bot/* call without it.",
    );
  }

  // `PUBLIC_URL` is documented in .env.example as "Base URL for API (used in
  // webhooks, links)" — the bot reuses it instead of inventing a new variable.
  const publicUrl = (shared?.PUBLIC_URL ?? raw("PUBLIC_URL") ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  const apiBaseUrl = (raw("API_BASE_URL") ?? `${publicUrl}/api`).replace(/\/$/, "");

  const webhookUrl = raw("WEBHOOK_URL");
  const requestedMode = raw("BOT_MODE")?.toLowerCase();
  const botMode: BotEnv["botMode"] = webhookUrl
    ? "webhook"
    : requestedMode === "webhook"
      ? "webhook"
      : "polling";

  return {
    nodeEnv: shared?.NODE_ENV ?? raw("NODE_ENV") ?? "development",
    telegramBotToken,
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
