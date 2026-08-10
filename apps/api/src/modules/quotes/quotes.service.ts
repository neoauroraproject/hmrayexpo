import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Currency,
  InspectionType,
  NotificationEvent,
  Prisma,
  Quote,
  QuoteStatus,
  RequestItemStatus,
  RequestStatus,
} from "@hmray/database";
import { formatToman, generateQuoteId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { FA } from "../../common/errors/messages";
import { publicToken, toTelegramId, uniqueCode } from "../../common/utils/identifiers";
import { lineTotalToman, sumDecimals, type RateMap } from "../../common/utils/money";
import { SettingsService } from "../settings/settings.service";
import { quoteAcceptanceKey } from "../settings/settings.constants";
import { NotificationsService } from "../notifications/notifications.service";
import type { ConfirmQuoteDto, CreateQuoteNoteDto, UpsertQuoteDto } from "./dto/quote.dto";

export interface QuoteAcceptance {
  inspectionType: InspectionType;
  acceptedNoteIds: string[];
  acceptedAt: string;
  ip: string | null;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  // ─── Admin ──────────────────────────────────────────────────

  /**
   * Creates the request's DRAFT quote, or rewrites the existing one. The OMR
   * rate is snapshotted here so a later FX change cannot move a price the
   * customer is already looking at.
   */
  async upsertDraft(requestId: string, dto: UpsertQuoteDto, adminId: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { OR: [{ id: requestId }, { code: requestId }] },
      include: {
        items: {
          where: { status: { not: RequestItemStatus.REMOVED } },
          orderBy: { displayIndex: "asc" },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }
    if (
      request.status === RequestStatus.CANCELLED ||
      request.status === RequestStatus.EXPIRED
    ) {
      throw new ConflictException(FA.REQUEST_CLOSED);
    }

    const rates = await this.settings.rateMap();
    if (dto.omrRate) {
      rates[Currency.OMR] = new Prisma.Decimal(dto.omrRate);
    }
    const omrRate = rates[Currency.OMR];
    if (!omrRate) {
      throw new BadRequestException(FA.RATE_MISSING);
    }

    const lines = this.buildLines(dto, request.items, rates);
    if (lines.length === 0) {
      throw new BadRequestException(FA.QUOTE_EMPTY);
    }
    const productsTotal = sumDecimals(lines.map((line) => line.totalToman));

    const validityDays = dto.validityDays ?? (await this.settings.quoteValidityDays());
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : this.settings.quoteExpiryFrom(validityDays);

    const existingDraft = await this.prisma.quote.findFirst({
      where: { requestId: request.id, status: QuoteStatus.DRAFT },
      orderBy: { createdAt: "desc" },
    });

    const code = existingDraft?.code ?? (await this.allocateQuoteCode());

    return this.prisma.$transaction(async (tx) => {
      const quote = existingDraft
        ? await tx.quote.update({
            where: { id: existingDraft.id },
            data: {
              omrRate,
              rateSetAt: new Date(),
              rateSetByAdminId: adminId,
              productsTotal,
              expiresAt,
            },
          })
        : await tx.quote.create({
            data: {
              code,
              status: QuoteStatus.DRAFT,
              requestId: request.id,
              userId: request.userId,
              omrRate,
              rateCurrency: Currency.OMR,
              rateSetByAdminId: adminId,
              productsTotal,
              expiresAt,
              publicToken: publicToken(),
            },
          });

      if (existingDraft) {
        await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
      }

      for (const line of lines) {
        await tx.quoteItem.create({
          data: {
            quoteId: quote.id,
            requestItemId: line.requestItemId,
            displayIndex: line.displayIndex,
            productCode: line.productCode,
            title: line.title,
            quantity: line.quantity,
            price: line.price,
            currency: line.currency,
            imageUrl: line.imageUrl,
          },
        });
      }

      if (dto.notes) {
        await tx.quoteNote.deleteMany({ where: { quoteId: quote.id } });
        for (const [index, body] of dto.notes.entries()) {
          await tx.quoteNote.create({
            data: { quoteId: quote.id, body, sortOrder: index },
          });
        }
      }

      return tx.quote.findUniqueOrThrow({
        where: { id: quote.id },
        include: {
          items: { orderBy: { displayIndex: "asc" } },
          notes: { orderBy: { sortOrder: "asc" } },
        },
      });
    });
  }

  async addNote(quoteId: string, dto: CreateQuoteNoteDto) {
    const quote = await this.requireQuote(quoteId);
    return this.prisma.quoteNote.create({
      data: {
        quoteId: quote.id,
        body: dto.body,
        sortOrder: dto.sortOrder ?? 0,
        isTemplate: dto.isTemplate ?? false,
      },
    });
  }

  /** DRAFT → SENT. Supersedes older quotes and pushes the link to Telegram. */
  async issue(quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { OR: [{ id: quoteId }, { code: quoteId }] },
      include: { items: true, request: true, user: true },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ConflictException(FA.QUOTE_NOT_DRAFT);
    }
    if (quote.items.length === 0) {
      throw new BadRequestException(FA.QUOTE_EMPTY);
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          id: { not: quote.id },
          status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] },
        },
        data: { status: QuoteStatus.SUPERSEDED },
      });

      const sent = await tx.quote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.SENT, sentAt: new Date() },
        include: {
          items: { orderBy: { displayIndex: "asc" } },
          notes: { orderBy: { sortOrder: "asc" } },
        },
      });

      await tx.purchaseRequest.update({
        where: { id: quote.requestId },
        data: { status: RequestStatus.QUOTED },
      });

      return sent;
    });

    const url = this.config.quoteUrl(issued.publicToken);
    await this.notifications.notifyUser({
      userId: issued.userId,
      event: NotificationEvent.QUOTE_SENT,
      title: `پیش‌فاکتور ${issued.code} آماده است`,
      body: `مبلغ کل ${formatToman(Number(issued.productsTotal))} — تا ${issued.expiresAt.toISOString()} معتبر است.`,
      meta: {
        quoteId: issued.id,
        quoteCode: issued.code,
        requestCode: quote.request.code,
        publicToken: issued.publicToken,
        url,
        expiresAt: issued.expiresAt.toISOString(),
        productsTotal: issued.productsTotal.toString(),
      },
    });

    return { ...issued, url };
  }

  async getForAdmin(quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { OR: [{ id: quoteId }, { code: quoteId }] },
      include: {
        items: { orderBy: { displayIndex: "asc" } },
        notes: { orderBy: { sortOrder: "asc" } },
        request: { include: { items: { orderBy: { displayIndex: "asc" } } } },
        user: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        order: true,
        payments: { orderBy: { createdAt: "desc" } },
        rateSetByAdmin: { select: { id: true, displayName: true } },
      },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }

    const acceptance = await this.settings.getJson<QuoteAcceptance>(
      quoteAcceptanceKey(quote.id),
    );

    return {
      ...quote,
      request: {
        ...quote.request,
        items: quote.request.items.map((item) => ({
          ...item,
          telegramMessageId: item.telegramMessageId?.toString() ?? null,
        })),
      },
      payments: quote.payments.map((payment) => ({
        ...payment,
        telegramChatId: payment.telegramChatId?.toString() ?? null,
        telegramMessageId: payment.telegramMessageId?.toString() ?? null,
      })),
      url: this.config.quoteUrl(quote.publicToken),
      acceptance: acceptance ?? null,
    };
  }

  // ─── Public ─────────────────────────────────────────────────

  async getPublic(codeOrToken: string) {
    const quote = await this.expireIfDue(await this.requirePublicQuote(codeOrToken));

    if (quote.status === QuoteStatus.SENT && !quote.viewedAt) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { viewedAt: new Date() },
      });
    }

    const [items, notes, request, user, methods] = await Promise.all([
      this.prisma.quoteItem.findMany({
        where: { quoteId: quote.id },
        orderBy: { displayIndex: "asc" },
      }),
      this.prisma.quoteNote.findMany({
        where: { quoteId: quote.id },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.purchaseRequest.findUniqueOrThrow({
        where: { id: quote.requestId },
        select: { code: true, type: true, storeName: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: quote.userId },
        select: { customerCode: true, displayName: true },
      }),
      this.prisma.paymentMethod.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          accountOrWallet: true,
          network: true,
          instructions: true,
        },
      }),
    ]);

    const rates: RateMap = { [Currency.OMR]: quote.omrRate };

    return {
      code: quote.code,
      status: quote.status,
      isExpired: quote.status === QuoteStatus.EXPIRED,
      isRejected: quote.status === QuoteStatus.REJECTED,
      omrRate: quote.omrRate.toString(),
      productsTotal: quote.productsTotal.toString(),
      productsTotalLabel: formatToman(Number(quote.productsTotal)),
      expiresAt: quote.expiresAt,
      sentAt: quote.sentAt,
      acceptedAt: quote.acceptedAt,
      request,
      customer: user,
      items: items.map((item) => {
        const total = lineTotalToman(item.price, item.quantity, item.currency, rates);
        return {
          id: item.id,
          displayIndex: item.displayIndex,
          productCode: item.productCode,
          title: item.title,
          quantity: item.quantity,
          price: item.price.toString(),
          currency: item.currency,
          imageUrl: item.imageUrl,
          totalToman: total.toString(),
          totalTomanLabel: formatToman(Number(total)),
        };
      }),
      notes: notes.map((note) => ({ id: note.id, body: note.body })),
      paymentMethods: quote.status === QuoteStatus.ACCEPTED ? methods : [],
    };
  }

  /**
   * Customer acceptance. This does NOT create an Order — the order is only born
   * when a payment is confirmed (or an admin files a manual order with a
   * reason). Acceptance just records intent plus the chosen inspection level.
   */
  async confirmPublic(codeOrToken: string, dto: ConfirmQuoteDto, ip: string | null) {
    const quote = await this.expireIfDue(await this.requirePublicQuote(codeOrToken));

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new ConflictException(FA.QUOTE_ALREADY_ACCEPTED);
    }
    if (quote.status === QuoteStatus.REJECTED) {
      throw new ConflictException(FA.QUOTE_ALREADY_REJECTED);
    }
    if (quote.status === QuoteStatus.EXPIRED) {
      throw new GoneException(FA.QUOTE_EXPIRED);
    }
    if (quote.status === QuoteStatus.SUPERSEDED) {
      throw new ConflictException(FA.QUOTE_SUPERSEDED);
    }
    if (quote.status !== QuoteStatus.SENT) {
      throw new ConflictException(FA.QUOTE_NOT_SENT);
    }

    const notes = await this.prisma.quoteNote.findMany({
      where: { quoteId: quote.id },
      select: { id: true },
    });
    const accepted = new Set(dto.acceptedNoteIds);
    const allAccepted = notes.every((note) => accepted.has(note.id));
    if (!dto.acceptedTerms || !allAccepted) {
      throw new BadRequestException(FA.QUOTE_TERMS_REQUIRED);
    }

    const acceptance: QuoteAcceptance = {
      inspectionType: dto.inspectionType,
      acceptedNoteIds: dto.acceptedNoteIds,
      acceptedAt: new Date().toISOString(),
      ip,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.quote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.ACCEPTED, acceptedAt: new Date() },
      });
      const key = quoteAcceptanceKey(quote.id);
      await tx.setting.upsert({
        where: { key },
        update: { value: acceptance as unknown as Prisma.InputJsonValue },
        create: { key, value: acceptance as unknown as Prisma.InputJsonValue },
      });
      return result;
    });

    const [user, methods] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: quote.userId },
        select: { customerCode: true },
      }),
      this.prisma.paymentMethod.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          accountOrWallet: true,
          network: true,
          instructions: true,
        },
      }),
    ]);

    await this.notifications.notifyAdmins({
      event: NotificationEvent.QUOTE_ACCEPTED,
      title: `پیش‌فاکتور ${quote.code} تأیید شد`,
      body: `مشتری ${user.customerCode} پیش‌فاکتور ${quote.code} را تأیید کرد و در انتظار پرداخت است.`,
      meta: {
        quoteId: quote.id,
        quoteCode: quote.code,
        customerCode: user.customerCode,
        inspectionType: dto.inspectionType,
        amountDue: quote.productsTotal.toString(),
      },
    });

    return {
      status: updated.status,
      // Awaiting payment: no Order exists yet, by design.
      awaitingPayment: true,
      quoteCode: updated.code,
      amountDue: updated.productsTotal.toString(),
      amountDueLabel: formatToman(Number(updated.productsTotal)),
      inspectionType: dto.inspectionType,
      paymentMethods: methods,
      url: this.config.quoteUrl(updated.publicToken),
    };
  }

  /**
   * Customer rejection from the public page or bot. Only SENT quotes can be rejected.
   */
  async rejectPublic(codeOrToken: string, reason?: string) {
    const quote = await this.expireIfDue(await this.requirePublicQuote(codeOrToken));

    if (quote.status === QuoteStatus.REJECTED) {
      throw new ConflictException(FA.QUOTE_ALREADY_REJECTED);
    }
    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new ConflictException(FA.QUOTE_ALREADY_ACCEPTED);
    }
    if (quote.status === QuoteStatus.EXPIRED) {
      throw new GoneException(FA.QUOTE_EXPIRED);
    }
    if (quote.status === QuoteStatus.SUPERSEDED) {
      throw new ConflictException(FA.QUOTE_SUPERSEDED);
    }
    if (quote.status !== QuoteStatus.SENT) {
      throw new ConflictException(FA.QUOTE_NOT_SENT);
    }

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.REJECTED },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: quote.userId },
      select: { customerCode: true },
    });

    const reasonLabel = reason?.trim() ? reason.trim() : null;
    await this.notifications.notifyAdmins({
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `پیش‌فاکتور ${quote.code} رد شد`,
      body: reasonLabel
        ? `مشتری ${user.customerCode} پیش‌فاکتور ${quote.code} را رد کرد. دلیل: ${reasonLabel}`
        : `مشتری ${user.customerCode} پیش‌فاکتور ${quote.code} را رد کرد.`,
      meta: {
        quoteId: quote.id,
        quoteCode: quote.code,
        customerCode: user.customerCode,
        reason: reasonLabel,
        status: QuoteStatus.REJECTED,
      },
    });

    return { status: updated.status, quoteCode: updated.code };
  }

  /**
   * Bot-facing acceptance: accept all notes, default inspection, verify Telegram ownership.
   */
  async confirmForTelegramUser(codeOrTokenOrId: string, telegramUserId: string) {
    const quote = await this.requirePublicQuoteOrId(codeOrTokenOrId);
    await this.assertTelegramOwnsQuote(quote, telegramUserId);

    const notes = await this.prisma.quoteNote.findMany({
      where: { quoteId: quote.id },
      select: { id: true },
    });
    const inspectionType = await this.settings.defaultInspectionType();

    return this.confirmPublic(
      quote.publicToken,
      {
        acceptedNoteIds: notes.map((note) => note.id),
        acceptedTerms: true,
        inspectionType,
      },
      null,
    );
  }

  async rejectForTelegramUser(
    codeOrTokenOrId: string,
    telegramUserId: string,
    reason?: string,
  ) {
    const quote = await this.requirePublicQuoteOrId(codeOrTokenOrId);
    await this.assertTelegramOwnsQuote(quote, telegramUserId);
    return this.rejectPublic(quote.publicToken, reason);
  }

  /** Used by PaymentsModule to look a quote up from a public link. */
  async requirePublicQuote(codeOrToken: string): Promise<Quote> {
    const quote = await this.prisma.quote.findFirst({
      where: { OR: [{ publicToken: codeOrToken }, { code: codeOrToken }] },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }
    return quote;
  }

  async requirePublicQuoteOrId(codeOrTokenOrId: string): Promise<Quote> {
    const quote = await this.prisma.quote.findFirst({
      where: {
        OR: [
          { publicToken: codeOrTokenOrId },
          { code: codeOrTokenOrId },
          { id: codeOrTokenOrId },
        ],
      },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }
    return quote;
  }

  private async assertTelegramOwnsQuote(quote: Quote, telegramUserId: string): Promise<void> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId: toTelegramId(telegramUserId) },
      select: { userId: true },
    });
    if (!account || account.userId !== quote.userId) {
      throw new ForbiddenException(FA.QUOTE_NOT_OWNED);
    }
  }

  /** Lazily flips a SENT quote to EXPIRED once its deadline has passed. */
  async expireIfDue(quote: Quote): Promise<Quote> {
    if (quote.status !== QuoteStatus.SENT || quote.expiresAt > new Date()) {
      return quote;
    }
    const expired = await this.prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.EXPIRED },
    });
    await this.notifications.notifyUser({
      userId: quote.userId,
      event: NotificationEvent.QUOTE_EXPIRED,
      title: `پیش‌فاکتور ${quote.code} منقضی شد`,
      body: FA.QUOTE_EXPIRED,
      meta: { quoteId: quote.id, quoteCode: quote.code },
    });
    return expired;
  }

  async acceptanceFor(quoteId: string): Promise<QuoteAcceptance | undefined> {
    return this.settings.getJson<QuoteAcceptance>(quoteAcceptanceKey(quoteId));
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async requireQuote(idOrCode: string): Promise<Quote> {
    const quote = await this.prisma.quote.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }
    return quote;
  }

  private allocateQuoteCode(): Promise<string> {
    return uniqueCode(generateQuoteId, async (code) => {
      const found = await this.prisma.quote.findUnique({ where: { code } });
      return found !== null;
    });
  }

  private buildLines(
    dto: UpsertQuoteDto,
    requestItems: Array<{
      id: string;
      displayIndex: number;
      productCode: string;
      quantity: number;
      price: Prisma.Decimal | null;
      currency: Currency | null;
      images: string[];
      userNote: string | null;
    }>,
    rates: RateMap,
  ): QuoteLine[] {
    if (dto.items && dto.items.length > 0) {
      return dto.items.map((item, index) => {
        const source = item.requestItemId
          ? requestItems.find((candidate) => candidate.id === item.requestItemId)
          : undefined;
        const currency = item.currency ?? source?.currency ?? Currency.TOMAN;
        const price = new Prisma.Decimal(item.price);
        const quantity = item.quantity ?? source?.quantity ?? 1;
        return {
          requestItemId: source?.id ?? null,
          displayIndex: index + 1,
          productCode: item.productCode ?? source?.productCode ?? `IT-${index + 1}`,
          title: item.title ?? source?.userNote ?? null,
          quantity,
          price,
          currency,
          imageUrl: item.imageUrl ?? source?.images[0] ?? null,
          totalToman: lineTotalToman(price, quantity, currency, rates),
        };
      });
    }

    // No explicit lines: price straight from the admin-priced request items.
    return requestItems
      .filter((item) => item.price !== null)
      .map((item, index) => {
        const currency = item.currency ?? Currency.TOMAN;
        const price = item.price as Prisma.Decimal;
        return {
          requestItemId: item.id,
          displayIndex: index + 1,
          productCode: item.productCode,
          title: item.userNote,
          quantity: item.quantity,
          price,
          currency,
          imageUrl: item.images[0] ?? null,
          totalToman: lineTotalToman(price, item.quantity, currency, rates),
        };
      });
  }
}

interface QuoteLine {
  requestItemId: string | null;
  displayIndex: number;
  productCode: string;
  title: string | null;
  quantity: number;
  price: Prisma.Decimal;
  currency: Currency;
  imageUrl: string | null;
  totalToman: Prisma.Decimal;
}
