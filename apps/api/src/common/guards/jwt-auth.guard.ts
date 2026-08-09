import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FA } from "../errors/messages";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AuthenticatedAdmin>(
    err: unknown,
    user: TUser | false,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException(FA.AUTH_UNAUTHORIZED);
    }
    return user;
  }
}
