import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { TemuBatchStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class ListBatchesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TemuBatchStatus)
  status?: TemuBatchStatus;
}

export class CreateBatchDto {
  /** Omit to auto-allocate a `TB-#####` code. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code?: string;

  @IsNumberString()
  targetOmr: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateBatchDto {
  @IsOptional()
  @IsNumberString()
  targetOmr?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(TemuBatchStatus)
  status?: TemuBatchStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AddBatchOrderDto {
  /** Order id or public code. */
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Type(() => String)
  order: string;
}

export class BatchPurchaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
