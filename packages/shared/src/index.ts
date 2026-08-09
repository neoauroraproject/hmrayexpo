import { randomInt } from "node:crypto";

export type { BotCopyConfig, BotCopyMenus, BotCopyServices } from "./bot-copy";
export { DEFAULT_BOT_COPY, mergeBotCopy, interpolateBotCopy } from "./bot-copy";

type ProductCodePrefix = "TM" | "EX";

const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

export function generateCustomerId(): string {
  return `HM-${randomDigits(5)}`;
}

export function generateRequestId(): string {
  return `RQ-${randomDigits(5)}`;
}

export function generateQuoteId(): string {
  return `Q-${randomDigits(5)}`;
}

export function generateOrderId(year: number = new Date().getFullYear()): string {
  return `HM-${year}-${randomDigits(5)}`;
}

export function generatePaymentId(): string {
  return `P-${randomDigits(5)}`;
}

export function generateTicketId(): string {
  return `T-${randomDigits(5)}`;
}

export function generateProductCode(prefix: ProductCodePrefix): string {
  return `${prefix}-${randomAlphanum(4)}`;
}

export function formatToman(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "۰ تومان";
  }
  const formatted = new Intl.NumberFormat("fa-IR").format(Math.round(amount));
  return `${formatted} تومان`;
}

export function parseToman(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

export function rialToToman(rial: number): number {
  return Math.round(rial / 10);
}

export function tomanToRial(toman: number): number {
  return toman * 10;
}
