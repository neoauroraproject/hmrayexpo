import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AdminRole, NotificationEvent, Prisma } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { JOB, NOTIFICATIONS_QUEUE, type NotificationJob } from "./notifications.constants";

const ADMIN_NOTIFY_ROLES: AdminRole[] = [
  AdminRole.OWNER,
  AdminRole.ADMIN,
  AdminRole.SUPPORT,
  AdminRole.FINANCE,
  AdminRole.OPERATOR,
];

export interface UserNotification {
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

export interface AdminNotification {
  event: NotificationEvent;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJob>,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Fire-and-forget so a slow or unreachable Redis never blocks a checkout.
   * The DB `Notification` row is the durable record; the queue is delivery.
   */
  enqueue(
    type: string,
    payload: Record<string, unknown>,
    options?: { attempts?: number },
  ): void {
    void this.queue
      .add(
        type,
        { type, payload },
        {
          attempts: options?.attempts ?? 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Could not enqueue ${type} on ${NOTIFICATIONS_QUEUE}: ${(error as Error).message}`,
        );
      });
  }

  /** Persists a customer notification and queues the Telegram delivery. */
  async notifyUser(notification: UserNotification): Promise<void> {
    const { userId, event, title, body, meta } = notification;

    await this.prisma.notification.create({
      data: {
        userId,
        event,
        title,
        body,
        meta: (meta ?? {}) as Prisma.InputJsonValue,
      },
    });

    const telegram = await this.prisma.telegramAccount.findUnique({
      where: { userId },
      select: { telegramUserId: true },
    });

    this.enqueue(JOB.TELEGRAM_USER, {
      event,
      userId,
      telegramUserId: telegram?.telegramUserId?.toString() ?? null,
      title,
      body,
      ...(meta ?? {}),
    });
  }

  /** Persists an inbox row per active admin and queues the group-chat message. */
  async notifyAdmins(notification: AdminNotification): Promise<void> {
    const { event, title, body, meta } = notification;

    const admins = await this.prisma.adminUser.findMany({
      where: { isActive: true, role: { in: ADMIN_NOTIFY_ROLES } },
      select: { id: true },
    });

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          adminUserId: admin.id,
          event,
          title,
          body,
          meta: (meta ?? {}) as Prisma.InputJsonValue,
        })),
      });
    }

    const chatId = await this.adminChatId();
    this.enqueue(JOB.TELEGRAM_ADMIN, {
      event,
      chatId,
      title,
      body,
      ...(meta ?? {}),
    });
  }

  /** Settings override the env default so ops can move the group without a redeploy. */
  private async adminChatId(): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: "adminTelegramChatId" },
    });
    const fromSettings = typeof setting?.value === "string" ? setting.value : null;
    return fromSettings ?? this.config.adminTelegramChatId ?? null;
  }
}
