import { Controller, Get, UseGuards } from "@nestjs/common";
import { mergeBotCopy, type BotCopyConfig } from "@hmray/shared";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { AppConfigService } from "../../common/config/app-config.service";
import { SettingsService } from "../settings/settings.service";
import { DEFAULTS, SETTING_KEYS, TELEGRAM_BOT_TOKEN_KEY } from "../settings/settings.constants";

@Controller("bot")
@UseGuards(BotSecretGuard)
export class BotRuntimeController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Bot polls this until a Telegram token is configured in Admin → Settings.
   * Token may live in DB (preferred after panel setup) or env (optional).
   */
  @Get("runtime-config")
  async runtimeConfig() {
    const [storedToken, storedChatId, botCopyRaw, maintenanceRaw] = await Promise.all([
      this.settings.getRaw(TELEGRAM_BOT_TOKEN_KEY),
      this.settings.getRaw(SETTING_KEYS.ADMIN_TELEGRAM_CHAT_ID),
      this.settings.getJson<Partial<BotCopyConfig>>(SETTING_KEYS.BOT_COPY),
      this.settings.getRaw(SETTING_KEYS.BOT_MAINTENANCE_MODE),
    ]);

    const telegramBotToken =
      (typeof storedToken === "string" && storedToken.trim()) ||
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      null;

    const adminTelegramChatId =
      (typeof storedChatId === "string" && storedChatId.trim()) ||
      this.config.adminTelegramChatId ||
      null;

    const botMaintenanceMode =
      typeof maintenanceRaw === "boolean"
        ? maintenanceRaw
        : DEFAULTS.botMaintenanceMode;

    return {
      telegramBotToken,
      adminTelegramChatId,
      webhookUrl: process.env.WEBHOOK_URL?.trim() || null,
      botMode: process.env.BOT_MODE?.trim() || "polling",
      botCopy: mergeBotCopy(botCopyRaw),
      botMaintenanceMode,
    };
  }
}
