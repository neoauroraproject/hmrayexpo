import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationEvent,
  Order,
  OrderCreationMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PurchaseMode,
  QuoteStatus,
} from "@hmray/database";
import { formatToman, generateOrderId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import { canTransitionOrder, PURCHASE_STATUSES } from "../../common/state/order-transitions";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SettingsService } from "../settings/settings.service";
import { QuotesService } from "../quotes/quotes.service";
import { PermissionsService, PERMISSIONS } from "../auth/permissions.service";
import type {
  CreateManualOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";

export interface CreateOrderFromQuoteParams {
  quoteId: string;
  status: OrderStatus;
  creationMethod: OrderCreationMethod;
  creationReason?: string | null;
  adminId?: string | null;
  paymentId?: string | null;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly quotes: QuotesService,
    private readonly permissions: PermissionsService,
  ) {}

  // ─── Reads ──────────────────────────────────────────────────

  async list(query: ListOrdersQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.purchaseMode ? { purchaseMode: query.purchaseMode } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { user: { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { items: { some: { productCode: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          user: { select: { id: true, customerCode: true, displayName: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginated(items, total, args);
  }

  async get(idOrCode: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      include: {
        user: { include: { telegramAccount: true } },
        request: true,
        quote: { include: { notes: { orderBy: { sortOrder: "asc" } } } },
        items: { orderBy: { displayIndex: "asc" } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: { changedByAdmin: { select: { id: true, displayName: true } } },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          include: { method: { select: { id: true, title: true } } },
        },
        tickets: true,
        shipment: { include: { trackingEvents: { orderBy: { occurredAt: "desc" } } } },
      },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }

    const [notes, acceptance] = await Promise.all([
      this.prisma.entityNote.findMany({
        where: { entityType: "Order", entityId: order.id },
        orderBy: { createdAt: "desc" },
      }),
      this.quotes.acceptanceFor(order.quoteId),
    ]);

    return {
      ...order,
      user: {
        ...order.user,
        telegramAccount: order.user.telegramAccount
          ? {
              ...order.user.telegramAccount,
              telegramUserId: order.user.telegramAccount.telegramUserId.toString(),
            }
          : null,
      },
      payments: order.payments.map((payment) => ({
        ...payment,
        telegramChatId: payment.telegramChatId?.toString() ?? null,
        telegramMessageId: payment.telegramMessageId?.toString() ?? null,
      })),
      totalTomanLabel: formatToman(Number(order.totalToman)),
      acceptance: acceptance ?? null,
      notes,
    };
  }

  /** Customer-facing tracking view — no internal notes, no admin identities. */
  async getPublic(code: string) {
    const order = await this.prisma.order.findUnique({
      where: { code },
      include: {
        items: {
          orderBy: { displayIndex: "asc" },
          select: {
            displayIndex: true,
            productCode: true,
            title: true,
            quantity: true,
            imageUrl: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: { toStatus: true, createdAt: true },
        },
        shipment: {
          select: {
            status: true,
            shippedAt: true,
            deliveredAt: true,
            trackingEvents: {
              orderBy: { occurredAt: "desc" },
              select: { leg: true, trackingNumber: true, occurredAt: true },
            },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }

    return {
      code: order.code,
      status: order.status,
      inspectionType: order.inspectionType,
      purchaseMode: order.purchaseMode,
      totalToman: order.totalToman.toString(),
      totalTomanLabel: formatToman(Number(order.totalToman)),
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      items: order.items,
      timeline: order.statusHistory,
      shipment: order.shipment,
    };
  }

  // ─── Writes ─────────────────────────────────────────────────

  /**
   * The single place an Order is born. It always starts from a Quote, which
   * guarantees a request can never skip straight to a purchase.
   */
  async createFromQuote(
    tx: Prisma.TransactionClient,
    params: CreateOrderFromQuoteParams,
  ): Promise<Order> {
    const quote = await tx.quote.findUnique({
      where: { id: params.quoteId },
      include: { items: { orderBy: { displayIndex: "asc" } }, request: true },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }

    const existing = await tx.order.findUnique({ where: { quoteId: quote.id } });
    if (existing) {
      throw new ConflictException(FA.ORDER_ALREADY_EXISTS);
    }

    const inspectionType =
      (await this.quotes.acceptanceFor(quote.id))?.inspectionType ??
      (await this.settings.defaultInspectionType());

    const code = await uniqueCode(generateOrderId, async (candidate) => {
      const found = await tx.order.findUnique({ where: { code: candidate } });
      return found !== null;
    });

    const order = await tx.order.create({
      data: {
        code,
        status: params.status,
        inspectionType,
        purchaseMode: quote.request.purchaseMode ?? PurchaseMode.NORMAL,
        creationMethod: params.creationMethod,
        creationReason: params.creationReason ?? null,
        quoteId: quote.id,
        requestId: quote.requestId,
        userId: quote.userId,
        totalToman: quote.productsTotal,
        omrRate: quote.omrRate,
      },
    });

    for (const item of quote.items) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          quoteItemId: item.id,
          requestItemId: item.requestItemId,
          displayIndex: item.displayIndex,
          productCode: item.productCode,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
        },
      });
    }

    // Creation is always recorded as CONFIRMED, then any further hop (e.g. PAID
    // after a confirmed payment) is appended so the trail is never implicit.
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.CONFIRMED,
        note: params.creationReason ?? "Order created",
        changedByAdminId: params.adminId ?? null,
      },
    });
    if (params.status !== OrderStatus.CONFIRMED) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: params.status,
          note: params.paymentId ? "Payment confirmed" : null,
          changedByAdminId: params.adminId ?? null,
        },
      });
    }

    if (params.paymentId) {
      await tx.payment.update({
        where: { id: params.paymentId },
        data: { orderId: order.id },
      });
    }

    return order;
  }

  /** Announces a newly created order to admins and the customer. */
  async announceNewOrder(order: Order): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: order.userId },
      select: { customerCode: true },
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.NEW_ORDER,
      title: `سفارش جدید ${order.code}`,
      body: `سفارش ${order.code} برای مشتری ${user.customerCode} ثبت شد.`,
      meta: {
        orderId: order.id,
        orderCode: order.code,
        customerCode: user.customerCode,
        totalToman: order.totalToman.toString(),
      },
    });

    await this.notifications.notifyUser({
      userId: order.userId,
      event: NotificationEvent.NEW_ORDER,
      title: `سفارش ${order.code} ثبت شد`,
      body: `سفارش شما به مبلغ ${formatToman(Number(order.totalToman))} ثبت شد و در حال پردازش است.`,
      meta: { orderId: order.id, orderCode: order.code },
    });
  }

  /**
   * Manual order for the support path. Still requires a real quote the customer
   * was shown (DRAFT quotes are rejected) plus a written reason, and the whole
   * thing is audited.
   */
  async createManual(
    dto: CreateManualOrderDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ): Promise<Order> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new ConflictException(FA.ORDER_REASON_REQUIRED);
    }

    const quote = await this.prisma.quote.findFirst({
      where: { OR: [{ id: dto.quote }, { code: dto.quote }, { publicToken: dto.quote }] },
    });
    if (!quote) {
      throw new NotFoundException(FA.QUOTE_NOT_FOUND);
    }
    if (quote.status === QuoteStatus.DRAFT) {
      throw new ConflictException(FA.QUOTE_NOT_SENT);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await this.createFromQuote(tx, {
        quoteId: quote.id,
        status: OrderStatus.CONFIRMED,
        creationMethod: OrderCreationMethod.ADMIN_MANUAL,
        creationReason: dto.reason,
        adminId: admin.id,
      });

      if (dto.inspectionType || dto.purchaseMode) {
        await tx.order.update({
          where: { id: created.id },
          data: {
            ...(dto.inspectionType ? { inspectionType: dto.inspectionType } : {}),
            ...(dto.purchaseMode ? { purchaseMode: dto.purchaseMode } : {}),
          },
        });
      }

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "order.create.manual",
          entityType: "Order",
          entityId: created.id,
          newValue: {
            code: created.code,
            quoteCode: quote.code,
            quoteStatus: quote.status,
            reason: dto.reason,
          },
          context,
        },
        tx,
      );

      return created;
    });

    await this.announceNewOrder(order);
    return order;
  }

  async updateStatus(
    idOrCode: string,
    dto: UpdateOrderStatusDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    if (order.status === dto.status) {
      return order;
    }
    if (!canTransitionOrder(order.status, dto.status)) {
      throw new ConflictException(FA.ORDER_INVALID_TRANSITION);
    }

    let forced = false;
    if (PURCHASE_STATUSES.includes(dto.status)) {
      const paid = await this.hasConfirmedPayment(order);
      if (!paid) {
        // Hard rule: no purchase without confirmed money. The escape hatch needs
        // an explicit permission and leaves an audit trail either way.
        await this.audit.log({
          actorAdminId: admin.id,
          action: "order.purchase.blocked",
          entityType: "Order",
          entityId: order.id,
          newValue: { attemptedStatus: dto.status, force: dto.force ?? false },
          context,
        });
        if (!dto.force) {
          throw new ConflictException(FA.ORDER_PURCHASE_REQUIRES_PAYMENT);
        }
        const allowed = await this.permissions.has(
          admin,
          PERMISSIONS.ORDERS_FORCE_PURCHASE,
        );
        if (!allowed) {
          throw new ForbiddenException(FA.AUTH_FORBIDDEN);
        }
        forced = true;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          status: dto.status,
          ...(dto.status === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
          ...(dto.status === OrderStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: dto.status,
          note: forced
            ? `FORCED without confirmed payment — ${dto.note ?? "no note"}`
            : dto.note ?? null,
          changedByAdminId: admin.id,
        },
      });

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: forced ? "order.force_purchase" : "order.status.update",
          entityType: "Order",
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: {
            status: dto.status,
            note: dto.note ?? null,
            forced,
            permission: forced ? PERMISSIONS.ORDERS_FORCE_PURCHASE : null,
          },
          context,
        },
        tx,
      );

      return result;
    });

    if (dto.status === OrderStatus.READY_FOR_IRAN || dto.status === OrderStatus.DELIVERED) {
      await this.notifications.notifyUser({
        userId: order.userId,
        event: NotificationEvent.ORDER_READY,
        title: `به‌روزرسانی سفارش ${order.code}`,
        body: dto.note ?? `وضعیت سفارش شما به ${dto.status} تغییر کرد.`,
        meta: { orderId: order.id, orderCode: order.code, status: dto.status },
      });
    }

    return updated;
  }

  /** A confirmed payment attached to the order, or to the quote it came from. */
  private async hasConfirmedPayment(order: Order): Promise<boolean> {
    const count = await this.prisma.payment.count({
      where: {
        status: PaymentStatus.CONFIRMED,
        OR: [{ orderId: order.id }, { quoteId: order.quoteId }],
      },
    });
    return count > 0;
  }
}
