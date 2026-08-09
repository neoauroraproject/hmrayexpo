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
import { TemuBatchesService } from "./temu-batches.service";
import {
  AddBatchOrderDto,
  BatchPurchaseDto,
  CreateBatchDto,
  ListBatchesQueryDto,
  UpdateBatchDto,
} from "./dto/temu-batch.dto";

@Controller("admin/temu-batches")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.OPERATOR, AdminRole.FINANCE)
export class TemuBatchesController {
  constructor(private readonly batches: TemuBatchesService) {}

  @Get()
  list(@Query() query: ListBatchesQueryDto) {
    return this.batches.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateBatchDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.create(dto, admin, context);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.batches.get(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBatchDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.update(id, dto, admin, context);
  }

  /** Soft close — orders keep their history, the batch just stops accepting them. */
  @Delete(":id")
  remove(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.remove(id, admin, context);
  }

  @Post(":id/orders")
  addOrder(
    @Param("id") id: string,
    @Body() dto: AddBatchOrderDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.addOrder(id, dto, admin, context);
  }

  @Delete(":id/orders/:orderId")
  removeOrder(
    @Param("id") id: string,
    @Param("orderId") orderId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.removeOrder(id, orderId, admin, context);
  }

  @Post(":id/start-purchase")
  @Roles(AdminRole.ADMIN)
  @RequirePermission(PERMISSIONS.TEMU_BATCH_PURCHASE)
  startPurchase(
    @Param("id") id: string,
    @Body() dto: BatchPurchaseDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.startPurchase(id, dto, admin, context);
  }

  @Post(":id/complete-purchase")
  @Roles(AdminRole.ADMIN)
  @RequirePermission(PERMISSIONS.TEMU_BATCH_PURCHASE)
  completePurchase(
    @Param("id") id: string,
    @Body() dto: BatchPurchaseDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.batches.completePurchase(id, dto, admin, context);
  }
}
