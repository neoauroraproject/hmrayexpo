import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AppConfigService } from "../../common/config/app-config.service";
import { FA } from "../../common/errors/messages";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedAdmin, JwtPayload } from "../../common/auth/authenticated-admin";
import type { ClientContext } from "../../common/decorators/current-admin.decorator";
import type { LoginDto } from "./dto/login.dto";

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  admin: AuthenticatedAdmin;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, context: ClientContext): Promise<LoginResult> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
    });

    // Compare against a dummy hash when the user is unknown so a missing
    // account and a wrong password take the same amount of time.
    const hash = admin?.passwordHash ?? DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(dto.password, hash);

    if (!admin || !passwordMatches) {
      await this.audit.log({
        action: "auth.login.failed",
        entityType: "AdminUser",
        entityId: admin?.id ?? null,
        newValue: { username: dto.username },
        context,
      });
      throw new UnauthorizedException(FA.AUTH_INVALID_CREDENTIALS);
    }

    if (!admin.isActive) {
      throw new UnauthorizedException(FA.AUTH_ACCOUNT_DISABLED);
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    };

    await this.audit.log({
      actorAdminId: admin.id,
      action: "auth.login",
      entityType: "AdminUser",
      entityId: admin.id,
      context,
    });

    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.jwtExpiresIn,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        email: admin.email,
      },
    };
  }
}

/** bcrypt hash of a value nobody can supply; only used for timing parity. */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.zvfKRQhCFXBLjBRRiPZGvtLuKZ0M9zi";
