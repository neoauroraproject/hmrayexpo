import { Injectable, NotFoundException } from "@nestjs/common";
import { NoteVisibility, NotificationEvent, QualityCheckStatus } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  CreateQualityCheckDto,
  QualityResponseDto,
  UpdateQualityCheckDto,
} from "./dto/quality.dto";

/** Statuses the customer must hear about before the parcel moves on. */
const ALERTING_STATUSES: QualityCheckStatus[] = [
  QualityCheckStatus.FAILED,
  QualityCheckStatus.NEEDS_REVIEW,
];

@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(orderIdOrCode: string) {
    const order = await this.requireOrder(orderIdOrCode);
    return this.prisma.qualityCheck.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      include: { checkedByAdmin: { select: { id: true, displayName: true } } },
    });
  }

  async create(
    orderIdOrCode: string,
    dto: CreateQualityCheckDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const order = await this.requireOrder(orderIdOrCode);
    const status = dto.status ?? QualityCheckStatus.PENDING;

    const check = await this.prisma.qualityCheck.create({
      data: {
        orderId: order.id,
        status,
        notes: dto.notes ?? null,
        mediaUrls: dto.mediaUrls ?? [],
        checkedByAdminId: admin.id,
        checkedAt: status === QualityCheckStatus.PENDING ? null : new Date(),
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "quality_check.create",
      entityType: "QualityCheck",
      entityId: check.id,
      newValue: {
        orderCode: order.code,
        status: check.status,
        mediaCount: check.mediaUrls.length,
      },
      context,
    });

    await this.maybeNotify(order, check.id, status, dto);
    return check;
  }

  async update(
    id: string,
    dto: UpdateQualityCheckDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.qualityCheck.findUnique({
      where: { id },
      include: { order: { select: { id: true, code: true, userId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(FA.QUALITY_CHECK_NOT_FOUND);
    }

    const status = dto.status ?? existing.status;
    const check = await this.prisma.qualityCheck.update({
      where: { id },
      data: {
        status,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.mediaUrls !== undefined ? { mediaUrls: dto.mediaUrls } : {}),
        checkedByAdminId: admin.id,
        ...(status !== QualityCheckStatus.PENDING ? { checkedAt: new Date() } : {}),
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "quality_check.update",
      entityType: "QualityCheck",
      entityId: id,
      oldValue: { status: existing.status, notes: existing.notes },
      newValue: { status: check.status, notes: check.notes },
      context,
    });

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.maybeNotify(existing.order, check.id, status, dto);
    }
    return check;
  }

  /**
   * Customer verdict on a quality report, reachable from the public order page.
   * It records the answer and pings admins — the actual return still goes
   * through `ReturnsModule` so nothing is promised automatically.
   */
  async respond(orderCode: string, checkId: string, dto: QualityResponseDto) {
    const check = await this.prisma.qualityCheck.findFirst({
      where: { id: checkId, order: { code: orderCode } },
      include: { order: { select: { id: true, code: true, userId: true } } },
    });
    if (!check) {
      throw new NotFoundException(FA.QUALITY_CHECK_NOT_FOUND);
    }

    await this.prisma.entityNote.create({
      data: {
        entityType: "QualityCheck",
        entityId: check.id,
        visibility: NoteVisibility.CUSTOMER,
        body: `پاسخ مشتری: ${dto.decision === "ACCEPT" ? "تأیید ادامه ارسال" : "درخواست مرجوعی"}${
          dto.note ? ` — ${dto.note}` : ""
        }`,
      },
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.QUALITY_ISSUE,
      title: `پاسخ مشتری به بازرسی ${check.order.code}`,
      body:
        dto.decision === "ACCEPT"
          ? `مشتری ادامه ارسال سفارش ${check.order.code} را تأیید کرد.`
          : `مشتری برای سفارش ${check.order.code} درخواست مرجوعی داد.`,
      meta: {
        orderId: check.order.id,
        orderCode: check.order.code,
        qualityCheckId: check.id,
        decision: dto.decision,
      },
    });

    return { recorded: true, decision: dto.decision };
  }

  /** Customer-visible quality reports for the public order page. */
  async publicList(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { code: orderCode },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    const checks = await this.prisma.qualityCheck.findMany({
      where: { orderId: order.id, status: { not: QualityCheckStatus.PENDING } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        notes: true,
        mediaUrls: true,
        checkedAt: true,
        createdAt: true,
      },
    });
    return checks;
  }

  private async maybeNotify(
    order: { id: string; code: string; userId: string },
    checkId: string,
    status: QualityCheckStatus,
    dto: CreateQualityCheckDto,
  ): Promise<void> {
    const shouldNotify = dto.notifyCustomer ?? ALERTING_STATUSES.includes(status);
    if (!shouldNotify) {
      return;
    }
    await this.notifications.notifyUser({
      userId: order.userId,
      event: NotificationEvent.QUALITY_ISSUE,
      title: `گزارش بازرسی سفارش ${order.code}`,
      body:
        dto.notes ??
        `نتیجه بازرسی کالای سفارش ${order.code} ثبت شد. لطفاً جزئیات را در صفحه سفارش ببینید.`,
      meta: {
        orderId: order.id,
        orderCode: order.code,
        qualityCheckId: checkId,
        status,
        mediaUrls: dto.mediaUrls ?? [],
      },
    });
  }

  private async requireOrder(idOrCode: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      select: { id: true, code: true, userId: true },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    return order;
  }
}
