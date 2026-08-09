import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { QualityCheckStatus } from "@hmray/database";

export class CreateQualityCheckDto {
  @IsOptional()
  @IsEnum(QualityCheckStatus)
  status?: QualityCheckStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  mediaUrls?: string[];

  /** Defaults to true for FAILED / NEEDS_REVIEW, false otherwise. */
  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

export class UpdateQualityCheckDto extends CreateQualityCheckDto {}

/** Customer reply to a quality report, from the public order page. */
export class QualityResponseDto {
  @IsIn(["ACCEPT", "RETURN"])
  decision: "ACCEPT" | "RETURN";

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note?: string;
}
