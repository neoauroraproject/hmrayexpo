import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { AuthService, type LoginResult } from "./auth.service";
import { PermissionsService } from "./permissions.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionsService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @RequestContext() context: ClientContext,
  ): Promise<LoginResult> {
    return this.auth.login(dto, context);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return {
      admin,
      permissions: await this.permissions.listFor(admin.role),
    };
  }
}
