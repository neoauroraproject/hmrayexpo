import { Injectable } from "@nestjs/common";
import {
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RefundStatus,
  RequestStatus,
} from "@hmray/database";
import { formatToman } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AnalyticsRangeDto } from "./dto/analytics.dto";

const DEFAULT_WINDOW_DAYS = 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(range: AnalyticsRangeDto) {
    const { from, to } = resolveRange(range);
    const window = { gte: from, lt: to };

    const [
      users,
      requests,
      quotes,
      quotesAccepted,
      orders,
      ordersCancelled,
      requestsExpired,
      quotesExpired,
      sales,
      refunds,
      refundsCompleted,
    ] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: window } }),
      this.prisma.purchaseRequest.count({ where: { createdAt: window } }),
      this.prisma.quote.count({ where: { createdAt: window } }),
      this.prisma.quote.count({
        where: { createdAt: window, status: QuoteStatus.ACCEPTED },
      }),
      this.prisma.order.count({ where: { createdAt: window } }),
      this.prisma.order.count({
        where: { createdAt: window, status: OrderStatus.CANCELLED },
      }),
      this.prisma.purchaseRequest.count({
        where: { createdAt: window, status: RequestStatus.EXPIRED },
      }),
      this.prisma.quote.count({ where: { createdAt: window, status: QuoteStatus.EXPIRED } }),
      this.prisma.payment.aggregate({
        where: { createdAt: window, status: PaymentStatus.CONFIRMED },
        _sum: { amount: true },
      }),
      this.prisma.refund.aggregate({
        where: { createdAt: window, status: { not: RefundStatus.REJECTED } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.refund.aggregate({
        where: { createdAt: window, status: RefundStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const salesSum = sales._sum.amount ?? null;
    const refundsSum = refunds._sum.amount ?? null;
    const refundsCompletedSum = refundsCompleted._sum.amount ?? null;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      users: { created: users },
      requests: { created: requests, expired: requestsExpired },
      quotes: {
        created: quotes,
        accepted: quotesAccepted,
        expired: quotesExpired,
        /** Accepted ÷ created, as a percentage of the quotes issued in the window. */
        conversionRate: percentage(quotesAccepted, quotes),
      },
      orders: {
        created: orders,
        cancelled: ordersCancelled,
        /** Orders ÷ accepted quotes — how many acceptances actually became orders. */
        fromQuoteRate: percentage(orders, quotesAccepted),
      },
      sales: {
        total: salesSum?.toString() ?? "0",
        totalLabel: formatToman(Number(salesSum ?? 0)),
      },
      refunds: {
        count: refunds._count._all,
        total: refundsSum?.toString() ?? "0",
        totalLabel: formatToman(Number(refundsSum ?? 0)),
        completedTotal: refundsCompletedSum?.toString() ?? "0",
        completedTotalLabel: formatToman(Number(refundsCompletedSum ?? 0)),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

function resolveRange(range: AnalyticsRangeDto): { from: Date; to: Date } {
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from
    ? new Date(range.from)
    : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return from <= to ? { from, to } : { from: to, to: from };
}

function percentage(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 1000) / 10;
}
