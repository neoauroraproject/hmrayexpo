import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
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
import { AuditService } from "../audit/audit.service";
import { RequestsService } from "./requests.service";
import {
  CreateAdminRequestDto,
  CreateRequestMessageDto,
  ListRequestsQueryDto,
  PriceRequestItemDto,
  UpdateRequestStatusDto,
} from "./dto/request.dto";

@Controller("admin/requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() query: ListRequestsQueryDto) {
    return this.requests.list(query);
  }

  @Get(":id")
  workspace(@Param("id") id: string) {
    return this.requests.workspace(id);
  }

  @Post()
  @Roles(AdminRole.ADMIN, AdminRole.SUPPORT)
  async create(
    @Body() dto: CreateAdminRequestDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const request = await this.requests.createForAdmin(dto, admin.id);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "request.create.admin",
      entityType: "PurchaseRequest",
      entityId: request.id,
      newValue: { code: request.code, customer: dto.customer, type: dto.type },
      context,
    });
    return request;
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRequestStatusDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const request = await this.requests.updateStatus(id, dto.status, dto.note);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "request.status.update",
      entityType: "PurchaseRequest",
      entityId: request.id,
      newValue: { status: dto.status, note: dto.note ?? null },
      context,
    });
    return request;
  }

  @Patch(":id/items/:itemId/price")
  async priceItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: PriceRequestItemDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const item = await this.requests.priceItem(id, itemId, dto);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "request.item.price",
      entityType: "RequestItem",
      entityId: item.id,
      newValue: { price: dto.price, currency: item.currency, status: item.status },
      context,
    });
    return item;
  }

  @Post(":id/items/:itemId/refresh-preview")
  @Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR)
  async refreshItemPreview(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const item = await this.requests.refreshItemPreview(id, itemId);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "request.item.refreshPreview",
      entityType: "RequestItem",
      entityId: item.id,
      newValue: { images: item.images },
      context,
    });
    return item;
  }

  @Post(":id/messages")
  message(
    @Param("id") id: string,
    @Body() dto: CreateRequestMessageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.requests.addMessage(id, dto, admin.id);
  }
}
