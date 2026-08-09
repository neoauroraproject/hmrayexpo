import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BroadcastStatus,
  Prisma,
  RequestType,
  UserStatus,
} from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import { pageArgs, paginated, type Paginated } from "../../common/utils/pagination";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { JOB } from "../notifications/notifications.constants";
import type {
  AudienceDto,
  CreateBroadcastDto,
  ListBroadcastsQueryDto,
  UpdateBroadcastDto,
} from "./dto/broadcast.dto";

/** Recipients per queued job — keeps a single job short enough to retry cheaply. */
const CHUNK_SIZE = 100;

interface Recipient {
  userId: string;
  telegramUserId: string;
}

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListBroadcastsQueryDto): Promise<Paginated<unknown>> {
    const args = pageArgs(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.BroadcastWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q ? { title: { contains: q, mode: Prisma.QueryMode.insensitive } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
        include: { createdByAdmin: { select: { id: true, displayName: true } } },
      }),
      this.prisma.broadcast.count({ where }),
    ]);

    return paginated(items, total, args);
  }

  async get(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id },
      include: { createdByAdmin: { select: { id: true, displayName: true } } },
    });
    if (!broadcast) {
      throw new NotFoundException(FA.BROADCAST_NOT_FOUND);
    }
    const audienceCount = await this.countRecipients(broadcast.audience as unknown as AudienceDto);
    return { ...broadcast, audienceCount };
  }

  async create(dto: CreateBroadcastDto, admin: AuthenticatedAdmin, context: ClientContext) {
    const broadcast = await this.prisma.broadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        mediaUrl: dto.mediaUrl ?? null,
        audience: dto.audience as unknown as Prisma.InputJsonValue,
        createdByAdminId: admin.id,
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "broadcast.create",
      entityType: "Broadcast",
      entityId: broadcast.id,
      newValue: { title: broadcast.title, audience: dto.audience },
      context,
    });

    return broadcast;
  }

  async update(
    id: string,
    dto: UpdateBroadcastDto,
    admin: AuthenticatedAdmin,
    context: ClientContext,
  ) {
    const existing = await this.requireDraft(id);
    const broadcast = await this.prisma.broadcast.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.mediaUrl !== undefined ? { mediaUrl: dto.mediaUrl } : {}),
        ...(dto.audience !== undefined
          ? { audience: dto.audience as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "broadcast.update",
      entityType: "Broadcast",
      entityId: id,
      oldValue: { title: existing.title, audience: existing.audience },
      newValue: { title: broadcast.title, audience: broadcast.audience },
      context,
    });

    return broadcast;
  }

  async remove(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const existing = await this.requireDraft(id);
    await this.prisma.broadcast.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "broadcast.delete",
      entityType: "Broadcast",
      entityId: id,
      oldValue: { title: existing.title },
      context,
    });
    return { deleted: true };
  }

  /** How many customers the current filter would reach, without sending. */
  async preview(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new NotFoundException(FA.BROADCAST_NOT_FOUND);
    }
    const recipients = await this.resolveRecipients(
      broadcast.audience as unknown as AudienceDto,
    );
    return { total: recipients.length, sample: recipients.slice(0, 10).map((r) => r.userId) };
  }

  /**
   * Resolves the audience to Telegram ids and hands the delivery to the worker.
   * Counters are seeded here and refined by the worker as chunks complete.
   */
  async send(id: string, admin: AuthenticatedAdmin, context: ClientContext) {
    const broadcast = await this.requireDraft(id);
    const recipients = await this.resolveRecipients(
      broadcast.audience as unknown as AudienceDto,
    );
    if (recipients.length === 0) {
      throw new ConflictException(FA.BROADCAST_NO_RECIPIENTS);
    }

    const updated = await this.prisma.broadcast.update({
      where: { id },
      data: {
        status: BroadcastStatus.SENDING,
        startedAt: new Date(),
        completedAt: null,
        sentCount: 0,
        failedCount: 0,
        blockedCount: 0,
      },
    });

    const chunks: Recipient[][] = [];
    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      chunks.push(recipients.slice(i, i + CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      // A chunk is only partially delivered when it throws, so retrying it
      // would send the message twice to everyone before the failure.
      this.notifications.enqueue(
        JOB.BROADCAST_SEND,
        {
          broadcastId: broadcast.id,
          title: broadcast.title,
          body: broadcast.body,
          mediaUrl: broadcast.mediaUrl,
          chunkIndex: index,
          chunkCount: chunks.length,
          totalRecipients: recipients.length,
          recipients: chunk,
        },
        { attempts: 1 },
      );
    });

    await this.audit.log({
      actorAdminId: admin.id,
      action: "broadcast.send",
      entityType: "Broadcast",
      entityId: id,
      newValue: {
        title: broadcast.title,
        audience: broadcast.audience,
        recipients: recipients.length,
        chunks: chunks.length,
      },
      context,
    });

    return { broadcast: updated, queued: recipients.length, chunks: chunks.length };
  }

  // ─── Internals ──────────────────────────────────────────────

  private async requireDraft(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new NotFoundException(FA.BROADCAST_NOT_FOUND);
    }
    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new ConflictException(FA.BROADCAST_NOT_DRAFT);
    }
    return broadcast;
  }

  private async countRecipients(audience: AudienceDto | null): Promise<number> {
    if (!audience?.kind) {
      return 0;
    }
    return this.prisma.user.count({ where: this.audienceWhere(audience) });
  }

  private async resolveRecipients(audience: AudienceDto | null): Promise<Recipient[]> {
    if (!audience?.kind) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: this.audienceWhere(audience),
      select: { id: true, telegramAccount: { select: { telegramUserId: true } } },
    });
    return users.flatMap((user) =>
      user.telegramAccount
        ? [{ userId: user.id, telegramUserId: user.telegramAccount.telegramUserId.toString() }]
        : [],
    );
  }

  /** Only customers with a Telegram account can receive a broadcast at all. */
  private audienceWhere(audience: AudienceDto): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = {
      telegramAccount: { isNot: null },
      status: { not: UserStatus.DELETED },
    };

    switch (audience.kind) {
      case "active":
        return { ...base, status: UserStatus.ACTIVE };
      case "temu":
        return { ...base, requests: { some: { type: RequestType.TEMU } } };
      case "city":
        return audience.city
          ? {
              ...base,
              addresses: {
                some: { city: { equals: audience.city, mode: Prisma.QueryMode.insensitive } },
              },
            }
          : base;
      case "batch":
        return audience.batchId
          ? {
              ...base,
              orders: {
                some: {
                  temuBatchOrder: {
                    batch: { OR: [{ id: audience.batchId }, { code: audience.batchId }] },
                  },
                },
              },
            }
          : base;
      case "all":
      default:
        return base;
    }
  }
}
