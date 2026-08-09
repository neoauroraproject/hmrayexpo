import { InspectionType } from "@hmray/database";

/**
 * Internal keys are machine-written state (never editable through the settings
 * endpoint) and are hidden from `GET /api/admin/settings`.
 */
export const INTERNAL_KEY_PREFIX = "internal:";

export const SETTING_KEYS = {
  QUOTE_VALIDITY_DAYS: "quoteValidityDays",
  DEFAULT_INSPECTION_TYPE: "defaultInspectionType",
  TEMU_BATCH_TARGET_OMR: "temuBatchTargetOmr",
  BOT_MAINTENANCE_MODE: "botMaintenanceMode",
  ADMIN_TELEGRAM_CHAT_ID: "adminTelegramChatId",
  NOTIFICATION_PREFS: "notificationPrefs",
} as const;

/** Stored as internal so GET /settings never echoes the raw token. */
export const TELEGRAM_BOT_TOKEN_KEY = `${INTERNAL_KEY_PREFIX}telegramBotToken`;

export const EDITABLE_SETTING_KEYS: string[] = Object.values(SETTING_KEYS);

export function quoteAcceptanceKey(quoteId: string): string {
  return `${INTERNAL_KEY_PREFIX}quote-acceptance:${quoteId}`;
}

export const DEFAULTS = {
  quoteValidityDays: 3,
  defaultInspectionType: InspectionType.FULL_OPEN,
  temuBatchTargetOmr: 100,
  botMaintenanceMode: false,
} as const;
