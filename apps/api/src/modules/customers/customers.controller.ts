import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
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
import { CustomersService } from "./customers.service";
import { CreateCustomerNoteDto, ListCustomersQueryDto } from "./dto/create-note.dto";

@Controller("admin/customers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.FINANCE, AdminRole.OPERATOR)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() query: ListCustomersQueryDto) {
    return this.customers.list(query);
  }

  @Get(":id")
  profile(@Param("id") id: string) {
    return this.customers.profile(id);
  }

  @Post(":id/notes")
  async addNote(
    @Param("id") id: string,
    @Body() dto: CreateCustomerNoteDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const note = await this.customers.addNote(id, dto, admin.id);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "customer.note.create",
      entityType: "User",
      entityId: note.entityId,
      newValue: { noteId: note.id, visibility: note.visibility },
      context,
    });
    return note;
  }
}
