import { Controller, Get, NotFoundException, Param, Patch, UseGuards } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";

@Controller("admin/notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  AdminRole.ADMIN,
  AdminRole.SUPPORT,
  AdminRole.OPERATOR,
  AdminRole.FINANCE,
)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.prisma.notification.findMany({
      where: { adminUserId: admin.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }

  @Patch("read-all")
  async markAllRead(@CurrentAdmin() admin: AuthenticatedAdmin) {
    const result = await this.prisma.notification.updateMany({
      where: { adminUserId: admin.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  @Patch(":id/read")
  async markRead(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, adminUserId: admin.id },
    });
    if (!existing) {
      throw new NotFoundException("Notification not found");
    }
    if (existing.readAt) {
      return existing;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
