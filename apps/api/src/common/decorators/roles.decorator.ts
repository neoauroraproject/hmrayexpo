import { SetMetadata } from "@nestjs/common";
import type { AdminRole } from "@hmray/database";

export const ROLES_KEY = "hmray:roles";
export const PERMISSIONS_KEY = "hmray:permissions";

/** Restrict a route to the listed admin roles. OWNER always passes. */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

/** Require a named permission (checked against `RolePermission`). */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
