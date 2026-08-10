import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Currency, InspectionType } from "@hmray/database";

export class QuoteItemInputDto {
  /** Links the quote line back to the basket line it prices. */
  @IsOptional()
  @IsString()
  requestItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  productCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumberString()
  price: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

export class UpsertQuoteDto {
  /**
   * Omit to price straight from the request items (their admin-entered price
   * and currency). Provide to override line by line.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items?: QuoteItemInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  notes?: string[];

  /** Overrides the live OMR rate; the value is frozen onto the quote. */
  @IsOptional()
  @IsNumberString()
  omrRate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateQuoteNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}

export class ConfirmQuoteDto {
  /** Must contain every note id shown on the quote page. */
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  acceptedNoteIds: string[];

  @IsBoolean()
  acceptedTerms: boolean;

  @IsEnum(InspectionType)
  inspectionType: InspectionType;
}

export class RejectQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class BotQuoteActorDto {
  @IsString()
  @MinLength(1)
  telegramUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
