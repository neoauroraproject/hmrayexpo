import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { QualityService } from "./quality.service";
import {
  CreateQualityCheckDto,
  QualityResponseDto,
  UpdateQualityCheckDto,
} from "./dto/quality.dto";

@Controller("admin/orders/:id/quality-checks")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.SUPPORT)
export class OrderQualityChecksController {
  constructor(private readonly quality: QualityService) {}

  @Get()
  list(@Param("id") id: string) {
    return this.quality.list(id);
  }

  @Post()
  create(
    @Param("id") id: string,
    @Body() dto: CreateQualityCheckDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.quality.create(id, dto, admin, context);
  }
}

@Controller("admin/quality-checks")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.SUPPORT)
export class QualityChecksController {
  constructor(private readonly quality: QualityService) {}

  @Patch(":checkId")
  update(
    @Param("checkId") checkId: string,
    @Body() dto: UpdateQualityCheckDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.quality.update(checkId, dto, admin, context);
  }
}

/** Reached from the public order-tracking page — order code is the only secret. */
@Controller("public/orders/:code/quality-checks")
export class PublicQualityController {
  constructor(private readonly quality: QualityService) {}

  @Get()
  list(@Param("code") code: string) {
    return this.quality.publicList(code);
  }

  @Post(":checkId/response")
  respond(
    @Param("code") code: string,
    @Param("checkId") checkId: string,
    @Body() dto: QualityResponseDto,
  ) {
    return this.quality.respond(code, checkId, dto);
  }
}
