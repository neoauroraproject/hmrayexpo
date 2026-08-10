import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NoteVisibility,
  NotificationEvent,
  Prisma,
  PurchaseRequest,
  QuoteStatus,
  RequestItemStatus,
  RequestStatus,
  RequestType,
} from "@hmray/database";
import { formatToman, generateProductCode, generateRequestId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
import { fetchOgImage } from "../../common/utils/link-preview";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import {
  canTransitionRequest,
  OPEN_REQUEST_STATUSES,
} from "../../common/state/request-transitions";
import { CustomersService } from "../customers/customers.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AppConfigService } from "../../common/config/app-config.service";
import type {
  AddRequestItemDto,
  AdminRequestItemDto,
  CreateAdminRequestDto,
  CreateBotRequestDto,
  CreateRequestMessageDto,
  ListRequestsQueryDto,
  PriceRequestItemDto,
} from "./dto/request.dto";

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  // ─── Bot ────────────────────────────────────────────────────

  /**
   * Opens a basket. It lives at REQUESTED with `submittedAt = null` — the
   * "draft" state — until the customer finalizes it.
   */
  async createForBot(dto: CreateBotRequestDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const code = await this.allocateRequestCode();

    return this.prisma.purchaseRequest.create({
      data: {
        code,
        type: dto.type,
        status: RequestStatus.REQUESTED,
        purchaseMode: dto.purchaseMode ?? null,
        storeName: dto.storeName ?? null,
        storeId: dto.storeId ?? null,
        userId: user.id,
      },
      include: { items: true },
    });
  }

  async addItem(requestId: string, dto: AddRequestItemDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const request = await this.requireOwnedRequest(requestId, user.id);
    this.assertEditable(request);

    if (!dto.originalUrl && (!dto.images || dto.images.length === 0)) {
      throw new BadRequestException(FA.ITEM_SOURCE_REQUIRED);
    }

    let images = dto.images ?? [];
    if (dto.originalUrl && images.length === 0) {
      const ogImage = await fetchOgImage(dto.originalUrl);
      if (ogImage) {
        images = [ogImage];
      }
    }

    return this.prisma.requestItem.create({
      data: {
        requestId: request.id,
        displayIndex: await this.nextDisplayIndex(request.id),
        productCode: this.productCodeFor(request.type),
        originalUrl: dto.originalUrl ?? null,
        images,
        userNote: dto.userNote ?? null,
        quantity: dto.quantity ?? 1,
        telegramMessageId: dto.telegramMessageId ? BigInt(dto.telegramMessageId) : null,
      },
    });
  }

  async updateItemNote(
    requestId: string,
    itemId: string,
    telegramUserId: string,
    userNote: string,
  ) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const request = await this.requireOwnedRequest(requestId, user.id);
    this.assertEditable(request);

    const item = await this.prisma.requestItem.findFirst({
      where: {
        id: itemId,
        requestId: request.id,
        status: { not: RequestItemStatus.REMOVED },
      },
    });
    if (!item) {
      throw new NotFoundException(FA.REQUEST_ITEM_NOT_FOUND);
    }

    const updated = await this.prisma.requestItem.update({
      where: { id: item.id },
      data: { userNote: userNote.trim() },
    });
    return stripBigInt(updated);
  }

  /** Re-fetch OG/Twitter image for an existing item that has originalUrl but no image. */
  async refreshItemPreview(requestId: string, itemId: string) {
    const request = await this.requireRequest(requestId);
    const item = await this.prisma.requestItem.findFirst({
      where: { id: itemId, requestId: request.id },
    });
    if (!item) {
      throw new NotFoundException(FA.REQUEST_ITEM_NOT_FOUND);
    }
    if (!item.originalUrl) {
      throw new BadRequestException("item has no originalUrl to preview");
    }

    const ogImage = await fetchOgImage(item.originalUrl);
    if (!ogImage) {
      return stripBigInt(item);
    }

    const updated = await this.prisma.requestItem.update({
      where: { id: item.id },
      data: { images: [ogImage] },
    });
    return stripBigInt(updated);
  }

  /**
   * Soft-removes the line. `displayIndex` is unique per request and appears in
   * customer-facing messages, so indexes are never recycled.
   */
  async removeItem(requestId: string, itemId: string, telegramUserId: string) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const request = await this.requireOwnedRequest(requestId, user.id);
    this.assertEditable(request);

    const item = await this.prisma.requestItem.findFirst({
      where: { id: itemId, requestId: request.id },
    });
    if (!item) {
      throw new NotFoundException(FA.REQUEST_ITEM_NOT_FOUND);
    }

    await this.prisma.requestItem.update({
      where: { id: item.id },
      data: { status: RequestItemStatus.REMOVED },
    });
    return { removed: true };
  }

  async finalize(requestId: string, telegramUserId: string) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const request = await this.requireOwnedRequest(requestId, user.id);

    if (request.submittedAt) {
      throw new ConflictException(FA.REQUEST_ALREADY_SUBMITTED);
    }
    this.assertEditable(request);

    const activeItems = await this.prisma.requestItem.count({
      where: { requestId: request.id, status: { not: RequestItemStatus.REMOVED } },
    });
    if (activeItems === 0) {
      throw new BadRequestException(FA.REQUEST_EMPTY);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id: request.id },
      data: { status: RequestStatus.REQUESTED, submittedAt: new Date() },
      include: { items: { orderBy: { displayIndex: "asc" } } },
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.NEW_REQUEST,
      title: `درخواست جدید ${updated.code}`,
      body: `مشتری ${user.customerCode} درخواست ${updated.code} را با ${activeItems} کالا ثبت کرد.`,
      meta: {
        requestId: updated.id,
        requestCode: updated.code,
        customerCode: user.customerCode,
        itemCount: activeItems,
        requestType: updated.type,
        url: `${this.config.adminPublicUrl.replace(/\/$/, "")}/requests/${updated.id}`,
      },
    });

    return {
      ...updated,
      trackingCode: updated.code,
      trackingUrl: this.config.trackingUrl(updated.code),
    };
  }

  async listForBot(telegramUserId: string, page?: number, pageSize?: number) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const args = pageArgs(page, pageSize);
    const where: Prisma.PurchaseRequestWhereInput = { userId: user.id };

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          items: {
            where: { status: { not: RequestItemStatus.REMOVED } },
            orderBy: { displayIndex: "asc" },
          },
          quotes: {
            orderBy: { createdAt: "desc" },
            select: { id: true, code: true, status: true, expiresAt: true, publicToken: true },
          },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, code: true, status: true },
          },
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return paginated(
      items.map((request) => {
        const { orders, ...rest } = request;
        const order = orders[0] ?? null;
        const canCancel = this.canCustomerCancel(request.status, order !== null);
        return {
          ...rest,
          order,
          canCancel,
          trackingCode: request.code,
          trackingUrl: this.config.trackingUrl(request.code),
          items: request.items.map(stripBigInt),
          quotes: request.quotes.map((quote) => ({
            ...quote,
            url: this.config.quoteUrl(quote.publicToken),
          })),
        };
      }),
      total,
      args,
    );
  }

  /**
   * Customer cancel via bot — allowed until an order exists.
   * Once paid / order confirmed, cancellation is ops-only.
   */
  async cancelForBot(id: string, telegramUserId: string) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const request = await this.requireOwnedRequest(id, user.id);

    if (request.status === RequestStatus.CANCELLED) {
      throw new ConflictException(FA.REQUEST_ALREADY_CANCELLED);
    }

    const order = await this.prisma.order.findFirst({
      where: { requestId: request.id },
      select: { id: true },
    });
    if (order) {
      throw new ConflictException(FA.REQUEST_HAS_ORDER);
    }

    if (!canTransitionRequest(request.status, RequestStatus.CANCELLED)) {
      throw new ConflictException(FA.REQUEST_INVALID_TRANSITION);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id: request.id },
      data: { status: RequestStatus.CANCELLED, closedAt: new Date() },
      include: {
        items: {
          where: { status: { not: RequestItemStatus.REMOVED } },
          orderBy: { displayIndex: "asc" },
        },
      },
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `انصراف مشتری از ${updated.code}`,
      body: `مشتری ${user.customerCode} درخواست ${updated.code} را لغو کرد.`,
      meta: {
        requestId: updated.id,
        requestCode: updated.code,
        customerCode: user.customerCode,
        url: `${this.config.adminPublicUrl.replace(/\/$/, "")}/requests/${updated.id}`,
      },
    });

    return {
      ...updated,
      items: updated.items.map(stripBigInt),
      canCancel: false,
      trackingCode: updated.code,
      trackingUrl: this.config.trackingUrl(updated.code),
    };
  }

  private canCustomerCancel(status: RequestStatus, hasOrder: boolean): boolean {
    if (hasOrder) return false;
    return canTransitionRequest(status, RequestStatus.CANCELLED);
  }

  /** Customer-facing lifetime timeline by RQ- or HM-YYYY- order code. */
  async getPublicTrack(code: string) {
    const normalized = code.trim();
    if (!normalized) {
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }

    const trackInclude = {
      user: { select: { customerCode: true } },
      items: {
        where: { status: { not: RequestItemStatus.REMOVED } },
        orderBy: { displayIndex: "asc" as const },
        select: {
          displayIndex: true,
          productCode: true,
          originalUrl: true,
          images: true,
          userNote: true,
          status: true,
        },
      },
      quotes: {
        where: { status: { not: QuoteStatus.DRAFT } },
        orderBy: { createdAt: "desc" as const },
        select: {
          code: true,
          status: true,
          productsTotal: true,
          publicToken: true,
          expiresAt: true,
          acceptedAt: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        include: {
          statusHistory: {
            orderBy: { createdAt: "asc" as const },
            select: { toStatus: true, createdAt: true },
          },
          shipment: {
            select: {
              status: true,
              shippedAt: true,
              deliveredAt: true,
              trackingEvents: {
                orderBy: { occurredAt: "desc" as const },
                select: { leg: true, trackingNumber: true, occurredAt: true },
              },
            },
          },
        },
      },
    };

    let request = await this.prisma.purchaseRequest.findFirst({
      where: { code: { equals: normalized, mode: Prisma.QueryMode.insensitive } },
      include: trackInclude,
    });

    if (!request) {
      const orderMatch = await this.prisma.order.findFirst({
        where: { code: { equals: normalized, mode: Prisma.QueryMode.insensitive } },
        select: { requestId: true },
      });
      if (orderMatch) {
        request = await this.prisma.purchaseRequest.findUnique({
          where: { id: orderMatch.requestId },
          include: trackInclude,
        });
      }
    }

    if (!request) {
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }

    const order = request.orders[0] ?? null;

    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          ...(order ? [{ orderId: order.id }] : []),
          { quote: { requestId: request.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    return {
      trackingCode: request.code,
      customerCode: request.user.customerCode ?? null,
      request: {
        id: request.id,
        code: request.code,
        type: request.type,
        status: request.status,
        submittedAt: request.submittedAt,
        storeName: request.storeName,
        items: request.items,
      },
      quotes: request.quotes.map((quote) => ({
        code: quote.code,
        status: quote.status,
        productsTotalLabel: formatToman(Number(quote.productsTotal)),
        url: this.config.quoteUrl(quote.publicToken),
        expiresAt: quote.expiresAt,
        acceptedAt: quote.acceptedAt,
      })),
      order: order
        ? {
            code: order.code,
            status: order.status,
            totalTomanLabel: formatToman(Number(order.totalToman)),
            deliveredAt: order.deliveredAt,
            timeline: order.statusHistory,
            shipment: order.shipment ?? undefined,
          }
        : null,
      payments: payments.map((payment) => ({
        code: payment.code,
        status: payment.status,
        amountLabel:
          payment.currency === "TOMAN"
            ? formatToman(Number(payment.amount))
            : `${new Intl.NumberFormat("fa-IR").format(Number(payment.amount))} ${payment.currency}`,
        createdAt: payment.createdAt,
      })),
      trackingUrl: this.config.trackingUrl(request.code),
    };
  }

  // ─── Admin ──────────────────────────────────────────────────

  async list(query: ListRequestsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.PurchaseRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { storeName: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { user: { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { items: { some: { productCode: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          user: { select: { id: true, customerCode: true, displayName: true } },
          _count: { select: { items: true, quotes: true, orders: true } },
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return paginated(items, total, args);
  }

  /** Everything the admin request workspace needs to price and quote. */
  async workspace(id: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        user: { include: { telegramAccount: true } },
        store: true,
        createdByAdmin: { select: { id: true, displayName: true, username: true } },
        items: { orderBy: { displayIndex: "asc" } },
        quotes: {
          orderBy: { createdAt: "desc" },
          include: { items: { orderBy: { displayIndex: "asc" } }, notes: true },
        },
        orders: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!request) {
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }

    const notes = await this.prisma.entityNote.findMany({
      where: { entityType: "PurchaseRequest", entityId: request.id },
      orderBy: { createdAt: "desc" },
      include: { authorAdmin: { select: { id: true, displayName: true } } },
    });

    return {
      ...request,
      user: {
        ...request.user,
        telegramAccount: request.user.telegramAccount
          ? {
              ...request.user.telegramAccount,
              telegramUserId: request.user.telegramAccount.telegramUserId.toString(),
            }
          : null,
      },
      items: request.items.map(stripBigInt),
      quotes: request.quotes.map((quote) => ({
        ...quote,
        url: this.config.quoteUrl(quote.publicToken),
      })),
      notes,
    };
  }

  async updateStatus(id: string, status: RequestStatus, note: string | undefined) {
    const request = await this.requireRequest(id);
    if (request.status === status) {
      return request;
    }
    if (!canTransitionRequest(request.status, status)) {
      throw new ConflictException(FA.REQUEST_INVALID_TRANSITION);
    }

    const closed =
      status === RequestStatus.CANCELLED || status === RequestStatus.EXPIRED
        ? new Date()
        : request.closedAt;

    const updated = await this.prisma.purchaseRequest.update({
      where: { id: request.id },
      data: { status, closedAt: closed },
    });

    if (note) {
      await this.prisma.entityNote.create({
        data: {
          entityType: "PurchaseRequest",
          entityId: request.id,
          body: note,
          visibility: NoteVisibility.INTERNAL,
        },
      });
    }

    return updated;
  }

  /** Support path — the acting admin is recorded on the request itself. */
  async createForAdmin(dto: CreateAdminRequestDto, adminId: string) {
    const user = await this.customers.requireByIdOrCode(dto.customer);
    const code = await this.allocateRequestCode();

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.purchaseRequest.create({
        data: {
          code,
          type: dto.type,
          status: RequestStatus.REQUESTED,
          purchaseMode: dto.purchaseMode ?? null,
          storeName: dto.storeName ?? null,
          storeId: dto.storeId ?? null,
          userId: user.id,
          createdByAdminId: adminId,
          submittedAt: new Date(),
        },
      });

      const items = dto.items ?? [];
      for (const [index, item] of items.entries()) {
        await tx.requestItem.create({
          data: this.adminItemData(request.id, request.type, index + 1, item),
        });
      }

      return tx.purchaseRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: { items: { orderBy: { displayIndex: "asc" } } },
      });
    });
  }

  async priceItem(requestId: string, itemId: string, dto: PriceRequestItemDto) {
    const request = await this.requireRequest(requestId);
    const item = await this.prisma.requestItem.findFirst({
      where: { id: itemId, requestId: request.id },
    });
    if (!item) {
      throw new NotFoundException(FA.REQUEST_ITEM_NOT_FOUND);
    }

    let price: Prisma.Decimal;
    try {
      price = new Prisma.Decimal(dto.price);
    } catch {
      throw new BadRequestException("price must be a decimal number");
    }
    if (price.lessThan(0)) {
      throw new BadRequestException("price must not be negative");
    }

    return this.prisma.requestItem.update({
      where: { id: item.id },
      data: {
        price,
        currency: dto.currency ?? item.currency ?? undefined,
        status: dto.status ?? RequestItemStatus.PRICED,
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
      },
    });
  }

  /** Customer-visible timeline note; also pushed to Telegram. */
  async addMessage(requestId: string, dto: CreateRequestMessageDto, adminId: string) {
    const request = await this.requireRequest(requestId);

    const note = await this.prisma.entityNote.create({
      data: {
        entityType: "PurchaseRequest",
        entityId: request.id,
        body: dto.body,
        visibility: NoteVisibility.CUSTOMER,
        authorAdminId: adminId,
      },
    });

    await this.notifications.notifyUser({
      userId: request.userId,
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `پیام درباره درخواست ${request.code}`,
      body: dto.body,
      meta: { requestId: request.id, requestCode: request.code, noteId: note.id },
    });

    return note;
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async requireRequest(id: string): Promise<PurchaseRequest> {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!request) {
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }
    return request;
  }

  private async requireOwnedRequest(id: string, userId: string): Promise<PurchaseRequest> {
    const request = await this.requireRequest(id);
    if (request.userId !== userId) {
      // Do not leak that the request exists for another customer.
      throw new NotFoundException(FA.REQUEST_NOT_FOUND);
    }
    return request;
  }

  private assertEditable(request: PurchaseRequest): void {
    if (!OPEN_REQUEST_STATUSES.includes(request.status)) {
      throw new ConflictException(FA.REQUEST_CLOSED);
    }
  }

  private productCodeFor(type: RequestType): string {
    return generateProductCode(type === RequestType.TEMU ? "TM" : "EX");
  }

  private async nextDisplayIndex(requestId: string): Promise<number> {
    const last = await this.prisma.requestItem.findFirst({
      where: { requestId },
      orderBy: { displayIndex: "desc" },
      select: { displayIndex: true },
    });
    return (last?.displayIndex ?? 0) + 1;
  }

  private allocateRequestCode(): Promise<string> {
    return uniqueCode(generateRequestId, async (code) => {
      const found = await this.prisma.purchaseRequest.findUnique({ where: { code } });
      return found !== null;
    });
  }

  private adminItemData(
    requestId: string,
    type: RequestType,
    displayIndex: number,
    item: AdminRequestItemDto,
  ): Prisma.RequestItemUncheckedCreateInput {
    return {
      requestId,
      displayIndex,
      productCode: this.productCodeFor(type),
      originalUrl: item.originalUrl ?? null,
      images: item.images ?? [],
      userNote: item.userNote ?? null,
      adminNote: item.adminNote ?? null,
      quantity: item.quantity ?? 1,
      price: item.price ? new Prisma.Decimal(item.price) : null,
      currency: item.currency ?? null,
      status: item.price ? RequestItemStatus.PRICED : RequestItemStatus.ACTIVE,
    };
  }
}

/** `telegramMessageId` is a BigInt column; the wire format is a string. */
function stripBigInt<T extends { telegramMessageId: bigint | null }>(item: T) {
  return { ...item, telegramMessageId: item.telegramMessageId?.toString() ?? null };
}
