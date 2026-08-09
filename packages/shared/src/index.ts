import { randomInt } from "node:crypto";

type ProductCodePrefix = "TM" | "EX";

const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Zero-padded random decimal block, e.g. "04871" */
function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += String(randomInt(0, 10));
  }
  return out;
}

function randomAlphanum(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHANUM[randomInt(0, ALPHANUM.length)];
  }
  return out;
}

/** Customer public code — `HM-#####` */
export function generateCustomerId(): string {
  return `HM-${randomDigits(5)}`;
}

/** Purchase request public code — `RQ-#####` */
export function generateRequestId(): string {
  return `RQ-${randomDigits(5)}`;
}

/** Quote public code — `Q-#####` */
export function generateQuoteId(): string {
  return `Q-${randomDigits(5)}`;
}

/** Order public code — `HM-YYYY-#####` using the current year */
export function generateOrderId(year: number = new Date().getFullYear()): string {
  return `HM-${year}-${randomDigits(5)}`;
}

/** Payment public code — `P-#####` */
export function generatePaymentId(): string {
  return `P-${randomDigits(5)}`;
}

/** Support ticket public code — `T-#####` */
export function generateTicketId(): string {
  return `T-${randomDigits(5)}`;
}

/**
 * Product code shown to the customer — `TM-XXXX` (Temu) or `EX-XXXX` (external store).
 */
export function generateProductCode(prefix: ProductCodePrefix): string {
  return `${prefix}-${randomAlphanum(4)}`;
}

/**
 * Format an amount in Iranian Toman with Persian locale grouping.
 * Assumes input is already in Toman (not Rial).
 */
export function formatToman(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "۰ تومان";
  }
  const formatted = new Intl.NumberFormat("fa-IR").format(Math.round(amount));
  return `${formatted} تومان`;
}

/** Parse a Toman string back to number (stub for future use) */
export function parseToman(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

/** Convert Rial to Toman */
export function rialToToman(rial: number): number {
  return Math.round(rial / 10);
}

/** Convert Toman to Rial */
export function tomanToRial(toman: number): number {
  return toman * 10;
}
