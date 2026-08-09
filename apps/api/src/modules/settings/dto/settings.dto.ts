import { Type } from "class-transformer";
import {
  IsEnum,
  IsNotEmptyObject,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Currency } from "@hmray/database";

export class UpdateSettingsDto {
  /** Flat map of `settingKey -> value`; unknown or internal keys are rejected. */
  @IsObject()
  @IsNotEmptyObject()
  values: Record<string, unknown>;
}

export class SetExchangeRateDto {
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  /** Sent as a string so no precision is lost in JSON. */
  @Type(() => String)
  @IsNumberString({ no_symbols: false })
  rateToToman: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class TestNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}
