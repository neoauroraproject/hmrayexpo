import { InspectionType } from "@hmray/database";

export const SETTING_KEYS = {
  QUOTE_VALIDITY_DAYS: "quoteValidityDays",
  DEFAULT_INSPECTION_TYPE: "defaultInspectionType",
  TEMU_BATCH_TARGET_OMR: "temuBatchTargetOmr",
  BOT_MAINTENANCE_MODE: "botMaintenanceMode",
  ADMIN_TELEGRAM_CHAT_ID: "adminTelegramChatId",
  NOTIFICATION_PREFS: "notificationPrefs",
} as const;

export const EDITABLE_SETTING_KEYS: string[] = Object.values(SETTING_KEYS);

/**
 * Internal keys are machine-written state (never editable through the settings
 * endpoint) and are hidden from `GET /api/admin/settings`.
 */
export const INTERNAL_KEY_PREFIX = "internal:";

export function quoteAcceptanceKey(quoteId: string): string {
  return `${INTERNAL_KEY_PREFIX}quote-acceptance:${quoteId}`;
}

export const DEFAULTS = {
  quoteValidityDays: 3,
  defaultInspectionType: InspectionType.FULL_OPEN,
  temuBatchTargetOmr: 100,
  botMaintenanceMode: false,
} as const;
