import { IsDateString, IsOptional } from "class-validator";

export class AnalyticsRangeDto {
  /** Inclusive lower bound. Defaults to 30 days ago. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Exclusive upper bound. Defaults to now. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
