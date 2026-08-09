import { ForbiddenException, Injectable } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FA } from "../../common/errors/messages";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";

/** Permissions that exist in Phase 1 but have no UI yet. */
export const PERMISSIONS = {
  /** Move an order to PURCHASED without a CONFIRMED payment. Always audited. */
  ORDERS_FORCE_PURCHASE: "orders.force_purchase",
  ORDERS_MANUAL_CREATE: "orders.manual_create",
  SETTINGS_MANAGE: "settings.manage",
  /** Spend money with the supplier for a whole Temu batch at once. */
  TEMU_BATCH_PURCHASE: "temu.batch_purchase",
  SHIPPING_MANAGE: "shipping.manage",
  RETURNS_MANAGE: "returns.manage",
  /** Create or advance a refund. Always audited. */
  REFUNDS_PROCESS: "refunds.process",
  BROADCASTS_SEND: "broadcasts.send",
  ANALYTICS_VIEW: "analytics.view",
} as const;

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * OWNER holds every permission implicitly; everyone else needs an explicit
   * `RolePermission` row. Rows are seeded per deployment, so an empty table
   * means "only the owner can do this" rather than "everyone can".
   */
  async has(admin: AuthenticatedAdmin, permission: string): Promise<boolean> {
    if (admin.role === AdminRole.OWNER) {
      return true;
    }
    const granted = await this.prisma.rolePermission.findUnique({
      where: { role_permission: { role: admin.role, permission } },
    });
    return granted !== null;
  }

  async require(admin: AuthenticatedAdmin, permission: string): Promise<void> {
    if (!(await this.has(admin, permission))) {
      throw new ForbiddenException(FA.AUTH_FORBIDDEN);
    }
  }

  async listFor(role: AdminRole): Promise<string[]> {
    if (role === AdminRole.OWNER) {
      return Object.values(PERMISSIONS);
    }
    const rows = await this.prisma.rolePermission.findMany({ where: { role } });
    return rows.map((row) => row.permission);
  }
}
