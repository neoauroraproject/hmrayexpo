import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  Currency,
  PurchaseMode,
  RequestItemStatus,
  RequestStatus,
  RequestType,
} from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class CreateBotRequestDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsEnum(PurchaseMode)
  purchaseMode?: PurchaseMode;
}

export class AddRequestItemDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  originalUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  telegramMessageId?: string;
}

export class BotActorBodyDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;
}

export class UpdateRequestItemNoteDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  userNote: string;
}

export class BotActorQueryDto extends PaginationQueryDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;
}

export class ListRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;
}

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminRequestItemDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  originalUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

/** Support path: an operator files the request on the customer's behalf. */
export class CreateAdminRequestDto {
  /** Internal user id or public `HM-#####` code. */
  @IsString()
  @MinLength(3)
  customer: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsEnum(PurchaseMode)
  purchaseMode?: PurchaseMode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AdminRequestItemDto)
  items?: AdminRequestItemDto[];
}

export class PriceRequestItemDto {
  @IsNumberString()
  price: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(RequestItemStatus)
  status?: RequestItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

export class UpdateRequestItemAdminNoteDto {
  @IsString()
  @MaxLength(1000)
  adminNote: string;
}

export class CreateRequestMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}
