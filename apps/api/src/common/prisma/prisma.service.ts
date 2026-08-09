import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@hmray/database";

/**
 * Injection token for the shared `@hmray/database` client. The provider in
 * `PrismaModule` returns that singleton rather than opening a second pool.
 */
export class PrismaService extends PrismaClient {}

/** Owns connect/disconnect for the shared client. */
@Injectable()
export class PrismaLifecycle implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PrismaLifecycle.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.$connect();
    } catch (error) {
      this.logger.error(
        `Database connection failed: ${(error as Error).message}. Queries will retry lazily.`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
