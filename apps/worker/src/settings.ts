import { prisma } from "@hmray/database";
import { env } from "./queues.js";

/** Same setting key the API writes to (`SETTING_KEYS.ADMIN_TELEGRAM_CHAT_ID`). */
const ADMIN_CHAT_ID_KEY = "adminTelegramChatId";
const TELEGRAM_BOT_TOKEN_KEY = "internal:telegramBotToken";

/** Optional JSON array of `NotificationEvent` names the admin chat wants. Missing = send all. */
const ADMIN_NOTIFICATION_EVENTS_KEY = "adminNotificationEvents";

/** Settings override the env default so ops can move the group without a redeploy. */
export async function resolveAdminChatId(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: ADMIN_CHAT_ID_KEY } });
  const fromSettings = typeof setting?.value === "string" ? setting.value : null;
  return fromSettings ?? env.ADMIN_TELEGRAM_CHAT_ID ?? null;
}

export async function resolveTelegramBotToken(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: TELEGRAM_BOT_TOKEN_KEY } });
  const fromSettings = typeof setting?.value === "string" ? setting.value.trim() : "";
  return fromSettings || env.TELEGRAM_BOT_TOKEN || null;
}

/** `null` means "no preference configured" — caller should treat that as "send everything". */
export async function resolveAdminNotificationEvents(): Promise<string[] | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: ADMIN_NOTIFICATION_EVENTS_KEY },
  });
  if (!setting || !Array.isArray(setting.value)) {
    return null;
  }
  return setting.value.filter((entry): entry is string => typeof entry === "string");
}

export async function isAdminEventAllowed(event: string): Promise<boolean> {
  const allowed = await resolveAdminNotificationEvents();
  if (allowed === null) {
    return true;
  }
  return allowed.includes(event);
}
