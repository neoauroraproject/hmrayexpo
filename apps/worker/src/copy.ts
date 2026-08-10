import { formatToman } from "@hmray/shared";

/** Persian copy for Telegram delivery. Kept in sync with `docs/copy-bot.fa.md`. */

export const TEST_HEADLINE = "«پیام تست HMRAY»";

function formatAmount(amount: unknown, currency?: unknown): string {
  const n = typeof amount === "string" ? Number(amount) : typeof amount === "number" ? amount : NaN;
  if (!Number.isFinite(n)) {
    return "-";
  }
  if (!currency || currency === "TOMAN") {
    return formatToman(n);
  }
  return `${new Intl.NumberFormat("fa-IR").format(n)} ${currency}`;
}

function formatDateFa(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function testMessage(payload: Record<string, unknown>): string {
  const requestedBy = typeof payload.requestedBy === "string" ? payload.requestedBy : null;
  const message = typeof payload.message === "string" ? payload.message : null;
  const lines = [TEST_HEADLINE];
  if (message) lines.push(message);
  if (requestedBy) lines.push(`درخواست‌دهنده: ${requestedBy}`);
  lines.push("اتصال ربات و صف اعلان‌ها سالم است ✅");
  return lines.join("\n");
}

export function newRequestAdmin(payload: {
  requestCode?: unknown;
  customerCode?: unknown;
  requestType?: unknown;
  itemCount?: unknown;
  url?: unknown;
}): string {
  const lines = ["🆕 درخواست خرید جدید"];
  if (payload.requestCode) lines.push(`کد درخواست: ${payload.requestCode}`);
  if (payload.customerCode) lines.push(`مشتری: ${payload.customerCode}`);
  if (payload.requestType) lines.push(`نوع: ${payload.requestType}`);
  if (payload.itemCount !== undefined) lines.push(`تعداد کالا: ${payload.itemCount}`);
  if (payload.url) lines.push(`\nمشاهده در پنل ادمین:\n${payload.url}`);
  return lines.join("\n");
}

export interface QuoteLineItem {
  index: number | string;
  label: string;
  priceLabel: string;
}

export function quoteSentCustomer(payload: {
  quoteCode?: unknown;
  totalLabel?: unknown;
  expiresAt?: unknown;
  url?: unknown;
  items?: QuoteLineItem[];
}): string {
  const lines = [
    "💰 پیش‌فاکتور شما آماده شد!",
    "",
    "مبالغ زیر به تومان ایران هستند.",
  ];
  if (payload.quoteCode) lines.push(`📄 کد پیش‌فاکتور: ${payload.quoteCode}`);

  if (payload.items && payload.items.length > 0) {
    lines.push("");
    for (const item of payload.items) {
      lines.push(`#${item.index} ${item.label} — ${item.priceLabel}`);
    }
  }

  lines.push("");
  if (payload.totalLabel) lines.push(`💵 جمع کل قابل پرداخت: ${payload.totalLabel}`);
  if (payload.expiresAt) lines.push(`⏰ اعتبار تا: ${formatDateFa(payload.expiresAt)}`);
  if (payload.url) {
    lines.push("");
    lines.push("برای مشاهده جزئیات، تأیید یا رد از دکمه/لینک زیر استفاده کن:");
    lines.push(String(payload.url));
  }
  return lines.join("\n");
}

export function quoteExpiredCustomer(payload: { quoteCode?: unknown }): string {
  const code = payload.quoteCode ? ` ${payload.quoteCode}` : "";
  return [
    `⏰ پیش‌فاکتور${code} منقضی شد؛ قیمت دیگه اعتبار نداره.`,
    "برای گرفتن قیمت جدید، دوباره از ربات درخواست بده.",
  ].join("\n");
}

export function paymentSubmittedAdmin(payload: {
  paymentCode?: unknown;
  customerCode?: unknown;
  amount?: unknown;
  currency?: unknown;
  url?: unknown;
}): string {
  const lines = ["💳 پرداخت جدید ثبت شد"];
  if (payload.paymentCode) lines.push(`کد پرداخت: ${payload.paymentCode}`);
  if (payload.customerCode) lines.push(`مشتری: ${payload.customerCode}`);
  if (payload.amount !== undefined) lines.push(`مبلغ: ${formatAmount(payload.amount, payload.currency)}`);
  if (payload.url) lines.push(`\nبررسی در پنل ادمین:\n${payload.url}`);
  return lines.join("\n");
}

export function paymentReceiptUploadedAdmin(payload: { paymentCode?: unknown; url?: unknown }): string {
  const lines = ["🧾 رسید پرداخت بارگذاری شد و در انتظار بررسی است."];
  if (payload.paymentCode) lines.push(`کد پرداخت: ${payload.paymentCode}`);
  if (payload.url) lines.push(`\nبررسی در پنل ادمین:\n${payload.url}`);
  return lines.join("\n");
}

export function paymentConfirmedCustomer(payload: { orderCode?: unknown }): string {
  const order = payload.orderCode ? ` ${payload.orderCode}` : "";
  return `✅ پرداخت شما تأیید شد و سفارش${order} وارد مرحله خرید شد.`;
}

export function paymentRejectedCustomer(payload: { paymentCode?: unknown; reason?: unknown }): string {
  const lines = ["❌ پرداخت شما تأیید نشد."];
  if (payload.paymentCode) lines.push(`کد پرداخت: ${payload.paymentCode}`);
  if (payload.reason) lines.push(`دلیل: ${payload.reason}`);
  return lines.join("\n");
}

export function supportMessage(payload: { title?: unknown; body?: unknown }): string {
  const lines = ["💬"];
  if (payload.title) lines.push(String(payload.title));
  if (payload.body) lines.push(String(payload.body));
  return lines.join("\n");
}

export function newOrderAdmin(payload: {
  orderCode?: unknown;
  customerCode?: unknown;
  totalLabel?: unknown;
  url?: unknown;
}): string {
  const lines = ["🛒 سفارش جدید ثبت شد"];
  if (payload.orderCode) lines.push(`کد سفارش: ${payload.orderCode}`);
  if (payload.customerCode) lines.push(`مشتری: ${payload.customerCode}`);
  if (payload.totalLabel) lines.push(`مبلغ: ${payload.totalLabel}`);
  if (payload.url) lines.push(`\nمشاهده در پنل ادمین:\n${payload.url}`);
  return lines.join("\n");
}

export function newOrderCustomer(payload: { orderCode?: unknown; totalLabel?: unknown }): string {
  const order = payload.orderCode ? ` ${payload.orderCode}` : "";
  const total = payload.totalLabel ? ` به مبلغ ${payload.totalLabel}` : "";
  return `🛒 سفارش شما${order}${total} ثبت شد و در حال پردازش است.`;
}

/** Fallback for events without a dedicated template — the title/body already come in Persian. */
export function generic(payload: { title?: unknown; body?: unknown }): string {
  const lines: string[] = [];
  if (payload.title) lines.push(String(payload.title));
  if (payload.body) lines.push(String(payload.body));
  return lines.length > 0 ? lines.join("\n\n") : "اعلان جدید";
}

export { formatAmount, formatDateFa };
