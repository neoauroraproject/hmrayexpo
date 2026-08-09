import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermission, Roles } from "../../common/decorators/roles.decorator";
import { PERMISSIONS } from "../auth/permissions.service";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { ReturnsService } from "./returns.service";
import {
  CreateRefundDto,
  CreateReturnDto,
  ListReturnsQueryDto,
  UpdateRefundStatusDto,
  UpdateReturnStatusDto,
} from "./dto/returns.dto";

@Controller("admin/returns")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  list(@Query() query: ListReturnsQueryDto) {
    return this.returns.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.returns.get(id);
  }

  @Patch(":id/status")
  @RequirePermission(PERMISSIONS.RETURNS_MANAGE)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateReturnStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.returns.updateStatus(id, dto, admin, context);
  }

  @Post(":id/refund")
  @Roles(AdminRole.ADMIN, AdminRole.FINANCE)
  @RequirePermission(PERMISSIONS.REFUNDS_PROCESS)
  createRefund(
    @Param("id") id: string,
    @Body() dto: CreateRefundDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.returns.createRefund(id, dto, admin, context);
  }
}

@Controller("admin/refunds")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.FINANCE)
export class RefundsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  list(@Query() query: ListReturnsQueryDto) {
    return this.returns.listRefunds(query);
  }

  @Patch(":id/status")
  @RequirePermission(PERMISSIONS.REFUNDS_PROCESS)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRefundStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.returns.updateRefundStatus(id, dto, admin, context);
  }
}

@Controller("admin/orders/:id/returns")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class OrderReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post()
  create(
    @Param("id") id: string,
    @Body() dto: CreateReturnDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.returns.create(id, dto, admin, context);
  }
}
