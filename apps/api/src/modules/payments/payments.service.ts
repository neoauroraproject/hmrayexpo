import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Currency,
  NotificationEvent,
  Order,
  OrderCreationMethod,
  OrderStatus,
  Payment,
  PaymentSource,
  PaymentStatus,
  PaymentTransactionKind,
  Prisma,
  QuoteStatus,
} from "@hmray/database";
import { formatToman, generatePaymentId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CustomersService } from "../customers/customers.service";
import { QuotesService } from "../quotes/quotes.service";
import { OrdersService } from "../orders/orders.service";
import type {
  CreateManualPaymentDto,
  CreateQuotePaymentDto,
  ListPaymentsQueryDto,
  RejectPaymentDto,
  UploadReceiptDto,
} from "./dto/payment.dto";

const FINAL_STATUSES: PaymentStatus[] = [
  PaymentStatus.CONFIRMED,
  PaymentStatus.REJECTED,
  PaymentStatus.REFUNDED,
];

/** Telegram ids are BigInt columns; they leave the API as strings. */
export type SerializedPayment = Omit<Payment, "telegramMessageId" | "telegramChatId"> & {
  telegramMessageId: string | null;
  telegramChatId: string | null;
};

interface ConfirmTransactionResult {
  payment: Payment;
  order: Order | null;
  orderCreated: boolean;
  note?: string;
}

export interface ConfirmPaymentResult {
  payment: SerializedPayment;
  order: Order | null;
  orderCreated: boolean;
  note?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly customers: CustomersService,
    private readonly quotes: QuotesService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Customer-submitted payment against an accepted quote. The order is still
   * not created here — only an admin confirming the money does that.
   */
  async createForQuote(
    codeOrToken: string,
    dto: CreateQuotePaymentDto,
    receiptUrl: string | null,
  ) {
    const quote = await this.quotes.expireIfDue(
      await this.quotes.requirePublicQuote(codeOrToken),
    );
    if (quote.status === QuoteStatus.EXPIRED) {
      throw new ConflictException(FA.QUOTE_EXPIRED);
    }
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new ConflictException(FA.QUOTE_NOT_ACCEPTED);
    }

    const method = await this.requireEnabledMethod(dto.methodId);
    const amount = dto.amount ? new Prisma.Decimal(dto.amount) : quote.productsTotal;
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(FA.PAYMENT_AMOUNT_INVALID);
    }

    const source = dto.source === PaymentSource.BOT ? PaymentSource.BOT : PaymentSource.WEB;
    const hasProof = Boolean(receiptUrl || dto.transactionHash);

    const payment = await this.prisma.payment.create({
      data: {
        code: await this.allocatePaymentCode(),
        amount,
        currency: dto.currency ?? Currency.TOMAN,
        status: hasProof ? PaymentStatus.UNDER_REVIEW : PaymentStatus.PENDING,
        source,
        methodId: method.id,
        quoteId: quote.id,
        userId: quote.userId,
        receiptUrl,
        transactionHash: dto.transactionHash ?? null,
        note: dto.note ?? null,
      },
    });

    await this.announceSubmitted(payment, quote.code);
    return this.serialize(payment);
  }

  async uploadReceipt(paymentId: string, dto: UploadReceiptDto, receiptUrl: string) {
    const payment = await this.requirePayment(paymentId);
    if (FINAL_STATUSES.includes(payment.status)) {
      throw new ConflictException(FA.PAYMENT_ALREADY_FINALIZED);
    }
    if (dto.telegramUserId) {
      const user = await this.customers.requireByTelegramId(dto.telegramUserId);
      if (user.id !== payment.userId) {
        throw new NotFoundException(FA.PAYMENT_NOT_FOUND);
      }
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        receiptUrl,
        status: PaymentStatus.UNDER_REVIEW,
        transactionHash: dto.transactionHash ?? payment.transactionHash,
        telegramMessageId: dto.telegramMessageId ? BigInt(dto.telegramMessageId) : null,
        telegramChatId: dto.telegramChatId ? BigInt(dto.telegramChatId) : null,
      },
    });

    await this.notifications.notifyAdmins({
      event: NotificationEvent.PAYMENT_RECEIPT_UPLOADED,
      title: `رسید پرداخت ${updated.code}`,
      body: `رسید پرداخت ${updated.code} بارگذاری شد و در انتظار بررسی است.`,
      meta: { paymentId: updated.id, paymentCode: updated.code, receiptUrl },
    });

    return this.serialize(updated);
  }

  async list(query: ListPaymentsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { transactionHash: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { user: { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { order: { code: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { quote: { code: { contains: q, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          user: { select: { id: true, customerCode: true, displayName: true } },
          method: { select: { id: true, title: true } },
          quote: { select: { id: true, code: true, status: true } },
          order: { select: { id: true, code: true, status: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginated(items.map((item) => this.serialize(item)), total, args);
  }

  /** Cash/offline payment registered by support or an admin. */
  async createManual(
    dto: CreateManualPaymentDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    if (dto.source !== PaymentSource.SUPPORT && dto.source !== PaymentSource.ADMIN) {
      throw new BadRequestException("source must be SUPPORT or ADMIN for manual payments");
    }

    const user = await this.customers.requireByIdOrCode(dto.customer);
    const method = await this.requireEnabledMethod(dto.methodId);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(FA.PAYMENT_AMOUNT_INVALID);
    }

    const payment = await this.prisma.payment.create({
      data: {
        code: await this.allocatePaymentCode(),
        amount,
        currency: dto.currency ?? Currency.TOMAN,
        status: PaymentStatus.UNDER_REVIEW,
        source: dto.source,
        methodId: method.id,
        userId: user.id,
        quoteId: dto.quoteId ?? null,
        orderId: dto.orderId ?? null,
        transactionHash: dto.transactionHash ?? null,
        note: dto.note ?? null,
        receiptUrl: dto.receiptUrl ?? null,
        receivedAt: new Date(),
        receivedByAdminId: admin.id,
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "payment.create.manual",
      entityType: "Payment",
      entityId: payment.id,
      newValue: {
        code: payment.code,
        amount: amount.toString(),
        source: dto.source,
        customer: user.customerCode,
      },
      context,
    });

    return this.serialize(payment);
  }

  /**
   * The gate between "money promised" and "order in fulfillment". Confirming a
   * payment tied to an ACCEPTED quote is the normal way an Order is created.
   */
  async confirm(
    paymentId: string,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ): Promise<ConfirmPaymentResult> {
    const payment = await this.requirePayment(paymentId);
    if (FINAL_STATUSES.includes(payment.status)) {
      throw new ConflictException(FA.PAYMENT_ALREADY_FINALIZED);
    }

    const quote = payment.quoteId
      ? await this.prisma.quote.findUnique({ where: { id: payment.quoteId } })
      : null;
    const existingOrder = payment.orderId
      ? await this.prisma.order.findUnique({ where: { id: payment.orderId } })
      : quote
        ? await this.prisma.order.findUnique({ where: { quoteId: quote.id } })
        : null;

    const canCreateOrder =
      quote !== null && quote.status === QuoteStatus.ACCEPTED && existingOrder === null;

    const result = await this.prisma.$transaction<ConfirmTransactionResult>(async (tx) => {
      const confirmed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedByAdminId: admin.id,
          receivedAt: payment.receivedAt ?? new Date(),
          receivedByAdminId: payment.receivedByAdminId ?? admin.id,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: confirmed.id,
          kind: PaymentTransactionKind.CHARGE,
          amount: confirmed.amount,
          meta: { confirmedBy: admin.username } as Prisma.InputJsonValue,
        },
      });

      let order: Order | null = existingOrder;
      let orderCreated = false;
      let note: string | undefined;

      if (canCreateOrder && quote) {
        order = await this.orders.createFromQuote(tx, {
          quoteId: quote.id,
          status: OrderStatus.PAID,
          creationMethod:
            payment.source === PaymentSource.ADMIN || payment.source === PaymentSource.SUPPORT
              ? OrderCreationMethod.ADMIN_MANUAL
              : OrderCreationMethod.BOT,
          creationReason:
            payment.source === PaymentSource.BOT || payment.source === PaymentSource.WEB
              ? null
              : `Created from ${payment.source} payment ${payment.code}`,
          adminId: admin.id,
          paymentId: confirmed.id,
        });
        orderCreated = true;
      } else if (existingOrder && existingOrder.status === OrderStatus.CONFIRMED) {
        order = await tx.order.update({
          where: { id: existingOrder.id },
          data: { status: OrderStatus.PAID },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: existingOrder.id,
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.PAID,
            note: `Payment ${confirmed.code} confirmed`,
            changedByAdminId: admin.id,
          },
        });
      } else if (!quote) {
        note = "Payment confirmed without a linked quote — no order was created.";
      } else if (quote.status !== QuoteStatus.ACCEPTED) {
        note = `Quote ${quote.code} is ${quote.status}; the customer must accept it before an order can be created.`;
      }

      await this.audit.log(
        {
          actorAdminId: admin.id,
          action: "payment.confirm",
          entityType: "Payment",
          entityId: confirmed.id,
          oldValue: { status: payment.status },
          newValue: {
            status: PaymentStatus.CONFIRMED,
            amount: confirmed.amount.toString(),
            quoteId: payment.quoteId,
            orderId: order?.id ?? null,
            orderCreated,
          },
          context,
        },
        tx,
      );

      return { payment: confirmed, order, orderCreated, note };
    });

    await this.notifications.notifyUser({
      userId: result.payment.userId,
      event: NotificationEvent.PAYMENT_CONFIRMED,
      title: `پرداخت ${result.payment.code} تأیید شد`,
      body: `پرداخت شما به مبلغ ${formatToman(Number(result.payment.amount))} تأیید شد.`,
      meta: {
        paymentId: result.payment.id,
        paymentCode: result.payment.code,
        orderCode: result.order?.code ?? null,
      },
    });

    if (result.orderCreated && result.order) {
      await this.orders.announceNewOrder(result.order);
    }

    return { ...result, payment: this.serialize(result.payment) };
  }

  async reject(
    paymentId: string,
    dto: RejectPaymentDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const payment = await this.requirePayment(paymentId);
    if (FINAL_STATUSES.includes(payment.status)) {
      throw new ConflictException(FA.PAYMENT_ALREADY_FINALIZED);
    }

    const rejected = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REJECTED,
        rejectedReason: dto.reason,
        confirmedByAdminId: admin.id,
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "payment.reject",
      entityType: "Payment",
      entityId: rejected.id,
      oldValue: { status: payment.status },
      newValue: { status: PaymentStatus.REJECTED, reason: dto.reason },
      context,
    });

    await this.notifications.notifyUser({
      userId: rejected.userId,
      event: NotificationEvent.PAYMENT_REJECTED,
      title: `پرداخت ${rejected.code} تأیید نشد`,
      body: `دلیل: ${dto.reason}`,
      meta: { paymentId: rejected.id, paymentCode: rejected.code },
    });

    return this.serialize(rejected);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async requirePayment(idOrCode: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!payment) {
      throw new NotFoundException(FA.PAYMENT_NOT_FOUND);
    }
    return payment;
  }

  private async requireEnabledMethod(methodId: string) {
    const method = await this.prisma.paymentMethod.findUnique({ where: { id: methodId } });
    if (!method) {
      throw new NotFoundException(FA.PAYMENT_METHOD_NOT_FOUND);
    }
    if (!method.enabled) {
      throw new ConflictException(FA.PAYMENT_METHOD_DISABLED);
    }
    return method;
  }

  private allocatePaymentCode(): Promise<string> {
    return uniqueCode(generatePaymentId, async (code) => {
      const found = await this.prisma.payment.findUnique({ where: { code } });
      return found !== null;
    });
  }

  private async announceSubmitted(payment: Payment, quoteCode: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payment.userId },
      select: { customerCode: true },
    });
    await this.notifications.notifyAdmins({
      event: NotificationEvent.PAYMENT_SUBMITTED,
      title: `پرداخت جدید ${payment.code}`,
      body: `مشتری ${user.customerCode} پرداخت ${formatToman(Number(payment.amount))} را برای پیش‌فاکتور ${quoteCode} ثبت کرد.`,
      meta: {
        paymentId: payment.id,
        paymentCode: payment.code,
        quoteCode,
        customerCode: user.customerCode,
        amount: payment.amount.toString(),
        hasReceipt: Boolean(payment.receiptUrl),
      },
    });
  }

  /** BigInt Telegram columns are not JSON-serializable. */
  private serialize<T extends Payment>(payment: T) {
    return {
      ...payment,
      telegramMessageId: payment.telegramMessageId?.toString() ?? null,
      telegramChatId: payment.telegramChatId?.toString() ?? null,
    };
  }
}
