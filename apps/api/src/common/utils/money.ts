import { BadRequestException } from "@nestjs/common";
import { Currency, Prisma } from "@hmray/database";
import { FA } from "../errors/messages";

export type RateMap = Partial<Record<Currency, Prisma.Decimal>>;

/** Toman columns are Decimal(18,2). */
export const TOMAN_SCALE = 2;

export function decimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Converts a foreign-currency amount to Toman using the supplied snapshot rates.
 * Throws (Persian) when the caller has no live rate for that currency, because
 * silently pricing at zero would be worse than failing.
 */
export function toToman(
  price: Prisma.Decimal | string | number,
  currency: Currency,
  rates: RateMap,
): Prisma.Decimal {
  const amount = decimal(price);
  if (currency === Currency.TOMAN) {
    return amount.toDecimalPlaces(TOMAN_SCALE);
  }
  const rate = rates[currency];
  if (!rate) {
    throw new BadRequestException(FA.RATE_MISSING);
  }
  return amount.mul(rate).toDecimalPlaces(TOMAN_SCALE);
}

export function lineTotalToman(
  price: Prisma.Decimal | string | number,
  quantity: number,
  currency: Currency,
  rates: RateMap,
): Prisma.Decimal {
  return toToman(price, currency, rates).mul(quantity).toDecimalPlaces(TOMAN_SCALE);
}

export function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values
    .reduce((acc, value) => acc.add(value), new Prisma.Decimal(0))
    .toDecimalPlaces(TOMAN_SCALE);
}
