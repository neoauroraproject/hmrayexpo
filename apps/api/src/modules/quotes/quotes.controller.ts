import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
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
import { QuotesService } from "./quotes.service";
import { ConfirmQuoteDto, CreateQuoteNoteDto, RejectQuoteDto, UpsertQuoteDto } from "./dto/quote.dto";

@Controller("admin/requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR)
export class RequestQuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly audit: AuditService,
  ) {}

  @Post(":id/quotes")
  async upsert(
    @Param("id") requestId: string,
    @Body() dto: UpsertQuoteDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const quote = await this.quotes.upsertDraft(requestId, dto, admin.id);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "quote.draft.upsert",
      entityType: "Quote",
      entityId: quote.id,
      newValue: {
        code: quote.code,
        omrRate: quote.omrRate.toString(),
        productsTotal: quote.productsTotal.toString(),
        itemCount: quote.items.length,
      },
      context,
    });
    return quote;
  }
}

@Controller("admin/quotes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR, AdminRole.FINANCE)
export class QuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly audit: AuditService,
  ) {}

  @Get(":id")
  get(@Param("id") id: string) {
    return this.quotes.getForAdmin(id);
  }

  @Post(":id/notes")
  addNote(@Param("id") id: string, @Body() dto: CreateQuoteNoteDto) {
    return this.quotes.addNote(id, dto);
  }

  @Post(":id/issue")
  @Roles(AdminRole.ADMIN, AdminRole.SUPPORT)
  async issue(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const quote = await this.quotes.issue(id);
    await this.audit.log({
      actorAdminId: admin.id,
      action: "quote.issue",
      entityType: "Quote",
      entityId: quote.id,
      newValue: {
        code: quote.code,
        productsTotal: quote.productsTotal.toString(),
        expiresAt: quote.expiresAt.toISOString(),
      },
      context,
    });
    return quote;
  }
}

@Controller("public/quotes")
export class PublicQuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get(":codeOrToken")
  get(@Param("codeOrToken") codeOrToken: string) {
    return this.quotes.getPublic(codeOrToken);
  }

  @Post(":codeOrToken/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param("codeOrToken") codeOrToken: string,
    @Body() dto: ConfirmQuoteDto,
    @RequestContext() context: ClientContext,
  ) {
    return this.quotes.confirmPublic(codeOrToken, dto, context.ip);
  }

  @Post(":codeOrToken/reject")
  @HttpCode(HttpStatus.OK)
  reject(@Param("codeOrToken") codeOrToken: string, @Body() dto: RejectQuoteDto) {
    return this.quotes.rejectPublic(codeOrToken, dto.reason);
  }
}
