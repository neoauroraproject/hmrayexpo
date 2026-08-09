import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ShipmentStatus, TrackingLeg } from "@hmray/database";

export class CreateShippingMethodDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrier?: string;

  @IsOptional()
  @IsBoolean()
  isDomestic?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateShippingMethodDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrier?: string;

  @IsOptional()
  @IsBoolean()
  isDomestic?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpsertShippingRateDto {
  @IsNumberString()
  minKg: string;

  @IsNumberString()
  maxKg: string;

  /** Flat price for the whole bracket. Mutually usable with `pricePerKg`. */
  @IsOptional()
  @IsNumberString()
  priceToman?: string;

  @IsOptional()
  @IsNumberString()
  pricePerKg?: string;

  @IsOptional()
  @IsNumberString()
  minCharge?: string;
}

export class CreateShipmentDto {
  @IsOptional()
  @IsNumberString()
  actualWeightKg?: string;

  @IsOptional()
  @IsString()
  shippingMethodId?: string;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  domesticMethod?: string;

  /** Overrides the price the weight brackets would produce. */
  @IsOptional()
  @IsNumberString()
  shippingCost?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

export class UpdateShipmentDto extends CreateShipmentDto {
  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}

export class CreateTrackingEventDto {
  @IsEnum(TrackingLeg)
  leg: TrackingLeg;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class UpdateTrackingEventDto {
  @IsOptional()
  @IsEnum(TrackingLeg)
  leg?: TrackingLeg;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
