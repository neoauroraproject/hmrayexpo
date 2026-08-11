import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import {
  BroadcastStatus,
  PaymentStatus,
  RequestStatus,
  TicketStatus,
} from "@hmray/database";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { SettingsService } from "./settings.service";
import { SETTING_KEYS } from "./settings.constants";
import { FA } from "../../common/errors/messages";
import { toTelegramId } from "../../common/utils/identifiers";

@Controller("bot/admin")
@UseGuards(BotSecretGuard)
export class BotAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly config: AppConfigService,
  ) {}

  @Get("me")
  async me(@Query("telegramUserId") telegramUserId?: string) {
    if (!telegramUserId) {
      return { isAdmin: false };
    }
    const resolved = await this.resolveAdmin(telegramUserId);
    if (!resolved) {
      return { isAdmin: false };
    }
    return {
      isAdmin: true,
      role: resolved.role,
      displayName: resolved.displayName,
    };
  }

  @Get("summary")
  async summary(@Query("telegramUserId") telegramUserId?: string) {
    if (!telegramUserId) {
      throw new ForbiddenException(FA.AUTH_FORBIDDEN);
    }
    const admin = await this.resolveAdmin(telegramUserId);
    if (!admin) {
      throw new ForbiddenException(FA.AUTH_FORBIDDEN);
    }

    const [pendingRequests, pendingPayments, openTickets, draftBroadcasts] =
      await Promise.all([
        this.prisma.purchaseRequest.count({
          where: { status: RequestStatus.REQUESTED, submittedAt: { not: null } },
        }),
        this.prisma.payment.count({
          where: {
            status: { in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PENDING] },
          },
        }),
        this.prisma.supportTicket.count({
          where: { status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] } },
        }),
        this.prisma.broadcast.count({
          where: { status: BroadcastStatus.DRAFT },
        }),
      ]);

    const panelUrl = (
      this.config.adminPublicUrl ||
      this.config.publicUrl ||
      ""
    ).replace(/\/$/, "");

    return {
      pendingRequests,
      pendingPayments,
      openTickets,
      draftBroadcasts,
      panelUrl,
      links: {
        payments: `${panelUrl}/payments`,
        requests: `${panelUrl}/requests`,
        broadcasts: `${panelUrl}/broadcasts`,
      },
    };
  }

  private async resolveAdmin(telegramUserId: string): Promise<{
    role?: string;
    displayName?: string;
  } | null> {
    let asBigInt: bigint;
    try {
      asBigInt = toTelegramId(telegramUserId);
    } catch {
      return null;
    }

    const byUser = await this.prisma.adminUser.findFirst({
      where: { telegramUserId: asBigInt, isActive: true },
      select: { role: true, displayName: true },
    });
    if (byUser) {
      return { role: byUser.role, displayName: byUser.displayName };
    }

    const storedChatId = await this.settings.getRaw(SETTING_KEYS.ADMIN_TELEGRAM_CHAT_ID);
    const configured =
      (typeof storedChatId === "string" && storedChatId.trim()) ||
      this.config.adminTelegramChatId ||
      null;
    if (configured && configured === telegramUserId) {
      return { role: "ADMIN", displayName: "Admin" };
    }

    return null;
  }
}
