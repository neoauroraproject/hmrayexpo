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
import { OrdersService } from "./orders.service";
import {
  CreateManualOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";

@Controller("admin/orders")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  /** Declared before `:id` so "manual" is never captured as an order id. */
  @Post("manual")
  @Roles(AdminRole.ADMIN)
  @RequirePermission(PERMISSIONS.ORDERS_MANUAL_CREATE)
  create(
    @Body() dto: CreateManualOrderDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.orders.createManual(dto, admin, context);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.orders.get(id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.orders.updateStatus(id, dto, admin, context);
  }
}

@Controller("public/orders")
export class PublicOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(":code")
  get(@Param("code") code: string) {
    return this.orders.getPublic(code);
  }
}
