import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import {
  Currency,
  NotificationEvent,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RequestType,
  TemuBatchStatus,
} from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SettingsService } from "../settings/settings.service";
import type {
  AddBatchOrderDto,
  BatchPurchaseDto,
  CreateBatchDto,
  ListBatchesQueryDto,
  UpdateBatchDto,
} from "./dto/temu-batch.dto";

/** OMR is a 3-decimal currency; the column is Decimal(18,4) for headroom. */
const OMR_SCALE = 4;

/** A batch may only gain or lose orders while it is still being filled. */
const EDITABLE_STATUSES: TemuBatchStatus[] = [TemuBatchStatus.OPEN, TemuBatchStatus.READY];

/** Orders whose money is already committed, so they count towards `currentOmr`. */
const FUNDED_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PURCHASING,
  OrderStatus.PURCHASED,
  OrderStatus.IN_TRANSIT_TO_OMAN,
  OrderStatus.ARRIVED_OMAN,
  OrderStatus.QUALITY_CHECK,
  OrderStatus.READY_FOR_IRAN,
  OrderStatus.SHIPPING_TO_IRAN,
  OrderStatus.ARRIVED_IRAN,
  OrderStatus.DOMESTIC_DELIVERY,
  OrderStatus.DELIVERED,
];

/** Statuses an order may have when it is dropped into a batch. */
const JOINABLE_STATUSES: OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PAID];

function generateBatchCode(): string {
  let digits = "";
  for (let i = 0; i < 5; i += 1) {
    digits += String(randomInt(0, 10));
  }
  return `TB-${digits}`;
}

@Injectable()
export class TemuBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  // ─── Reads ──────────────────────────────────────────────────

  async list(query: ListBatchesQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.TemuBatchWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q ? { code: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.temuBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.temuBatch.count({ where }),
    ]);

    return paginated(
      items.map((batch) => ({ ...batch, progress: progressOf(batch.currentOmr, batch.targetOmr) })),
      total,
      args,
    );
  }

  async get(idOrCode: string) {
    const batch = await this.prisma.temuBatch.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      include: {
        orders: {
          orderBy: { addedAt: "asc" },
          include: {
            order: {
              select: {
                id: true,
                code: true,
                status: true,
                totalToman: true,
                omrRate: true,
                createdAt: true,
                user: { select: { id: true, customerCode: true, displayName: true } },
              },
            },
          },
        },
      },
    });
    if (!batch) {
      throw new NotFoundException(FA.BATCH_NOT_FOUND);
    }

    const fallbackRate = await this.settings.latestRate(Currency.OMR);
    return {
      ...batch,
      progress: progressOf(batch.currentOmr, batch.targetOmr),
      orders: batch.orders.map((link) => ({
        ...link,
        omrAmount: omrEquivalent(
          link.order.totalToman,
          link.order.omrRate ?? fallbackRate,
        )?.toString() ?? null,
        counted: FUNDED_STATUSES.includes(link.order.status),
      })),
    };
  }

  // ─── Writes ─────────────────────────────────────────────────

  async create(dto: CreateBatchDto, admin: AuthenticatedAdmin, context: ClientContext) {
    if (dto.code) {
      const taken = await this.prisma.temuBatch.findUnique({ where: { code: dto.code } });
      if (taken) {
        throw new ConflictException(FA.BATCH_CODE_TAKEN);
      }
    }

    const code =
      dto.code ??
      (await uniqueCode(generateBatchCode, async (candidate) => {
        const found = await this.prisma.temuBatch.findUnique({ where: { code: candidate } });
        return found !== null;
      }));

    const batch = await this.prisma.temuBatch.create({
      data: {
        code,
        targetOmr: new Prisma.Decimal(dto.targetOmr),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        note: dto.note ?? null,
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.create",
      entityType: "TemuBatch",
      entityId: batch.id,
      newValue: { code: batch.code, targetOmr: batch.targetOmr.toString() },
      context,
    });

    return batch;
  }

  async update(
    id: string,
    dto: UpdateBatchDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.requireBatch(id);
    if (dto.status && !canTransitionBatch(existing.status, dto.status)) {
      throw new ConflictException(FA.BATCH_INVALID_STATUS);
    }

    const batch = await this.prisma.temuBatch.update({
      where: { id: existing.id },
      data: {
        ...(dto.targetOmr !== undefined
          ? { targetOmr: new Prisma.Decimal(dto.targetOmr) }
          : {}),
        ...(dto.deadline !== undefined ? { deadline: new Date(dto.deadline) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.update",
      entityType: "TemuBatch",
      entityId: batch.id,
      oldValue: { status: existing.status, targetOmr: existing.targetOmr.toString() },
      newValue: { status: batch.status, targetOmr: batch.targetOmr.toString() },
      context,
    });

    return this.recomputeAndAnnounce(batch.id);
  }

  async remove(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const existing = await this.requireBatch(id);
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException(FA.BATCH_CLOSED);
    }

    const batch = await this.prisma.temuBatch.update({
      where: { id: existing.id },
      data: { status: TemuBatchStatus.CANCELLED },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.cancel",
      entityType: "TemuBatch",
      entityId: batch.id,
      oldValue: { status: existing.status },
      newValue: { status: batch.status },
      context,
    });

    return batch;
  }

  async addOrder(
    id: string,
    dto: AddBatchOrderDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const batch = await this.requireBatch(id);
    if (!EDITABLE_STATUSES.includes(batch.status)) {
      throw new ConflictException(FA.BATCH_CLOSED);
    }

    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: dto.order }, { code: dto.order }] },
      include: { request: { select: { type: true } }, temuBatchOrder: true },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    if (order.request.type !== RequestType.TEMU) {
      throw new ConflictException(FA.BATCH_ORDER_NOT_TEMU);
    }
    if (!JOINABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(FA.BATCH_ORDER_NOT_PAYABLE);
    }
    if (order.temuBatchOrder) {
      throw new ConflictException(FA.BATCH_ORDER_ALREADY_LINKED);
    }

    await this.prisma.temuBatchOrder.create({
      data: { batchId: batch.id, orderId: order.id },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.order.add",
      entityType: "TemuBatch",
      entityId: batch.id,
      newValue: { orderId: order.id, orderCode: order.code, orderStatus: order.status },
      context,
    });

    return this.recomputeAndAnnounce(batch.id);
  }

  async removeOrder(
    id: string,
    orderId: string,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const batch = await this.requireBatch(id);
    if (!EDITABLE_STATUSES.includes(batch.status)) {
      throw new ConflictException(FA.BATCH_CLOSED);
    }

    const link = await this.prisma.temuBatchOrder.findFirst({
      where: { batchId: batch.id, OR: [{ orderId }, { order: { code: orderId } }] },
      include: { order: { select: { code: true } } },
    });
    if (!link) {
      throw new NotFoundException(FA.BATCH_ORDER_NOT_LINKED);
    }

    await this.prisma.temuBatchOrder.delete({ where: { id: link.id } });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.order.remove",
      entityType: "TemuBatch",
      entityId: batch.id,
      oldValue: { orderId: link.orderId, orderCode: link.order.code },
      context,
    });

    return this.recomputeAndAnnounce(batch.id);
  }

  /**
   * Opens the supplier purchase for the whole batch. Orders with no CONFIRMED
   * payment are skipped rather than purchased — the same rule `OrdersService`
   * enforces one order at a time.
   */
  async startPurchase(
    id: string,
    dto: BatchPurchaseDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const batch = await this.requireBatch(id);
    if (!EDITABLE_STATUSES.includes(batch.status)) {
      throw new ConflictException(FA.BATCH_INVALID_STATUS);
    }

    const links = await this.prisma.temuBatchOrder.findMany({
      where: { batchId: batch.id },
      include: { order: { select: { id: true, code: true, status: true, quoteId: true } } },
    });

    const moved: string[] = [];
    const skipped: Array<{ code: string; reason: string }> = [];

    for (const link of links) {
      const order = link.order;
      if (order.status === OrderStatus.PURCHASING || order.status === OrderStatus.PURCHASED) {
        continue;
      }
      if (order.status !== OrderStatus.PAID) {
        skipped.push({ code: order.code, reason: `status:${order.status}` });
        continue;
      }
      const paid = await this.prisma.payment.count({
        where: {
          status: PaymentStatus.CONFIRMED,
          OR: [{ orderId: order.id }, { quoteId: order.quoteId }],
        },
      });
      if (paid === 0) {
        skipped.push({ code: order.code, reason: "no_confirmed_payment" });
        continue;
      }
      await this.moveOrder(order.id, order.status, OrderStatus.PURCHASING, admin.id, dto.note);
      moved.push(order.code);
    }

    const updated = await this.prisma.temuBatch.update({
      where: { id: batch.id },
      data: { status: TemuBatchStatus.PURCHASING },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.purchase.start",
      entityType: "TemuBatch",
      entityId: batch.id,
      oldValue: { status: batch.status },
      newValue: {
        status: updated.status,
        currentOmr: updated.currentOmr.toString(),
        targetOmr: updated.targetOmr.toString(),
        moved,
        skipped,
        note: dto.note ?? null,
      },
      context,
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.TEMU_BATCH_READY,
      title: `خرید بسته ${batch.code} آغاز شد`,
      body: `خرید ${moved.length} سفارش از بسته ${batch.code} در حال انجام است.`,
      meta: { batchId: batch.id, batchCode: batch.code, moved: moved.length, skipped: skipped.length },
    });

    return { batch: updated, moved, skipped };
  }

  /** Closes the supplier purchase: PURCHASING → PURCHASED for the batch and its orders. */
  async completePurchase(
    id: string,
    dto: BatchPurchaseDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const batch = await this.requireBatch(id);
    if (batch.status !== TemuBatchStatus.PURCHASING) {
      throw new ConflictException(FA.BATCH_INVALID_STATUS);
    }

    const links = await this.prisma.temuBatchOrder.findMany({
      where: { batchId: batch.id },
      include: {
        order: { select: { id: true, code: true, status: true, userId: true } },
      },
    });

    const moved: string[] = [];
    for (const link of links) {
      if (link.order.status !== OrderStatus.PURCHASING) {
        continue;
      }
      await this.moveOrder(
        link.order.id,
        link.order.status,
        OrderStatus.PURCHASED,
        admin.id,
        dto.note,
      );
      moved.push(link.order.code);
      await this.notifications.notifyUser({
        userId: link.order.userId,
        event: NotificationEvent.TEMU_BATCH_READY,
        title: `سفارش ${link.order.code} خریداری شد`,
        body: `سفارش شما از فروشنده خریداری شد و به‌زودی به عمان ارسال می‌شود.`,
        meta: { orderId: link.order.id, orderCode: link.order.code, batchCode: batch.code },
      });
    }

    const updated = await this.prisma.temuBatch.update({
      where: { id: batch.id },
      data: { status: TemuBatchStatus.PURCHASED, purchasedAt: new Date() },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "temu_batch.purchase.complete",
      entityType: "TemuBatch",
      entityId: batch.id,
      oldValue: { status: batch.status },
      newValue: {
        status: updated.status,
        currentOmr: updated.currentOmr.toString(),
        moved,
        note: dto.note ?? null,
      },
      context,
    });

    return { batch: updated, moved };
  }

  // ─── Internals ──────────────────────────────────────────────

  private async requireBatch(idOrCode: string) {
    const batch = await this.prisma.temuBatch.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!batch) {
      throw new NotFoundException(FA.BATCH_NOT_FOUND);
    }
    return batch;
  }

  private async moveOrder(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    adminId: string,
    note?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: to } });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: from,
          toStatus: to,
          note: note ?? "Temu batch purchase",
          changedByAdminId: adminId,
        },
      });
    });
  }

  /**
   * Recomputes `currentOmr` from the funded orders and flips OPEN → READY once
   * the target is met, announcing it to admins exactly once per crossing.
   */
  private async recomputeAndAnnounce(batchId: string) {
    const [batch, links, fallbackRate] = await Promise.all([
      this.prisma.temuBatch.findUniqueOrThrow({ where: { id: batchId } }),
      this.prisma.temuBatchOrder.findMany({
        where: { batchId },
        include: { order: { select: { status: true, totalToman: true, omrRate: true } } },
      }),
      this.settings.latestRate(Currency.OMR),
    ]);

    let sum = new Prisma.Decimal(0);
    for (const link of links) {
      if (!FUNDED_STATUSES.includes(link.order.status)) {
        continue;
      }
      const amount = omrEquivalent(link.order.totalToman, link.order.omrRate ?? fallbackRate);
      if (amount) {
        sum = sum.add(amount);
      }
    }
    const currentOmr = sum.toDecimalPlaces(OMR_SCALE);

    const reachedTarget =
      batch.status === TemuBatchStatus.OPEN && currentOmr.greaterThanOrEqualTo(batch.targetOmr);

    const updated = await this.prisma.temuBatch.update({
      where: { id: batchId },
      data: {
        currentOmr,
        ...(reachedTarget ? { status: TemuBatchStatus.READY } : {}),
      },
    });

    if (reachedTarget) {
      await this.notifications.notifyAdmins({
        event: NotificationEvent.TEMU_BATCH_READY,
        title: `بسته ${updated.code} به حد نصاب رسید`,
        body: `مجموع بسته ${updated.code} به ${currentOmr.toString()} ریال عمان رسید و آماده خرید است.`,
        meta: {
          batchId: updated.id,
          batchCode: updated.code,
          currentOmr: currentOmr.toString(),
          targetOmr: updated.targetOmr.toString(),
        },
      });
    }

    return { ...updated, progress: progressOf(updated.currentOmr, updated.targetOmr) };
  }
}

/** Toman total back to OMR using the rate frozen on the order. */
function omrEquivalent(
  totalToman: Prisma.Decimal,
  rate: Prisma.Decimal | null,
): Prisma.Decimal | null {
  if (!rate || rate.isZero()) {
    return null;
  }
  return totalToman.div(rate).toDecimalPlaces(OMR_SCALE);
}

function progressOf(current: Prisma.Decimal, target: Prisma.Decimal): number {
  if (target.isZero()) {
    return 0;
  }
  return Math.min(100, Math.round(current.div(target).times(100).toNumber()));
}

const BATCH_TRANSITIONS: Record<TemuBatchStatus, TemuBatchStatus[]> = {
  [TemuBatchStatus.OPEN]: [TemuBatchStatus.READY, TemuBatchStatus.CANCELLED],
  [TemuBatchStatus.READY]: [
    TemuBatchStatus.OPEN,
    TemuBatchStatus.PURCHASING,
    TemuBatchStatus.CANCELLED,
  ],
  [TemuBatchStatus.PURCHASING]: [TemuBatchStatus.PURCHASED, TemuBatchStatus.CANCELLED],
  [TemuBatchStatus.PURCHASED]: [],
  [TemuBatchStatus.CANCELLED]: [],
};

function canTransitionBatch(from: TemuBatchStatus, to: TemuBatchStatus): boolean {
  return from === to || BATCH_TRANSITIONS[from].includes(to);
}
