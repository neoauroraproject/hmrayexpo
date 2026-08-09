import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationEvent,
  OrderStatus,
  PaymentTransactionKind,
  Prisma,
  RefundStatus,
  RequestType,
  ReturnStatus,
} from "@hmray/database";
import { formatToman } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { TOMAN_SCALE } from "../../common/utils/money";
import { canTransitionOrder } from "../../common/state/order-transitions";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  CreateRefundDto,
  CreateReturnDto,
  ListReturnsQueryDto,
  UpdateRefundStatusDto,
  UpdateReturnStatusDto,
} from "./dto/returns.dto";

const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  [ReturnStatus.RETURN_REQUESTED]: [ReturnStatus.ADMIN_REVIEW, ReturnStatus.REJECTED],
  [ReturnStatus.ADMIN_REVIEW]: [ReturnStatus.RETURN_APPROVED, ReturnStatus.REJECTED],
  [ReturnStatus.RETURN_APPROVED]: [ReturnStatus.RETURN_TO_SELLER, ReturnStatus.REJECTED],
  [ReturnStatus.RETURN_TO_SELLER]: [ReturnStatus.REFUND, ReturnStatus.REJECTED],
  [ReturnStatus.REFUND]: [],
  [ReturnStatus.REJECTED]: [],
};

/** A return that has not yet been settled one way or the other. */
const OPEN_RETURN_STATUSES: ReturnStatus[] = [
  ReturnStatus.RETURN_REQUESTED,
  ReturnStatus.ADMIN_REVIEW,
  ReturnStatus.RETURN_APPROVED,
  ReturnStatus.RETURN_TO_SELLER,
];

const REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  [RefundStatus.PENDING]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
  [RefundStatus.APPROVED]: [RefundStatus.PROCESSING, RefundStatus.REJECTED],
  [RefundStatus.PROCESSING]: [RefundStatus.COMPLETED, RefundStatus.REJECTED],
  [RefundStatus.COMPLETED]: [],
  [RefundStatus.REJECTED]: [],
};

/** The order status each return stage implies, when the order can still move there. */
const ORDER_STATUS_FOR_RETURN: Partial<Record<ReturnStatus, OrderStatus>> = {
  [ReturnStatus.RETURN_REQUESTED]: OrderStatus.RETURN_REQUESTED,
  [ReturnStatus.ADMIN_REVIEW]: OrderStatus.RETURN_PROCESSING,
  [ReturnStatus.RETURN_APPROVED]: OrderStatus.RETURN_PROCESSING,
  [ReturnStatus.RETURN_TO_SELLER]: OrderStatus.RETURN_PROCESSING,
  [ReturnStatus.REFUND]: OrderStatus.REFUND_PENDING,
};

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Reads ──────────────────────────────────────────────────

  async list(query: ListReturnsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.ReturnRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { order: { code: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              {
                order: {
                  user: { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              totalToman: true,
              request: { select: { type: true, storeName: true } },
              user: { select: { customerCode: true, displayName: true } },
            },
          },
          refunds: { select: { id: true, amount: true, status: true } },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return paginated(
      items.map((item) => ({
        ...item,
        ...externalStoreFlags(item.order.request.type),
      })),
      total,
      args,
    );
  }

  async get(id: string) {
    const found = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            totalToman: true,
            omrRate: true,
            request: { select: { type: true, storeName: true } },
            user: { select: { id: true, customerCode: true, displayName: true } },
          },
        },
        reviewedByAdmin: { select: { id: true, displayName: true } },
        refunds: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!found) {
      throw new NotFoundException(FA.RETURN_NOT_FOUND);
    }
    return { ...found, ...externalStoreFlags(found.order.request.type) };
  }

  // ─── Writes ─────────────────────────────────────────────────

  async create(
    orderIdOrCode: string,
    dto: CreateReturnDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const order = await this.requireOrder(orderIdOrCode);

    const open = await this.prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { in: OPEN_RETURN_STATUSES } },
    });
    if (open) {
      throw new ConflictException(FA.RETURN_ALREADY_OPEN);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: ReturnStatus.RETURN_REQUESTED,
          reason: dto.reason,
          notes: dto.notes ?? null,
          reviewedByAdminId: admin.id,
        },
      });

      await this.syncOrderStatus(tx, order, ReturnStatus.RETURN_REQUESTED, admin.id, dto.reason);

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "return.create",
          entityType: "ReturnRequest",
          entityId: request.id,
          newValue: {
            orderCode: order.code,
            reason: dto.reason,
            requestType: order.request.type,
          },
          context,
        },
        tx,
      );

      return request;
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.REFUND_REQUESTED,
      title: `درخواست مرجوعی برای ${order.code}`,
      body:
        order.request.type === RequestType.EXTERNAL_STORE
          ? `${dto.reason} — ${FA.EXTERNAL_STORE_RETURN_WARNING}`
          : dto.reason,
      meta: {
        orderId: order.id,
        orderCode: order.code,
        returnId: created.id,
        requestType: order.request.type,
      },
    });

    return { ...created, ...externalStoreFlags(order.request.type) };
  }

  async updateStatus(
    id: string,
    dto: UpdateReturnStatusDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            userId: true,
            request: { select: { type: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(FA.RETURN_NOT_FOUND);
    }
    if (existing.status === dto.status) {
      return { ...existing, ...externalStoreFlags(existing.order.request.type) };
    }
    if (!RETURN_TRANSITIONS[existing.status].includes(dto.status)) {
      throw new ConflictException(FA.RETURN_INVALID_TRANSITION);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.returnRequest.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          reviewedByAdminId: admin.id,
          ...(dto.status === ReturnStatus.REFUND || dto.status === ReturnStatus.REJECTED
            ? { resolvedAt: new Date() }
            : {}),
        },
      });

      await this.syncOrderStatus(tx, existing.order, dto.status, admin.id, dto.notes);

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "return.status.update",
          entityType: "ReturnRequest",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: {
            status: dto.status,
            orderCode: existing.order.code,
            notes: dto.notes ?? null,
          },
          context,
        },
        tx,
      );

      return request;
    });

    await this.notifications.notifyUser({
      userId: existing.order.userId,
      event: NotificationEvent.REFUND_REQUESTED,
      title: `وضعیت مرجوعی سفارش ${existing.order.code}`,
      body: returnStatusMessage(dto.status, existing.order.request.type, dto.notes),
      meta: {
        orderId: existing.order.id,
        orderCode: existing.order.code,
        returnId: id,
        status: dto.status,
      },
    });

    return { ...updated, ...externalStoreFlags(existing.order.request.type) };
  }

  // ─── Refunds ────────────────────────────────────────────────

  async listRefunds(query: ListReturnsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.RefundWhereInput = q
      ? { order: { code: { contains: q, mode: Prisma.QueryMode.insensitive } } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          order: { select: { id: true, code: true, totalToman: true } },
          processedByAdmin: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return paginated(items, total, args);
  }

  /**
   * Money leaves the business here, so the amount is checked against what is
   * left on the order and the audit row is written inside the same transaction.
   */
  async createRefund(
    returnId: string,
    dto: CreateRefundDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          select: {
            id: true,
            code: true,
            userId: true,
            totalToman: true,
            omrRate: true,
            request: { select: { type: true } },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(FA.RETURN_NOT_FOUND);
    }
    if (request.status !== ReturnStatus.REFUND) {
      throw new ConflictException(FA.RETURN_NOT_REFUNDABLE);
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(TOMAN_SCALE);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(FA.REFUND_AMOUNT_INVALID);
    }

    const already = await this.prisma.refund.aggregate({
      where: { orderId: request.order.id, status: { not: RefundStatus.REJECTED } },
      _sum: { amount: true },
    });
    const refunded = already._sum.amount ?? new Prisma.Decimal(0);
    if (refunded.add(amount).greaterThan(request.order.totalToman)) {
      throw new BadRequestException(FA.REFUND_EXCEEDS_ORDER);
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          returnRequestId: request.id,
          orderId: request.order.id,
          paymentId: dto.paymentId ?? null,
          amount,
          status: RefundStatus.PENDING,
          rateSnapshot: request.order.omrRate,
          note: dto.note ?? null,
          processedByAdminId: admin.id,
        },
      });

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "refund.create",
          entityType: "Refund",
          entityId: created.id,
          newValue: {
            orderCode: request.order.code,
            returnId: request.id,
            amount: amount.toString(),
            previouslyRefunded: refunded.toString(),
            orderTotal: request.order.totalToman.toString(),
            paymentId: dto.paymentId ?? null,
            note: dto.note ?? null,
          },
          context,
        },
        tx,
      );

      return created;
    });

    await this.notifications.notifyUser({
      userId: request.order.userId,
      event: NotificationEvent.REFUND_REQUESTED,
      title: `بازپرداخت سفارش ${request.order.code}`,
      body: `بازپرداخت ${formatToman(Number(amount))} برای سفارش ${request.order.code} ثبت شد و در حال پردازش است.`,
      meta: {
        orderId: request.order.id,
        orderCode: request.order.code,
        refundId: refund.id,
        amount: amount.toString(),
      },
    });

    return { ...refund, ...externalStoreFlags(request.order.request.type) };
  }

  async updateRefundStatus(
    id: string,
    dto: UpdateRefundStatusDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.refund.findUnique({
      where: { id },
      include: { order: { select: { id: true, code: true, status: true, userId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(FA.REFUND_NOT_FOUND);
    }
    if (existing.status === dto.status) {
      return existing;
    }
    if (!REFUND_TRANSITIONS[existing.status].includes(dto.status)) {
      throw new ConflictException(FA.RETURN_INVALID_TRANSITION);
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          processedByAdminId: admin.id,
          ...(dto.status === RefundStatus.COMPLETED ? { processedAt: new Date() } : {}),
        },
      });

      if (dto.status === RefundStatus.COMPLETED) {
        if (existing.paymentId) {
          await tx.paymentTransaction.create({
            data: {
              paymentId: existing.paymentId,
              kind: PaymentTransactionKind.REFUND,
              amount: existing.amount,
              meta: { refundId: id, orderCode: existing.order.code },
            },
          });
        }
        if (canTransitionOrder(existing.order.status, OrderStatus.REFUNDED)) {
          await tx.order.update({
            where: { id: existing.order.id },
            data: { status: OrderStatus.REFUNDED },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: existing.order.id,
              fromStatus: existing.order.status,
              toStatus: OrderStatus.REFUNDED,
              note: `Refund ${id} completed`,
              changedByAdminId: admin.id,
            },
          });
        }
      }

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "refund.status.update",
          entityType: "Refund",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: {
            status: dto.status,
            amount: existing.amount.toString(),
            orderCode: existing.order.code,
            note: dto.note ?? null,
          },
          context,
        },
        tx,
      );

      return updated;
    });

    if (dto.status === RefundStatus.COMPLETED) {
      await this.notifications.notifyUser({
        userId: existing.order.userId,
        event: NotificationEvent.REFUND_REQUESTED,
        title: `بازپرداخت سفارش ${existing.order.code} انجام شد`,
        body: `مبلغ ${formatToman(Number(existing.amount))} بازگردانده شد.`,
        meta: {
          orderId: existing.order.id,
          orderCode: existing.order.code,
          refundId: id,
          amount: existing.amount.toString(),
        },
      });
    }

    return refund;
  }

  // ─── Internals ──────────────────────────────────────────────

  private async requireOrder(idOrCode: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      select: {
        id: true,
        code: true,
        status: true,
        userId: true,
        request: { select: { type: true } },
      },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    return order;
  }

  /** Best effort: the order only moves when the pipeline allows that hop. */
  private async syncOrderStatus(
    tx: Prisma.TransactionClient,
    order: { id: string; status: OrderStatus },
    returnStatus: ReturnStatus,
    adminId: string,
    note?: string | null,
  ): Promise<void> {
    const target = ORDER_STATUS_FOR_RETURN[returnStatus];
    if (!target || target === order.status || !canTransitionOrder(order.status, target)) {
      return;
    }
    await tx.order.update({ where: { id: order.id }, data: { status: target } });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: target,
        note: note ?? `Return ${returnStatus}`,
        changedByAdminId: adminId,
      },
    });
  }
}

/**
 * External-store purchases carry no return guarantee, so every response about
 * them ships the conservative wording the operator must repeat to the customer.
 */
function externalStoreFlags(type: RequestType): {
  externalStore: boolean;
  conservativeMessage: string | null;
} {
  const external = type === RequestType.EXTERNAL_STORE;
  return {
    externalStore: external,
    conservativeMessage: external ? FA.EXTERNAL_STORE_RETURN_WARNING : null,
  };
}

function returnStatusMessage(
  status: ReturnStatus,
  type: RequestType,
  notes?: string | null,
): string {
  const base: Record<ReturnStatus, string> = {
    [ReturnStatus.RETURN_REQUESTED]: "درخواست مرجوعی شما ثبت شد.",
    [ReturnStatus.ADMIN_REVIEW]: "درخواست مرجوعی شما در حال بررسی است.",
    [ReturnStatus.RETURN_APPROVED]: "درخواست مرجوعی شما تأیید شد.",
    [ReturnStatus.RETURN_TO_SELLER]: "کالا برای فروشنده ارسال شد.",
    [ReturnStatus.REFUND]: "پرونده مرجوعی به مرحله بازپرداخت رسید.",
    [ReturnStatus.REJECTED]: "درخواست مرجوعی شما پذیرفته نشد.",
  };
  const parts = [notes?.trim() || base[status]];
  if (type === RequestType.EXTERNAL_STORE) {
    parts.push(FA.EXTERNAL_STORE_RETURN_WARNING);
  }
  return parts.join(" ");
}
