import { IsNumberString, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertBotUserDto {
  /** Telegram ids exceed 2^53, so they travel as strings. */
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

/** Every bot route identifies its caller with this field. */
export class BotActorDto {
  @IsNumberString({ no_symbols: true })
  telegramUserId: string;
}
