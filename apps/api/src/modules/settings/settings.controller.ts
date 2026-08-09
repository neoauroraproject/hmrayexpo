import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminRole, Currency, Prisma } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { JOB } from "../notifications/notifications.constants";
import { SettingsService } from "./settings.service";
import { EDITABLE_SETTING_KEYS } from "./settings.constants";
import { SetExchangeRateDto, TestNotificationDto, UpdateSettingsDto } from "./dto/settings.dto";

@Controller("admin/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async read() {
    const [values, rateHistory, rates] = await Promise.all([
      this.settings.listEditable(),
      this.prisma.exchangeRate.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { setByAdmin: { select: { id: true, displayName: true } } },
      }),
      this.settings.rateMap(),
    ]);

    const liveRates: Record<string, string> = {};
    for (const [currency, rate] of Object.entries(rates)) {
      liveRates[currency] = rate.toString();
    }

    return {
      values,
      editableKeys: EDITABLE_SETTING_KEYS,
      liveRates,
      rateHistory,
      // The bot token is never echoed back — only whether one is configured.
      telegram: {
        configured: this.config.telegramBotConfigured,
        adminChatId:
          (typeof values.adminTelegramChatId === "string"
            ? values.adminTelegramChatId
            : null) ?? this.config.adminTelegramChatId ?? null,
      },
    };
  }

  @Patch()
  async update(
    @Body() dto: UpdateSettingsDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const unknownKeys = Object.keys(dto.values).filter(
      (key) => !EDITABLE_SETTING_KEYS.includes(key),
    );
    if (unknownKeys.length > 0) {
      throw new BadRequestException(`Unknown setting key(s): ${unknownKeys.join(", ")}`);
    }

    const before = await this.settings.listEditable();
    for (const [key, value] of Object.entries(dto.values)) {
      await this.settings.set(key, value);
    }

    await this.audit.log({
      actorAdminId: admin.id,
      action: "settings.update",
      entityType: "Setting",
      oldValue: before,
      newValue: dto.values,
      context,
    });

    return { values: await this.settings.listEditable() };
  }

  @Post("exchange-rates")
  @Roles(AdminRole.ADMIN, AdminRole.FINANCE)
  async setExchangeRate(
    @Body() dto: SetExchangeRateDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const currency = dto.currency ?? Currency.OMR;
    let rate: Prisma.Decimal;
    try {
      rate = new Prisma.Decimal(dto.rateToToman);
    } catch {
      throw new BadRequestException("rateToToman must be a decimal number");
    }
    if (rate.lessThanOrEqualTo(0)) {
      throw new BadRequestException("rateToToman must be greater than zero");
    }

    const previous = await this.settings.latestRate(currency);
    const created = await this.prisma.exchangeRate.create({
      data: {
        currency,
        rateToToman: rate,
        setByAdminId: admin.id,
        note: dto.note ?? null,
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "settings.exchange_rate.set",
      entityType: "ExchangeRate",
      entityId: created.id,
      oldValue: { currency, rateToToman: previous?.toString() ?? null },
      newValue: { currency, rateToToman: rate.toString(), note: dto.note ?? null },
      context,
    });

    return created;
  }

  @Post("test-notification")
  async testNotification(
    @Body() dto: TestNotificationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    this.notifications.enqueue(JOB.TEST, {
      message: dto.message ?? "HMRAY notification pipeline test",
      requestedBy: admin.username,
      requestedAt: new Date().toISOString(),
    });
    return { queued: true };
  }
}
