import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { FA } from "../errors/messages";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";

/** The admin resolved by `JwtAuthGuard`. */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedAdmin }>();
    if (!request.user) {
      throw new UnauthorizedException(FA.AUTH_UNAUTHORIZED);
    }
    return request.user;
  },
);

export interface ClientContext {
  ip: string | null;
  userAgent: string | null;
}

/** IP + user-agent, recorded on every audited action. */
export const RequestContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientContext => {
    const request = ctx.switchToHttp().getRequest<{
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const forwarded = request.headers?.["x-forwarded-for"];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ??
      request.ip ??
      null;
    const agent = request.headers?.["user-agent"];
    return {
      ip: ip ?? null,
      userAgent: (Array.isArray(agent) ? agent[0] : agent) ?? null,
    };
  },
);
