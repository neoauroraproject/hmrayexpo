import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  NotificationEvent,
  Prisma,
  SupportTicket,
  TicketStatus,
} from "@hmray/database";
import { generateTicketId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { uniqueCode } from "../../common/utils/identifiers";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import { CustomersService } from "../customers/customers.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  CreateAdminMessageDto,
  CreateAdminTicketDto,
  CreateBotTicketDto,
  CreateBotTicketMessageDto,
  ListTicketsQueryDto,
} from "./dto/support.dto";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationsService,
  ) {}

  async createFromBot(dto: CreateBotTicketDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const orderId = dto.order ? await this.resolveOrderId(dto.order, user.id) : null;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        code: await this.allocateTicketCode(),
        userId: user.id,
        orderId,
        subject: dto.subject ?? null,
        status: TicketStatus.OPEN,
        lastMessageAt: new Date(),
        messages: { create: { body: dto.body, fromAdmin: false } },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    await this.notifyAdmins(ticket, user.customerCode, dto.body);
    return ticket;
  }

  async addBotMessage(ticketId: string, dto: CreateBotTicketMessageDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const ticket = await this.requireTicket(ticketId);
    if (ticket.userId !== user.id) {
      throw new NotFoundException(FA.TICKET_NOT_FOUND);
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException(FA.TICKET_CLOSED);
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        body: dto.body,
        fromAdmin: false,
        attachmentUrl: dto.attachmentUrl ?? null,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { lastMessageAt: new Date(), status: TicketStatus.OPEN },
    });

    await this.notifyAdmins(ticket, user.customerCode, dto.body);
    return message;
  }

  async listForBot(telegramUserId: string, page?: number, pageSize?: number) {
    const user = await this.customers.requireByTelegramId(telegramUserId);
    const args = pageArgs(page, pageSize);
    const where: Prisma.SupportTicketWhereInput = { userId: user.id };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          order: { select: { code: true, status: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return paginated(
      items.map((ticket) => ({
        ...ticket,
        messages: ticket.messages.map(stripTelegramId),
      })),
      total,
      args,
    );
  }

  async list(query: ListTicketsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { subject: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { user: { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { order: { code: { contains: q, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        skip: args.skip,
        take: args.take,
        include: {
          user: { select: { id: true, customerCode: true, displayName: true } },
          order: { select: { id: true, code: true, status: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return paginated(items, total, args);
  }

  async get(idOrCode: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      include: {
        user: { select: { id: true, customerCode: true, displayName: true } },
        order: { select: { id: true, code: true, status: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { admin: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException(FA.TICKET_NOT_FOUND);
    }
    return { ...ticket, messages: ticket.messages.map(stripTelegramId) };
  }

  async createFromAdmin(dto: CreateAdminTicketDto, adminId: string) {
    const user = await this.customers.requireByIdOrCode(dto.customer);
    const orderId = dto.order ? await this.resolveOrderId(dto.order, user.id) : null;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        code: await this.allocateTicketCode(),
        userId: user.id,
        orderId,
        subject: dto.subject ?? null,
        status: TicketStatus.PENDING,
        assignedAdminId: adminId,
        lastMessageAt: new Date(),
        messages: { create: { body: dto.body, fromAdmin: true, adminId } },
      },
      include: { messages: true },
    });

    await this.notifications.notifyUser({
      userId: user.id,
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `تیکت پشتیبانی ${ticket.code}`,
      body: dto.body,
      meta: { ticketId: ticket.id, ticketCode: ticket.code },
    });

    return ticket;
  }

  async addAdminMessage(ticketId: string, dto: CreateAdminMessageDto, adminId: string) {
    const ticket = await this.requireTicket(ticketId);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException(FA.TICKET_CLOSED);
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        body: dto.body,
        fromAdmin: true,
        adminId,
        attachmentUrl: dto.attachmentUrl ?? null,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: new Date(),
        status: TicketStatus.PENDING,
        assignedAdminId: ticket.assignedAdminId ?? adminId,
      },
    });

    await this.notifications.notifyUser({
      userId: ticket.userId,
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `پاسخ پشتیبانی — تیکت ${ticket.code}`,
      body: dto.body,
      meta: {
        ticketId: ticket.id,
        ticketCode: ticket.code,
        attachmentUrl: dto.attachmentUrl ?? null,
      },
    });

    return stripTelegramId(message);
  }

  async updateStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.requireTicket(ticketId);
    return this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status,
        closedAt: status === TicketStatus.CLOSED ? new Date() : null,
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async requireTicket(idOrCode: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!ticket) {
      throw new NotFoundException(FA.TICKET_NOT_FOUND);
    }
    return ticket;
  }

  private async resolveOrderId(idOrCode: string, userId: string): Promise<string> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }], userId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException(FA.ORDER_NOT_FOUND);
    }
    return order.id;
  }

  private allocateTicketCode(): Promise<string> {
    return uniqueCode(generateTicketId, async (code) => {
      const found = await this.prisma.supportTicket.findUnique({ where: { code } });
      return found !== null;
    });
  }

  private async notifyAdmins(
    ticket: SupportTicket,
    customerCode: string,
    body: string,
  ): Promise<void> {
    await this.notifications.notifyAdmins({
      event: NotificationEvent.SUPPORT_MESSAGE,
      title: `پیام پشتیبانی — تیکت ${ticket.code}`,
      body: `مشتری ${customerCode}: ${body.slice(0, 300)}`,
      meta: {
        ticketId: ticket.id,
        ticketCode: ticket.code,
        customerCode,
        orderId: ticket.orderId,
      },
    });
  }
}

function stripTelegramId<T extends { telegramMessageId: bigint | null }>(message: T) {
  return { ...message, telegramMessageId: message.telegramMessageId?.toString() ?? null };
}
