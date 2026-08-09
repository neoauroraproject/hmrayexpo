import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Currency, PaymentSource, PaymentStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

/** Submitted from the public quote page (or the bot's web-view) as multipart. */
export class CreateQuotePaymentDto {
  @IsString()
  methodId: string;

  /** Defaults to the quote total when omitted. */
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  telegramUserId?: string;
}

export class CreateManualPaymentDto {
  /** Internal user id or `HM-#####`. */
  @IsString()
  @MinLength(3)
  customer: string;

  @IsString()
  methodId: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  /** Only SUPPORT or ADMIN are accepted here. */
  @IsEnum(PaymentSource)
  source: PaymentSource;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  receiptUrl?: string;
}

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;
}

export class RejectPaymentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class UploadReceiptDto {
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  telegramUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionHash?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  telegramMessageId?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  telegramChatId?: string;
}
