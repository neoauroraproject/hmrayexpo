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
import { BroadcastsService } from "./broadcasts.service";
import {
  CreateBroadcastDto,
  ListBroadcastsQueryDto,
  UpdateBroadcastDto,
} from "./dto/broadcast.dto";

@Controller("admin/broadcasts")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT)
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Get()
  list(@Query() query: ListBroadcastsQueryDto) {
    return this.broadcasts.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateBroadcastDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.broadcasts.create(dto, admin, context);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.broadcasts.get(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBroadcastDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.broadcasts.update(id, dto, admin, context);
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.broadcasts.remove(id, admin, context);
  }

  @Get(":id/preview")
  preview(@Param("id") id: string) {
    return this.broadcasts.preview(id);
  }

  @Post(":id/send")
  @Roles(AdminRole.ADMIN)
  @RequirePermission(PERMISSIONS.BROADCASTS_SEND)
  send(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    return this.broadcasts.send(id, admin, context);
  }
}
