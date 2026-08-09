import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationEvent, Prisma, ShipmentStatus } from "@hmray/database";
import { formatToman } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { TOMAN_SCALE } from "../../common/utils/money";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  CreateShipmentDto,
  CreateShippingMethodDto,
  CreateTrackingEventDto,
  UpdateShipmentDto,
  UpdateShippingMethodDto,
  UpdateTrackingEventDto,
  UpsertShippingRateDto,
} from "./dto/shipping.dto";

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Methods & rates ────────────────────────────────────────

  listMethods(includeDisabled: boolean) {
    return this.prisma.shippingMethod.findMany({
      where: includeDisabled ? {} : { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { rates: { orderBy: { minKg: "asc" } } },
    });
  }

  async createMethod(
    dto: CreateShippingMethodDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const method = await this.prisma.shippingMethod.create({
      data: {
        title: dto.title,
        carrier: dto.carrier ?? null,
        isDomestic: dto.isDomestic ?? true,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_method.create",
      entityType: "ShippingMethod",
      entityId: method.id,
      newValue: method,
      context,
    });
    return method;
  }

  async updateMethod(
    id: string,
    dto: UpdateShippingMethodDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.SHIPPING_METHOD_NOT_FOUND);
    }
    const method = await this.prisma.shippingMethod.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.carrier !== undefined ? { carrier: dto.carrier } : {}),
        ...(dto.isDomestic !== undefined ? { isDomestic: dto.isDomestic } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_method.update",
      entityType: "ShippingMethod",
      entityId: id,
      oldValue: existing,
      newValue: method,
      context,
    });
    return method;
  }

  /** Soft delete: shipments keep pointing at the method they were priced with. */
  async disableMethod(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const existing = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.SHIPPING_METHOD_NOT_FOUND);
    }
    const method = await this.prisma.shippingMethod.update({
      where: { id },
      data: { enabled: false },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_method.disable",
      entityType: "ShippingMethod",
      entityId: id,
      oldValue: existing,
      newValue: method,
      context,
    });
    return method;
  }

  async listRates(methodId: string) {
    const method = await this.prisma.shippingMethod.findUnique({ where: { id: methodId } });
    if (!method) {
      throw new NotFoundException(FA.SHIPPING_METHOD_NOT_FOUND);
    }
    return this.prisma.shippingRate.findMany({
      where: { methodId },
      orderBy: { minKg: "asc" },
    });
  }

  async createRate(
    methodId: string,
    dto: UpsertShippingRateDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const method = await this.prisma.shippingMethod.findUnique({ where: { id: methodId } });
    if (!method) {
      throw new NotFoundException(FA.SHIPPING_METHOD_NOT_FOUND);
    }
    const data = rateData(dto);
    const rate = await this.prisma.shippingRate.create({ data: { methodId, ...data } });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_rate.create",
      entityType: "ShippingRate",
      entityId: rate.id,
      newValue: rate,
      context,
    });
    return rate;
  }

  async updateRate(
    id: string,
    dto: UpsertShippingRateDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.SHIPPING_RATE_NOT_FOUND);
    }
    const rate = await this.prisma.shippingRate.update({ where: { id }, data: rateData(dto) });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_rate.update",
      entityType: "ShippingRate",
      entityId: id,
      oldValue: existing,
      newValue: rate,
      context,
    });
    return rate;
  }

  async deleteRate(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const existing = await this.prisma.shippingRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.SHIPPING_RATE_NOT_FOUND);
    }
    await this.prisma.shippingRate.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipping_rate.delete",
      entityType: "ShippingRate",
      entityId: id,
      oldValue: existing,
      context,
    });
    return { deleted: true };
  }

  /** Price for a weight on a method, following the bracket that contains it. */
  async quote(methodId: string, weightKg: Prisma.Decimal): Promise<Prisma.Decimal> {
    const rates = await this.prisma.shippingRate.findMany({
      where: { methodId },
      orderBy: { minKg: "asc" },
    });
    const bracket = rates.find(
      (rate) =>
        weightKg.greaterThanOrEqualTo(rate.minKg) && weightKg.lessThanOrEqualTo(rate.maxKg),
    );
    if (!bracket) {
      throw new BadRequestException(FA.SHIPPING_RATE_MISSING);
    }

    if (bracket.priceToman) {
      return bracket.priceToman.toDecimalPlaces(TOMAN_SCALE);
    }
    if (bracket.pricePerKg) {
      const computed = bracket.pricePerKg.mul(weightKg);
      const floor = bracket.minCharge ?? new Prisma.Decimal(0);
      return (computed.greaterThan(floor) ? computed : floor).toDecimalPlaces(TOMAN_SCALE);
    }
    throw new BadRequestException(FA.SHIPPING_RATE_MISSING);
  }

  // ─── Shipments ──────────────────────────────────────────────

  async getShipment(orderIdOrCode: string) {
    const order = await this.requireOrder(orderIdOrCode);
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId: order.id },
      include: {
        shippingMethod: true,
        address: true,
        trackingEvents: { orderBy: { occurredAt: "desc" } },
      },
    });
    if (!shipment) {
      throw new NotFoundException(FA.SHIPMENT_NOT_FOUND);
    }
    return shipment;
  }

  /**
   * Creates or replaces the shipment for an order. The cost comes from the
   * weight brackets unless the admin passes an explicit override.
   */
  async upsertShipment(
    orderIdOrCode: string,
    dto: CreateShipmentDto | UpdateShipmentDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const order = await this.requireOrder(orderIdOrCode);
    const existing = await this.prisma.shipment.findUnique({ where: { orderId: order.id } });

    const weight =
      dto.actualWeightKg !== undefined
        ? new Prisma.Decimal(dto.actualWeightKg)
        : existing?.actualWeightKg ?? null;
    const methodId = dto.shippingMethodId ?? existing?.shippingMethodId ?? null;

    let shippingCost: Prisma.Decimal | null = existing?.shippingCost ?? null;
    if (dto.shippingCost !== undefined) {
      shippingCost = new Prisma.Decimal(dto.shippingCost).toDecimalPlaces(TOMAN_SCALE);
    } else if (methodId && weight) {
      shippingCost = await this.quote(methodId, weight);
    }

    const patch = dto as UpdateShipmentDto;
    const data = {
      status: dto.status ?? existing?.status ?? ShipmentStatus.PENDING,
      actualWeightKg: weight,
      shippingCost,
      shippingMethodId: methodId,
      addressId: dto.addressId ?? existing?.addressId ?? (await this.defaultAddressId(order.userId)),
      domesticMethod: dto.domesticMethod ?? existing?.domesticMethod ?? null,
      ...(patch.shippedAt ? { shippedAt: new Date(patch.shippedAt) } : {}),
      ...(patch.deliveredAt ? { deliveredAt: new Date(patch.deliveredAt) } : {}),
    };

    const shipment = existing
      ? await this.prisma.shipment.update({ where: { id: existing.id }, data })
      : await this.prisma.shipment.create({ data: { orderId: order.id, ...data } });

    await this.audit.log({
      actorAdminId: admin.id,
      action: existing ? "shipment.update" : "shipment.create",
      entityType: "Shipment",
      entityId: shipment.id,
      oldValue: existing
        ? {
            status: existing.status,
            actualWeightKg: existing.actualWeightKg?.toString() ?? null,
            shippingCost: existing.shippingCost?.toString() ?? null,
          }
        : null,
      newValue: {
        orderCode: order.code,
        status: shipment.status,
        actualWeightKg: shipment.actualWeightKg?.toString() ?? null,
        shippingCost: shipment.shippingCost?.toString() ?? null,
        shippingMethodId: shipment.shippingMethodId,
      },
      context,
    });

    if (dto.notifyCustomer !== false) {
      await this.notifications.notifyUser({
        userId: order.userId,
        event: NotificationEvent.ORDER_READY,
        title: `مرسوله سفارش ${order.code}`,
        body: shipment.shippingCost
          ? `وزن نهایی ${shipment.actualWeightKg?.toString() ?? "-"} کیلوگرم و هزینه ارسال ${formatToman(
              Number(shipment.shippingCost),
            )} ثبت شد.`
          : `اطلاعات ارسال سفارش شما به‌روزرسانی شد.`,
        meta: {
          orderId: order.id,
          orderCode: order.code,
          shipmentId: shipment.id,
          shippingCost: shipment.shippingCost?.toString() ?? null,
        },
      });
    }

    return shipment;
  }

  // ─── Tracking ───────────────────────────────────────────────

  async addTrackingEvent(
    orderIdOrCode: string,
    dto: CreateTrackingEventDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const order = await this.requireOrder(orderIdOrCode);
    const shipment = await this.prisma.shipment.findUnique({ where: { orderId: order.id } });
    if (!shipment) {
      throw new NotFoundException(FA.SHIPMENT_NOT_FOUND);
    }

    const event = await this.prisma.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        leg: dto.leg,
        trackingNumber: dto.trackingNumber ?? null,
        note: dto.note ?? null,
        ...(dto.occurredAt ? { occurredAt: new Date(dto.occurredAt) } : {}),
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipment.tracking.add",
      entityType: "Shipment",
      entityId: shipment.id,
      newValue: { orderCode: order.code, leg: event.leg, trackingNumber: event.trackingNumber },
      context,
    });

    await this.notifications.notifyUser({
      userId: order.userId,
      event: NotificationEvent.ORDER_READY,
      title: `رهگیری سفارش ${order.code}`,
      body: event.trackingNumber
        ? `کد رهگیری مرحله ${event.leg}: ${event.trackingNumber}`
        : event.note ?? `مرحله ${event.leg} ثبت شد.`,
      meta: { orderId: order.id, orderCode: order.code, leg: event.leg },
    });

    return event;
  }

  async updateTrackingEvent(
    id: string,
    dto: UpdateTrackingEventDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.prisma.trackingEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.TRACKING_EVENT_NOT_FOUND);
    }
    const event = await this.prisma.trackingEvent.update({
      where: { id },
      data: {
        ...(dto.leg !== undefined ? { leg: dto.leg } : {}),
        ...(dto.trackingNumber !== undefined ? { trackingNumber: dto.trackingNumber } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipment.tracking.update",
      entityType: "TrackingEvent",
      entityId: id,
      oldValue: existing,
      newValue: event,
      context,
    });
    return event;
  }

  async deleteTrackingEvent(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const existing = await this.prisma.trackingEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.TRACKING_EVENT_NOT_FOUND);
    }
    await this.prisma.trackingEvent.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "shipment.tracking.delete",
      entityType: "TrackingEvent",
      entityId: id,
      oldValue: existing,
      context,
    });
    return { deleted: true };
  }

  // ─── Internals ──────────────────────────────────────────────

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

  private async defaultAddressId(userId: string): Promise<string | null> {
    const address = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    return address?.id ?? null;
  }
}

function rateData(dto: UpsertShippingRateDto) {
  const minKg = new Prisma.Decimal(dto.minKg);
  const maxKg = new Prisma.Decimal(dto.maxKg);
  if (maxKg.lessThan(minKg)) {
    throw new BadRequestException(FA.SHIPPING_RATE_RANGE_INVALID);
  }
  if (dto.priceToman === undefined && dto.pricePerKg === undefined) {
    throw new BadRequestException(FA.SHIPPING_RATE_PRICE_REQUIRED);
  }
  return {
    minKg,
    maxKg,
    priceToman: dto.priceToman !== undefined ? new Prisma.Decimal(dto.priceToman) : null,
    pricePerKg: dto.pricePerKg !== undefined ? new Prisma.Decimal(dto.pricePerKg) : null,
    minCharge: dto.minCharge !== undefined ? new Prisma.Decimal(dto.minCharge) : null,
  };
}
