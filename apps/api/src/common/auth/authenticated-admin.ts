import type { AdminRole } from "@hmray/database";

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  email: string | null;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: AdminRole;
}

export interface RequestWithAdmin {
  user?: AuthenticatedAdmin;
  ip?: string;
  headers: Record<string, unknown>;
}
