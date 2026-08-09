import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { FA } from "../../common/errors/messages";
import type { AuthenticatedAdmin, JwtPayload } from "../../common/auth/authenticated-admin";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  /** Re-reads the admin on every request so deactivation takes effect instantly. */
  async validate(payload: JwtPayload): Promise<AuthenticatedAdmin> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin) {
      throw new UnauthorizedException(FA.AUTH_UNAUTHORIZED);
    }
    if (!admin.isActive) {
      throw new UnauthorizedException(FA.AUTH_ACCOUNT_DISABLED);
    }
    return {
      id: admin.id,
      username: admin.username,
      displayName: admin.displayName,
      role: admin.role,
      email: admin.email,
    };
  }
}
