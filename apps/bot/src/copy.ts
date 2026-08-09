/**
 * All customer-facing Persian copy lives here. Tone: casual, short, respectful —
 * never corporate-sounding, minimal emoji, never show the raw Telegram user id
 * (only `customerCode`, e.g. `HM-12345`).
 */

// ─── Main menu buttons (reply keyboard) ─────────────────────────
export const BTN_NEW_REQUEST = "ثبت درخواست خرید";
export const BTN_MY_REQUESTS = "درخواست‌های من";
export const BTN_TRACK_ORDER = "پیگیری سفارش";
export const BTN_MY_ADDRESSES = "آدرس‌های من";
export const BTN_PAYMENTS = "پرداخت‌ها";
export const BTN_RULES = "قوانین و هزینه‌ها";
export const BTN_SUPPORT = "پشتیبانی";

// ─── Shared control buttons ──────────────────────────────────────
export const BTN_CANCEL = "انصراف";
export const BTN_FINALIZE = "ثبت نهایی درخواست";
export const BTN_DELETE_ITEM = "حذف یک محصول";
export const BTN_BACK = "بازگشت به منو";
export const BTN_ADD_ADDRESS = "افزودن آدرس جدید";
export const BTN_SEND_RECEIPT = "ارسال رسید یک پرداخت";
export const BTN_SKIP = "-";

// ─── Request-type inline buttons ────────────────────────────────
export const BTN_TEMU = "خرید از Temu";
export const BTN_EXTERNAL = "خرید از سایر فروشگاه‌ها";

// ─── Generic ──────────────────────────────────────────────────
export const ERROR_GENERIC = "یه مشکلی پیش اومد. لطفاً دوباره امتحان کن.";
export const ERROR_NETWORK = "الان به سرور دسترسی نداریم. چند لحظه دیگه دوباره امتحان کن.";
export const ERROR_NOT_FOUND = "چیزی که دنبالش بودیم پیدا نشد.";
export const CANCELLED_GENERIC = "باشه، لغو شد.";
export const BACK_TO_MENU = "برگشتیم به منوی اصلی.";
export const UNKNOWN_COMMAND =
  "متوجه نشدم. از دکمه‌های پایین استفاده کن، یا برای شروع دوباره /start رو بزن.";

export function welcome(name: string, customerCode: string): string {
  return [
    `سلام ${name}!`,
    "",
    "به ربات خرید HMRAY خوش اومدی.",
    `کد مشتری تو: ${customerCode}`,
    "",
    "از دکمه‌های پایین هر کاری خواستی رو انجام بده.",
  ].join("\n");
}

export function welcomeBack(name: string): string {
  return `سلام ${name}، خوش برگشتی!`;
}

// ─── Required channels gate ──────────────────────────────────────
export const CHANNEL_GATE_MESSAGE = [
  "برای استفاده از ربات، اول باید عضو کانال‌های زیر بشی.",
  "بعد از عضویت، «✅ عضو شدم» رو بزن.",
].join("\n");

export const CHANNEL_GATE_STILL_MISSING =
  "هنوز عضو همه کانال‌ها نیستی. عضو شو و دوباره «✅ عضو شدم» رو بزن.";

export const CHANNEL_GATE_PASSED = "عالی، عضویتت تأیید شد.";

// ─── New request flow ────────────────────────────────────────────
export const CHOOSE_REQUEST_TYPE = "می‌خوای از کجا خرید کنی؟";

export const ASK_STORE_NAME =
  "اسم فروشگاه رو بفرست (اگه نمی‌دونی یا مهم نیست، بزن «-»).";

export const REQUEST_OPENED_FIRST_ITEM = [
  "باشه! حالا لینک محصول یا عکسش رو بفرست.",
  "هر تعداد که خواستی، پشت سر هم بفرست — لازم نیست منتظر بمونی.",
  "وقتی تموم شد، «ثبت نهایی درخواست» رو بزن.",
].join("\n");

/** Sent once, right after the first link/photo of an open request. */
export const FIRST_ITEM_ACK = "لینک‌ها رسید. من بررسی‌شون می‌کنم و قیمت رو براتون می‌فرستم.";

export function itemAdded(displayIndex: number): string {
  return `✅ #${String(displayIndex).padStart(2, "0")} اضافه شد.`;
}

export const ITEM_SOURCE_NEEDED =
  "برای هر کالا یه لینک یا عکس بفرست. اگه توضیحی هم داری، همراه عکس به‌صورت کپشن بنویس.";

export const NO_OPEN_REQUEST =
  "درخواست بازی نداری. از «ثبت درخواست خرید» شروع کن.";

export const NO_ITEMS_TO_DELETE = "این درخواست هنوز کالایی نداره.";

export const CHOOSE_ITEM_TO_DELETE = "کدوم کالا رو حذف کنم؟";

export function itemDeleted(displayIndex: number): string {
  return `کالای #${String(displayIndex).padStart(2, "0")} حذف شد.`;
}

export const REQUEST_EMPTY_ON_FINALIZE =
  "این درخواست هنوز خالیه. اول یه لینک یا عکس بفرست.";

export function requestFinalized(code: string): string {
  return [
    "درخواستت ثبت شد. ✅",
    `کد پیگیری: ${code}`,
    "",
    "من بررسیش می‌کنم و قیمت هر محصول رو جداگانه برات می‌فرستم.",
    "فعلاً هیچ مبلغی پرداخت نمی‌کنی.",
  ].join("\n");
}

export const REQUEST_CANCELLED_DRAFT = [
  "باشه، فعلاً کنسل کردیم.",
  "این پیش‌نویس دست‌نخورده موند؛ هر وقت خواستی از «درخواست‌های من» ادامه‌اش بده.",
].join("\n");

// ─── My requests ──────────────────────────────────────────────────
export const MY_REQUESTS_EMPTY = "هنوز درخواستی ثبت نکردی.";
export const MY_REQUESTS_TITLE = "درخواست‌های تو:";

export function requestSummary(params: {
  code: string;
  statusLabel: string;
  itemCount: number;
  isDraft: boolean;
  latestQuoteLine?: string;
}): string {
  const lines = [
    `${params.code}${params.isDraft ? " (پیش‌نویس)" : ""}`,
    `وضعیت: ${params.statusLabel}`,
    `تعداد کالا: ${params.itemCount}`,
  ];
  if (params.latestQuoteLine) {
    lines.push(params.latestQuoteLine);
  }
  return lines.join("\n");
}

export const CONTINUE_DRAFT_HINT =
  "برای ادامه‌دادن این درخواست، روی دکمه زیرش بزن.";

// ─── Track order ─────────────────────────────────────────────────
export const ASK_ORDER_CODE = "کد سفارشت رو بفرست (مثل HM-2026-01234).";

export const ORDER_NOT_FOUND = "سفارشی با این کد پیدا نشد. کد رو دوباره چک کن.";

export function orderStatusMessage(params: {
  code: string;
  statusLabel: string;
  totalTomanLabel: string;
  itemCount: number;
}): string {
  return [
    `سفارش ${params.code}`,
    `وضعیت: ${params.statusLabel}`,
    `تعداد کالا: ${params.itemCount}`,
    `مبلغ کل: ${params.totalTomanLabel}`,
  ].join("\n");
}

// ─── Addresses ────────────────────────────────────────────────────
export const ADDRESSES_EMPTY = "هنوز آدرسی ثبت نکردی.";
export const ADDRESSES_TITLE = "آدرس‌های تو:";

export function addressSummary(a: {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
}): string {
  const lines = [
    `${a.recipientName}${a.isDefault ? " (پیش‌فرض)" : ""}`,
    `موبایل: ${a.mobile}`,
    `${a.province}، ${a.city}`,
    a.address,
    `کد پستی: ${a.postalCode}`,
  ];
  return lines.join("\n");
}

export const ADDRESS_ASK_RECIPIENT = "اسم گیرنده رو بفرست.";
export const ADDRESS_ASK_MOBILE = "شماره موبایل گیرنده رو بفرست.";
export const ADDRESS_ASK_PROVINCE = "استان چیه؟";
export const ADDRESS_ASK_CITY = "شهر چیه؟";
export const ADDRESS_ASK_FULL = "آدرس کامل رو بفرست.";
export const ADDRESS_ASK_POSTAL_CODE = "کد پستی چیه؟";
export const ADDRESS_SAVED = "آدرس با موفقیت ذخیره شد.";
export const ADDRESS_INVALID_MOBILE = "شماره موبایل باید حداقل ۸ رقم باشه. دوباره بفرست.";
export const ADDRESS_INVALID_POSTAL = "کد پستی باید حداقل ۵ رقم باشه. دوباره بفرست.";
export const ADDRESS_INVALID_TOO_SHORT = "این مقدار خیلی کوتاهه. دوباره بفرست.";

// ─── Payments ─────────────────────────────────────────────────────
export const PAYMENTS_MENU_INTRO = [
  "برای پرداخت، اول باید پیش‌فاکتور رو از لینکی که برات فرستادیم تأیید کنی.",
  "بعد از پرداخت، کد پرداخت (که با P- شروع میشه) رو اینجا بفرست و بعدش عکس رسید رو بفرست.",
].join("\n");

export const PENDING_QUOTES_TITLE = "پیش‌فاکتورهایی که منتظر پرداختشونیم:";
export const PENDING_QUOTES_EMPTY = "الان پیش‌فاکتور بازی برای پرداخت نداری.";

export function quoteLine(params: { code: string; statusLabel: string; url?: string }): string {
  const lines = [`${params.code} — ${params.statusLabel}`];
  if (params.url) lines.push(params.url);
  return lines.join("\n");
}

export const ASK_PAYMENT_ID = "کد پرداخت رو بفرست (مثل P-12345).";
export const ASK_PAYMENT_RECEIPT = "حالا عکس رسید پرداخت رو بفرست.";
export const PAYMENT_ID_INVALID = "این کد درست به‌نظر نمی‌رسه. دوباره امتحان کن (مثل P-12345).";
export const RECEIPT_UPLOADED = [
  "رسید رسید! ✅",
  "تیم مالی بررسیش می‌کنه و نتیجه رو برات می‌فرستیم.",
].join("\n");

// ─── Rules ────────────────────────────────────────────────────────
export const RULES_TEXT = [
  "قوانین و هزینه‌ها، خلاصه:",
  "",
  "• قیمت هر کالا رو جدا بررسی و اعلام می‌کنیم، معمولاً تا ۳ روز کاری.",
  "• هزینه ارسال جدا از قیمت کالاست و توی پیش‌فاکتور مشخص می‌شه.",
  "• تا وقتی پیش‌فاکتور رو تأیید نکردی، هیچ پرداختی انجام نمی‌شه.",
  "• پرداخت فقط بعد از تأیید پیش‌فاکتور و با روش‌های اعلام‌شده انجام می‌شه.",
  "• بعد از پرداخت و تأیید، سفارش ثبت و پیگیری می‌شه.",
  "• برای هر سؤال دیگه، از بخش «پشتیبانی» با ما در تماس باش.",
].join("\n");

// ─── Support ──────────────────────────────────────────────────────
export const SUPPORT_ASK_HAS_ORDER = "پیامت درباره یه سفارش خاصه؟";
export const SUPPORT_ASK_ORDER_CODE = "کد سفارش رو بفرست (مثل HM-2026-01234).";
export const SUPPORT_ASK_BODY = "بگو چه کمکی از دستمون برمیاد.";
export const SUPPORT_TICKET_CREATED = "پیامت ثبت شد. به‌زودی جواب می‌دیم.";
export const SUPPORT_YES = "بله";
export const SUPPORT_NO = "خیر";

// ─── Errors ───────────────────────────────────────────────────────
export function friendlyError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && "status" in err) {
    const apiErr = err as { message: string; status: number };
    if (apiErr.status === 0) return ERROR_NETWORK;
    if (apiErr.message && !apiErr.message.startsWith("HTTP_")) return apiErr.message;
  }
  return ERROR_GENERIC;
}
