import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { BroadcastStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export const AUDIENCE_KINDS = ["all", "active", "temu", "city", "batch"] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export class AudienceDto {
  @IsIn(AUDIENCE_KINDS as unknown as string[])
  kind: AudienceKind;

  /** Required when `kind` is "city". */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  /** Required when `kind` is "batch" — a TemuBatch id or code. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  batchId?: string;
}

export class ListBroadcastsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BroadcastStatus)
  status?: BroadcastStatus;
}

export class CreateBroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @ValidateNested()
  @Type(() => AudienceDto)
  audience: AudienceDto;
}

export class UpdateBroadcastDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mediaUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceDto)
  audience?: AudienceDto;
}
