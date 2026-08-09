import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { TicketStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class CreateBotTicketDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  /** Order id or public `HM-YYYY-#####` code the ticket is about. */
  @IsOptional()
  @IsString()
  order?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class CreateBotTicketMessageDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}

export class CreateAdminTicketDto {
  /** Internal user id or `HM-#####`. */
  @IsString()
  @MinLength(3)
  customer: string;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class CreateAdminMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class ListTicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}

export class BotTicketsQueryDto extends PaginationQueryDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;
}
