import { Injectable, Logger } from "@nestjs/common";
import { tryLoadEnv, type Env } from "@hmray/config";

const FIVE_MB = 5 * 1024 * 1024;

/**
 * Wraps `@hmray/config`. When the environment is incomplete the API still boots
 * (useful for local work and for `nest build` smoke runs) but every missing
 * value falls back to an explicit, logged default.
 */
@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly env: Env | null;

  constructor() {
    this.env = tryLoadEnv();
    if (!this.env) {
      this.logger.warn(
        "Environment failed @hmray/config validation — falling back to process.env defaults.",
      );
    }
  }

  private raw(key: string): string | undefined {
    const value = process.env[key];
    return value && value.length > 0 ? value : undefined;
  }

  get nodeEnv(): string {
    return this.env?.NODE_ENV ?? this.raw("NODE_ENV") ?? "development";
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get port(): number {
    return this.env?.PORT ?? Number(this.raw("PORT") ?? 4000);
  }

  get jwtSecret(): string {
    return (
      this.env?.JWT_SECRET ??
      this.raw("JWT_SECRET") ??
      "hmray-insecure-development-secret-change-me"
    );
  }

  get jwtExpiresIn(): string {
    return this.env?.JWT_EXPIRES_IN ?? this.raw("JWT_EXPIRES_IN") ?? "7d";
  }

  get redisUrl(): string {
    return this.env?.REDIS_URL ?? this.raw("REDIS_URL") ?? "redis://localhost:6379";
  }

  get publicUrl(): string {
    return this.env?.PUBLIC_URL ?? this.raw("PUBLIC_URL") ?? "http://localhost:4000";
  }

  get adminPublicUrl(): string {
    return (
      this.env?.ADMIN_PUBLIC_URL ?? this.raw("ADMIN_PUBLIC_URL") ?? "http://localhost:3000"
    );
  }

  /** Base URL of the customer-facing site that renders the public quote page. */
  get quotePublicBaseUrl(): string {
    return this.raw("QUOTE_PUBLIC_BASE_URL") ?? this.publicUrl;
  }

  quoteUrl(publicToken: string): string {
    return `${this.quotePublicBaseUrl.replace(/\/$/, "")}/q/${publicToken}`;
  }

  orderTrackingUrl(code: string): string {
    return `${this.quotePublicBaseUrl.replace(/\/$/, "")}/orders/${code}`;
  }

  /** Shared secret the Telegram bot sends as `X-Bot-Secret`. */
  get botInternalSecret(): string | undefined {
    return this.raw("BOT_INTERNAL_SECRET");
  }

  /** The raw bot token is never returned by the API — only its presence. */
  get telegramBotConfigured(): boolean {
    return Boolean(this.env?.TELEGRAM_BOT_TOKEN ?? this.raw("TELEGRAM_BOT_TOKEN"));
  }

  get adminTelegramChatId(): string | undefined {
    return this.env?.ADMIN_TELEGRAM_CHAT_ID ?? this.raw("ADMIN_TELEGRAM_CHAT_ID");
  }

  get corsOrigins(): string[] {
    const configured = this.raw("CORS_ORIGINS");
    if (configured) {
      return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
    }
    return Array.from(
      new Set([this.adminPublicUrl, "http://localhost:3000", "http://127.0.0.1:3000"]),
    );
  }

  get uploadDir(): string {
    return this.raw("UPLOAD_DIR") ?? "./uploads";
  }

  get maxUploadBytes(): number {
    return Number(this.raw("MAX_UPLOAD_BYTES") ?? FIVE_MB);
  }
}
