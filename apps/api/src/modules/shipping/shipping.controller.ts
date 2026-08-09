import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
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
import { ShippingService } from "./shipping.service";
import {
  CreateShipmentDto,
  CreateShippingMethodDto,
  CreateTrackingEventDto,
  UpdateShipmentDto,
  UpdateShippingMethodDto,
  UpdateTrackingEventDto,
  UpsertShippingRateDto,
} from "./dto/shipping.dto";

@Controller("admin/shipping")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.SUPPORT, AdminRole.FINANCE)
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get("methods")
  listMethods(@Query("includeDisabled") includeDisabled?: string) {
    return this.shipping.listMethods(includeDisabled === "true");
  }

  @Post("methods")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  createMethod(
    @Body() dto: CreateShippingMethodDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.createMethod(dto, admin, context);
  }

  @Patch("methods/:id")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  updateMethod(
    @Param("id") id: string,
    @Body() dto: UpdateShippingMethodDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.updateMethod(id, dto, admin, context);
  }

  @Delete("methods/:id")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  disableMethod(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.disableMethod(id, admin, context);
  }

  @Get("methods/:id/rates")
  listRates(@Param("id") id: string) {
    return this.shipping.listRates(id);
  }

  @Post("methods/:id/rates")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  createRate(
    @Param("id") id: string,
    @Body() dto: UpsertShippingRateDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.createRate(id, dto, admin, context);
  }

  @Patch("rates/:rateId")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  updateRate(
    @Param("rateId") rateId: string,
    @Body() dto: UpsertShippingRateDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.updateRate(rateId, dto, admin, context);
  }

  @Delete("rates/:rateId")
  @Roles(AdminRole.ADMIN, AdminRole.OPERATOR)
  @RequirePermission(PERMISSIONS.SHIPPING_MANAGE)
  deleteRate(
    @Param("rateId") rateId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.deleteRate(rateId, admin, context);
  }

  @Patch("tracking-events/:eventId")
  updateTrackingEvent(
    @Param("eventId") eventId: string,
    @Body() dto: UpdateTrackingEventDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.updateTrackingEvent(eventId, dto, admin, context);
  }

  @Delete("tracking-events/:eventId")
  deleteTrackingEvent(
    @Param("eventId") eventId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.deleteTrackingEvent(eventId, admin, context);
  }
}

@Controller("admin/orders/:id/shipment")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.SUPPORT, AdminRole.FINANCE)
export class OrderShipmentController {
  constructor(private readonly shipping: ShippingService) {}

  @Get()
  get(@Param("id") id: string) {
    return this.shipping.getShipment(id);
  }

  @Post()
  create(
    @Param("id") id: string,
    @Body() dto: CreateShipmentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.upsertShipment(id, dto, admin, context);
  }

  @Patch()
  update(
    @Param("id") id: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.upsertShipment(id, dto, admin, context);
  }

  @Post("tracking")
  addTracking(
    @Param("id") id: string,
    @Body() dto: CreateTrackingEventDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.shipping.addTrackingEvent(id, dto, admin, context);
  }
}
