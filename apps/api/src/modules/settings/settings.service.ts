import { Injectable } from "@nestjs/common";
import { Currency, InspectionType, Prisma } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { RateMap } from "../../common/utils/money";
import { DEFAULTS, INTERNAL_KEY_PREFIX, SETTING_KEYS } from "./settings.constants";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRaw(key: string): Promise<Prisma.JsonValue | undefined> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value;
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    const value = await this.getRaw(key);
    return value === undefined || value === null ? undefined : (value as T);
  }

  async set(key: string, value: unknown): Promise<void> {
    const json = value as Prisma.InputJsonValue;
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: json },
      create: { key, value: json },
    });
  }

  async listEditable(): Promise<Record<string, Prisma.JsonValue>> {
    const rows = await this.prisma.setting.findMany({ orderBy: { key: "asc" } });
    const out: Record<string, Prisma.JsonValue> = {};
    for (const row of rows) {
      if (!row.key.startsWith(INTERNAL_KEY_PREFIX)) {
        out[row.key] = row.value;
      }
    }
    return out;
  }

  async quoteValidityDays(): Promise<number> {
    const value = await this.getRaw(SETTING_KEYS.QUOTE_VALIDITY_DAYS);
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULTS.quoteValidityDays;
  }

  async defaultInspectionType(): Promise<InspectionType> {
    const value = await this.getRaw(SETTING_KEYS.DEFAULT_INSPECTION_TYPE);
    if (typeof value === "string" && value in InspectionType) {
      return value as InspectionType;
    }
    return DEFAULTS.defaultInspectionType;
  }

  quoteExpiryFrom(days: number, from: Date = new Date()): Date {
    const expires = new Date(from);
    expires.setDate(expires.getDate() + days);
    return expires;
  }

  /** Newest `ExchangeRate` row for a currency — the live rate. */
  async latestRate(currency: Currency): Promise<Prisma.Decimal | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { currency },
      orderBy: { createdAt: "desc" },
    });
    return row?.rateToToman ?? null;
  }

  /** Live rate for every non-Toman currency, for quote/total maths. */
  async rateMap(): Promise<RateMap> {
    const rows = await this.prisma.exchangeRate.findMany({
      orderBy: { createdAt: "desc" },
    });
    const map: RateMap = {};
    for (const row of rows) {
      if (!map[row.currency]) {
        map[row.currency] = row.rateToToman;
      }
    }
    return map;
  }
}
