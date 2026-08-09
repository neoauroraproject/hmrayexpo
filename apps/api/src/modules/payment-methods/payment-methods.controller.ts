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
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
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

class CreatePaymentMethodDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountOrWallet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  network?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountOrWallet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  network?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

@Controller("admin/payment-methods")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.FINANCE)
export class PaymentMethodsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.paymentMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  @Post()
  async create(
    @Body() dto: CreatePaymentMethodDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const method = await this.prisma.paymentMethod.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        accountOrWallet: dto.accountOrWallet ?? null,
        network: dto.network ?? null,
        instructions: dto.instructions ?? null,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "payment_method.create",
      entityType: "PaymentMethod",
      entityId: method.id,
      newValue: method,
      context,
    });
    return method;
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const existing = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.PAYMENT_METHOD_NOT_FOUND);
    }
    const method = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.accountOrWallet !== undefined
          ? { accountOrWallet: dto.accountOrWallet }
          : {}),
        ...(dto.network !== undefined ? { network: dto.network } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "payment_method.update",
      entityType: "PaymentMethod",
      entityId: id,
      oldValue: existing,
      newValue: method,
      context,
    });
    return method;
  }

  /** Soft delete: payments reference methods with `onDelete: Restrict`. */
  @Delete(":id")
  async disable(
    @Param("id") id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @RequestContext() context: ClientContext,
  ) {
    const existing = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(FA.PAYMENT_METHOD_NOT_FOUND);
    }
    const method = await this.prisma.paymentMethod.update({
      where: { id },
      data: { enabled: false },
    });
    await this.audit.log({
      actorAdminId: admin.id,
      action: "payment_method.disable",
      entityType: "PaymentMethod",
      entityId: id,
      oldValue: existing,
      newValue: method,
      context,
    });
    return method;
  }
}

@Controller("public/payment-methods")
export class PaymentMethodsPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        accountOrWallet: true,
        network: true,
        instructions: true,
      },
    });
  }
}
