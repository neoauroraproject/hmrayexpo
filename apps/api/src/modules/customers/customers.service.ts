import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NoteVisibility, Prisma, User, UserStatus } from "@hmray/database";
import { generateCustomerId } from "@hmray/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { toTelegramId, uniqueCode } from "../../common/utils/identifiers";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import type { UpsertBotUserDto } from "./dto/upsert-bot-user.dto";
import type { CreateCustomerNoteDto } from "./dto/create-note.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Telegram registration. Creating the User and TelegramAccount together keeps
   * `customerCode` allocation atomic, so a retried /start never mints two codes.
   */
  async upsertTelegramUser(dto: UpsertBotUserDto) {
    const telegramUserId = toTelegramId(dto.telegramUserId);

    const existing = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      include: { user: true },
    });

    if (existing) {
      if (existing.user.status === UserStatus.BLOCKED) {
        throw new ForbiddenException(FA.USER_BLOCKED);
      }
      const account = await this.prisma.telegramAccount.update({
        where: { id: existing.id },
        data: {
          username: dto.username ?? existing.username,
          firstName: dto.firstName ?? existing.firstName,
          lastName: dto.lastName ?? existing.lastName,
          language: dto.language ?? existing.language,
          lastActivity: new Date(),
        },
        include: { user: true },
      });
      if (dto.displayName || dto.phone) {
        await this.prisma.user.update({
          where: { id: account.userId },
          data: {
            displayName: dto.displayName ?? account.user.displayName,
            phone: dto.phone ?? account.user.phone,
          },
        });
      }
      return this.publicUser(account.userId, false);
    }

    const customerCode = await uniqueCode(generateCustomerId, async (code) => {
      const found = await this.prisma.user.findUnique({ where: { customerCode: code } });
      return found !== null;
    });

    const fromTelegramName = [dto.firstName, dto.lastName].filter(Boolean).join(" ").trim();

    const user = await this.prisma.user.create({
      data: {
        customerCode,
        displayName: dto.displayName ?? (fromTelegramName.length > 0 ? fromTelegramName : null),
        phone: dto.phone ?? null,
        telegramAccount: {
          create: {
            telegramUserId,
            username: dto.username ?? null,
            firstName: dto.firstName ?? null,
            lastName: dto.lastName ?? null,
            language: dto.language ?? "fa",
            lastActivity: new Date(),
          },
        },
      },
    });

    return this.publicUser(user.id, true);
  }

  private async publicUser(userId: string, created: boolean) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { telegramAccount: true },
    });
    return {
      created,
      user: {
        id: user.id,
        customerCode: user.customerCode,
        status: user.status,
        displayName: user.displayName,
        phone: user.phone,
        telegramUserId: user.telegramAccount?.telegramUserId?.toString() ?? null,
        username: user.telegramAccount?.username ?? null,
      },
    };
  }

  /** Resolves a bot caller. Blocked customers are refused everywhere. */
  async requireByTelegramId(telegramUserId: string | number | bigint): Promise<User> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId: toTelegramId(telegramUserId) },
      include: { user: true },
    });
    if (!account) {
      throw new NotFoundException(FA.USER_NOT_FOUND);
    }
    if (account.user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException(FA.USER_BLOCKED);
    }
    return account.user;
  }

  /** Accepts an internal id or a public `HM-#####` code. */
  async requireByIdOrCode(idOrCode: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: idOrCode }, { customerCode: idOrCode }] },
    });
    if (!user) {
      throw new NotFoundException(FA.USER_NOT_FOUND);
    }
    return user;
  }

  async list(query: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: UserStatus;
  }): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { displayName: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { phone: { contains: q } },
              {
                telegramAccount: {
                  username: { contains: q, mode: Prisma.QueryMode.insensitive },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: {
          telegramAccount: true,
          _count: { select: { requests: true, orders: true, tickets: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(
      rows.map((row) => ({
        ...row,
        telegramAccount: row.telegramAccount
          ? {
              ...row.telegramAccount,
              telegramUserId: row.telegramAccount.telegramUserId.toString(),
            }
          : null,
      })),
      total,
      args,
    );
  }

  /** Everything the admin customer page renders in one round trip. */
  async profile(idOrCode: string) {
    const user = await this.requireByIdOrCode(idOrCode);

    const [full, notes] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          telegramAccount: true,
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          requests: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { items: { orderBy: { displayIndex: "asc" } } },
          },
          quotes: { orderBy: { createdAt: "desc" }, take: 50 },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { items: { orderBy: { displayIndex: "asc" } } },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { method: { select: { id: true, title: true } } },
          },
          tickets: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      }),
      this.prisma.entityNote.findMany({
        where: { entityType: "User", entityId: user.id },
        orderBy: { createdAt: "desc" },
        include: { authorAdmin: { select: { id: true, displayName: true } } },
      }),
    ]);

    return {
      ...full,
      telegramAccount: full.telegramAccount
        ? {
            ...full.telegramAccount,
            telegramUserId: full.telegramAccount.telegramUserId.toString(),
          }
        : null,
      payments: full.payments.map((payment) => ({
        ...payment,
        telegramChatId: payment.telegramChatId?.toString() ?? null,
        telegramMessageId: payment.telegramMessageId?.toString() ?? null,
      })),
      notes,
    };
  }

  async addNote(idOrCode: string, dto: CreateCustomerNoteDto, adminId: string) {
    const user = await this.requireByIdOrCode(idOrCode);
    return this.prisma.entityNote.create({
      data: {
        entityType: "User",
        entityId: user.id,
        body: dto.body,
        visibility: dto.visibility ?? NoteVisibility.INTERNAL,
        authorAdminId: adminId,
      },
    });
  }
}
