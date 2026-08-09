import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@hmray/database";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { FA } from "../errors/messages";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedAdmin }>();
    if (!user) {
      throw new ForbiddenException(FA.AUTH_FORBIDDEN);
    }
    if (user.role === AdminRole.OWNER || required.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException(FA.AUTH_FORBIDDEN);
  }
}
