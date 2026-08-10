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
  RequestItemStatus,
  RequestStatus,
  RequestType,
} from "@hmray/database";
import { generateProductCode, generateRequestId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
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

    return this.prisma.requestItem.create({
      data: {
        requestId: request.id,
        displayIndex: await this.nextDisplayIndex(request.id),
        productCode: this.productCodeFor(request.type),
        originalUrl: dto.originalUrl ?? null,
        images: dto.images ?? [],
        userNote: dto.userNote ?? null,
        quantity: dto.quantity ?? 1,
        telegramMessageId: dto.telegramMessageId ? BigInt(dto.telegramMessageId) : null,
      },
    });
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

    return updated;
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
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return paginated(
      items.map((request) => ({
        ...request,
        items: request.items.map(stripBigInt),
        quotes: request.quotes.map((quote) => ({
          ...quote,
          url: this.config.quoteUrl(quote.publicToken),
        })),
      })),
      total,
      args,
    );
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
