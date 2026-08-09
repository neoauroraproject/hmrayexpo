import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsNumberString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PrismaService } from "../../common/prisma/prisma.service";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { FA } from "../../common/errors/messages";
import { CustomersService } from "../customers/customers.service";

class CreateAddressDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  mobile: string;

  @IsString()
  @MaxLength(60)
  province: string;

  @IsString()
  @MaxLength(60)
  city: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20)
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plaque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class UpdateAddressDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsOptional() @IsString() @MaxLength(120) recipientName?: string;
  @IsOptional() @IsString() @MaxLength(20) mobile?: string;
  @IsOptional() @IsString() @MaxLength(60) province?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(20) plaque?: string;
  @IsOptional() @IsString() @MaxLength(20) unit?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

class AddressActorQueryDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;
}

@Controller("bot/addresses")
@UseGuards(BotSecretGuard)
export class AddressesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  @Get()
  async list(@Query() query: AddressActorQueryDto) {
    const user = await this.customers.requireByTelegramId(query.telegramUserId);
    return this.prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  @Post()
  async create(@Body() dto: CreateAddressDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const isFirst = (await this.prisma.address.count({ where: { userId: user.id } })) === 0;
    const shouldDefault = dto.isDefault ?? isFirst;

    return this.prisma.$transaction(async (tx) => {
      if (shouldDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId: user.id,
          recipientName: dto.recipientName,
          mobile: dto.mobile,
          province: dto.province,
          city: dto.city,
          address: dto.address,
          postalCode: dto.postalCode,
          plaque: dto.plaque ?? null,
          unit: dto.unit ?? null,
          notes: dto.notes ?? null,
          isDefault: shouldDefault,
        },
      });
    });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAddressDto) {
    const user = await this.customers.requireByTelegramId(dto.telegramUserId);
    const existing = await this.prisma.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      throw new NotFoundException(FA.ADDRESS_NOT_FOUND);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(dto.recipientName !== undefined ? { recipientName: dto.recipientName } : {}),
          ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
          ...(dto.province !== undefined ? { province: dto.province } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
          ...(dto.plaque !== undefined ? { plaque: dto.plaque } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Query() query: AddressActorQueryDto) {
    const user = await this.customers.requireByTelegramId(query.telegramUserId);
    const existing = await this.prisma.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      throw new NotFoundException(FA.ADDRESS_NOT_FOUND);
    }
    await this.prisma.address.delete({ where: { id } });
    return { deleted: true };
  }
}
