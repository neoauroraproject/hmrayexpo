import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { AdminRole } from "@hmray/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentAdmin,
  RequestContext,
  type ClientContext,
} from "../../common/decorators/current-admin.decorator";
import type { AuthenticatedAdmin } from "../../common/auth/authenticated-admin";
import { FA } from "../../common/errors/messages";
import { AuditService } from "../audit/audit.service";

class CreateChannelDto {
  @IsString()
  @MaxLength(120)
  name: string;

  /** Stored without the leading `@`. */
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{4,32}$/)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  inviteLink?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{4,32}$/)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  inviteLink?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

function normalizeUsername(username: string): string {
  return username.replace(/^@/, "");
}

@Controller("admin/channels")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN)
export class ChannelsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.requiredChannel.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  @Post()
  async create(
    @Body() dto: CreateChannelDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const channel = await this.prisma.requiredChannel.create({
      data: {
        name: dto.name,
        username: normalizeUsername(dto.username),
        inviteLink: dto.inviteLink ?? null,
        enabled: dto.enabled ?? true,
        required: dto.required ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "channel.create",
      entityType: "RequiredChannel",
      entityId: channel.id,
      newValue: channel,
      context,
    });
    return channel;
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateChannelDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const existing = await this.prisma.requiredChannel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.CHANNEL_NOT_FOUND);
    }
    const channel = await this.prisma.requiredChannel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.username !== undefined
          ? { username: normalizeUsername(dto.username) }
          : {}),
        ...(dto.inviteLink !== undefined ? { inviteLink: dto.inviteLink } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "channel.update",
      entityType: "RequiredChannel",
      entityId: id,
      oldValue: existing,
      newValue: channel,
      context,
    });
    return channel;
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const existing = await this.prisma.requiredChannel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.CHANNEL_NOT_FOUND);
    }
    await this.prisma.requiredChannel.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "channel.delete",
      entityType: "RequiredChannel",
      entityId: id,
      oldValue: existing,
      context,
    });
    return { deleted: true };
  }
}

@Controller("public/channels")
export class ChannelsPublicController {
  constructor(private readonly prisma: PrismaService) {}

  /** Membership gate the bot enforces before letting a customer order. */
  @Get("required")
  list() {
    return this.prisma.requiredChannel.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
        inviteLink: true,
        required: true,
        sortOrder: true,
      },
    });
  }
}
