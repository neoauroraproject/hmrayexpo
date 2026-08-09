import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./common/prisma/prisma.service";

interface Health {
  status: "ok" | "degraded";
  service: string;
  database: "up" | "down";
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /** Served at both /api/health and /health (the container probe). */
  @Get("health")
  async health(): Promise<Health> {
    let database: Health["database"] = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return {
      status: database === "up" ? "ok" : "degraded",
      service: "hmray-api",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
