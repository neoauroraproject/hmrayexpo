import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/roles.decorator";
import { FA } from "../errors/messages";
import { PermissionsService } from "../../modules/auth/permissions.service";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
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

    for (const permission of required) {
      if (!(await this.permissions.has(user, permission))) {
        throw new ForbiddenException(FA.AUTH_FORBIDDEN);
      }
    }
    return true;
  }
}
