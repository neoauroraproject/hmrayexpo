import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  AdminRole,
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  TicketStatus,
} from "@hmray/database";
import { formatToman } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      requestsByStatus,
      quotesByStatus,
      ordersByStatus,
      paymentsByStatus,
      awaitingReview,
      confirmedTotal,
      openTickets,
      totalCustomers,
      newCustomersToday,
      acceptedAwaitingPayment,
      newSubmittedToday,
    ] = await Promise.all([
      this.prisma.purchaseRequest.groupBy({
        by: ["status"],
        where: { submittedAt: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.payment.count({
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.UNDER_REVIEW] } },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.CONFIRMED },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] } },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      // Accepted quotes with no order yet — the "waiting for money" queue.
      this.prisma.quote.count({ where: { status: QuoteStatus.ACCEPTED, order: null } }),
      this.prisma.purchaseRequest.count({
        where: { submittedAt: { gte: startOfToday } },
      }),
    ]);

    const confirmedRevenue = confirmedTotal._sum.amount ?? null;

    return {
      requests: {
        byStatus: countMap(requestsByStatus),
        newToday: newSubmittedToday,
      },
      quotes: {
        byStatus: countMap(quotesByStatus),
        awaitingPayment: acceptedAwaitingPayment,
      },
      orders: {
        byStatus: countMap(ordersByStatus),
        inFulfillment: sumExcept(ordersByStatus, [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
          OrderStatus.REFUNDED,
        ]),
      },
      payments: {
        byStatus: countMap(paymentsByStatus),
        awaitingReview,
        confirmedTotal: confirmedRevenue?.toString() ?? "0",
        confirmedTotalLabel: formatToman(Number(confirmedRevenue ?? 0)),
      },
      support: { openTickets },
      customers: { total: totalCustomers, newToday: newCustomersToday },
      generatedAt: new Date().toISOString(),
    };
  }
}

interface StatusCount<T extends string> {
  status: T;
  _count: { _all: number };
}

function countMap<T extends string>(rows: Array<StatusCount<T>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.status] = row._count._all;
  }
  return out;
}

function sumExcept<T extends string>(rows: Array<StatusCount<T>>, exclude: T[]): number {
  return rows
    .filter((row) => !exclude.includes(row.status))
    .reduce((total, row) => total + row._count._all, 0);
}
