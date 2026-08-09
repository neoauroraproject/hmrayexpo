import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";

export interface AuditEntry {
  actorAdminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  context?: ClientContext | null;
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit row. Pass `tx` to make the trail atomic with the change it
   * describes — used for anything money- or permission-sensitive.
   */
  async log(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const db: Db = tx ?? this.prisma;
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorAdminId: entry.actorAdminId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      oldValue: toJson(entry.oldValue),
      newValue: toJson(entry.newValue),
      ip: entry.context?.ip ?? null,
      userAgent: entry.context?.userAgent ?? null,
    };

    if (tx) {
      await db.auditLog.create({ data });
      return;
    }

    try {
      await db.auditLog.create({ data });
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log ${entry.action}: ${(error as Error).message}`,
      );
    }
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value, bigIntReplacer)) as Prisma.InputJsonValue;
}

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
