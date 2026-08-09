import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { RefundStatus, ReturnStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class ListReturnsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;
}

export class CreateReturnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class CreateRefundDto {
  /** Toman. Never larger than the order total. */
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateRefundStatusDto {
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
