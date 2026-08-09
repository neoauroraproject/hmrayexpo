import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { AdminRole, Prisma } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q: string;
}

const TAKE = 10;
const insensitive = Prisma.QueryMode.insensitive;

@Controller("admin/search")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One box that resolves anything an operator might paste: order/request/quote/
   * payment codes, customer codes, Telegram usernames or numeric ids, phone
   * numbers, and per-item product codes.
   */
  @Get()
  async search(@Query() query: SearchQueryDto) {
    const q = query.q.trim();
    const telegramId = /^\d{5,}$/.test(q) ? BigInt(q) : null;
    const handle = q.replace(/^@/, "");

    const [customers, requests, quotes, orders, payments, items] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { customerCode: { contains: q, mode: insensitive } },
            { displayName: { contains: q, mode: insensitive } },
            { phone: { contains: q } },
            { telegramAccount: { username: { contains: handle, mode: insensitive } } },
            ...(telegramId ? [{ telegramAccount: { telegramUserId: telegramId } }] : []),
          ],
        },
        take: TAKE,
        include: { telegramAccount: { select: { username: true, telegramUserId: true } } },
      }),
      this.prisma.purchaseRequest.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: insensitive } },
            { items: { some: { productCode: { contains: q, mode: insensitive } } } },
          ],
        },
        take: TAKE,
        include: { user: { select: { customerCode: true } } },
      }),
      this.prisma.quote.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: insensitive } },
            { publicToken: q },
            { items: { some: { productCode: { contains: q, mode: insensitive } } } },
          ],
        },
        take: TAKE,
        include: { user: { select: { customerCode: true } } },
      }),
      this.prisma.order.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: insensitive } },
            { items: { some: { productCode: { contains: q, mode: insensitive } } } },
          ],
        },
        take: TAKE,
        include: { user: { select: { customerCode: true } } },
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: insensitive } },
            { transactionHash: { contains: q, mode: insensitive } },
          ],
        },
        take: TAKE,
        include: { user: { select: { customerCode: true } } },
      }),
      this.prisma.requestItem.findMany({
        where: { productCode: { contains: q, mode: insensitive } },
        take: TAKE,
        include: { request: { select: { code: true, userId: true } } },
      }),
    ]);

    return {
      query: q,
      customers: customers.map((customer) => ({
        id: customer.id,
        customerCode: customer.customerCode,
        displayName: customer.displayName,
        phone: customer.phone,
        username: customer.telegramAccount?.username ?? null,
        telegramUserId: customer.telegramAccount?.telegramUserId?.toString() ?? null,
      })),
      requests: requests.map((request) => ({
        id: request.id,
        code: request.code,
        status: request.status,
        type: request.type,
        customerCode: request.user.customerCode,
      })),
      quotes: quotes.map((quote) => ({
        id: quote.id,
        code: quote.code,
        status: quote.status,
        customerCode: quote.user.customerCode,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        code: order.code,
        status: order.status,
        customerCode: order.user.customerCode,
        totalToman: order.totalToman.toString(),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        code: payment.code,
        status: payment.status,
        amount: payment.amount.toString(),
        customerCode: payment.user.customerCode,
      })),
      productCodes: items.map((item) => ({
        id: item.id,
        productCode: item.productCode,
        requestCode: item.request.code,
        status: item.status,
      })),
    };
  }
}
