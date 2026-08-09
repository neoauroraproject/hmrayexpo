import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { InspectionType, OrderStatus, PurchaseMode } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class ListOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PurchaseMode)
  purchaseMode?: PurchaseMode;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /**
   * Bypasses the "confirmed payment before purchase" rule. Requires the
   * `orders.force_purchase` permission and is always written to the audit log.
   */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class CreateManualOrderDto {
  /** Orders always descend from a quote — never straight from a request. */
  @IsString()
  @MinLength(3)
  quote: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsEnum(InspectionType)
  inspectionType?: InspectionType;

  @IsOptional()
  @IsEnum(PurchaseMode)
  purchaseMode?: PurchaseMode;
}
