import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminRole } from "@hmray/database";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { SupportService } from "./support.service";
import {
  BotTicketsQueryDto,
  CreateAdminMessageDto,
  CreateAdminTicketDto,
  CreateBotTicketDto,
  CreateBotTicketMessageDto,
  ListTicketsQueryDto,
  UpdateTicketStatusDto,
} from "./dto/support.dto";

@Controller("bot/tickets")
@UseGuards(BotSecretGuard)
export class BotSupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  create(@Body() dto: CreateBotTicketDto) {
    return this.support.createFromBot(dto);
  }

  @Get("mine")
  mine(@Query() query: BotTicketsQueryDto) {
    return this.support.listForBot(query.telegramUserId, query.page, query.pageSize);
  }

  @Post(":id/messages")
  addMessage(@Param("id") id: string, @Body() dto: CreateBotTicketMessageDto) {
    return this.support.addBotMessage(id, dto);
  }
}

@Controller("admin/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPPORT, AdminRole.OPERATOR)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@Query() query: ListTicketsQueryDto) {
    return this.support.list(query);
  }

  @Post()
  create(@Body() dto: CreateAdminTicketDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.support.createFromAdmin(dto, admin.id);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.support.get(id);
  }

  @Post(":id/messages")
  addMessage(
    @Param("id") id: string,
    @Body() dto: CreateAdminMessageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.support.addAdminMessage(id, dto, admin.id);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.support.updateStatus(id, dto.status);
  }
}
