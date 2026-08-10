/**
 * Customer-facing Persian copy for the Telegram bot.
 * Tone: warm, clear, premium-short. Never show raw Telegram user ids —
 * only `customerCode` (e.g. HM-12345). Prices to customers are always Toman.
 */

// ─── Main menu buttons (reply keyboard) ─────────────────────────
export const BTN_NEW_REQUEST = "🛒 ثبت درخواست خرید";
export const BTN_MY_REQUESTS = "📋 درخواست‌های من";
export const BTN_TRACK_ORDER = "📦 پیگیری سفارش";
export const BTN_MY_ADDRESSES = "📍 آدرس‌های من";
export const BTN_PAYMENTS = "💳 پرداخت‌ها";
export const BTN_RULES = "📜 قوانین و هزینه‌ها";
export const BTN_SUPPORT = "💬 پشتیبانی";

// ─── Shared control buttons ──────────────────────────────────────
export const BTN_CANCEL = "❌ انصراف";
export const BTN_FINALIZE = "✅ ثبت نهایی";
export const BTN_DELETE_ITEM = "🗑 حذف یک محصول";
export const BTN_BACK = "🏠 بازگشت به منو";
export const BTN_ADD_ADDRESS = "➕ افزودن آدرس جدید";
export const BTN_SEND_RECEIPT = "🧾 ارسال رسید پرداخت";
export const BTN_SKIP = "-";
export const BTN_ADD_ITEM_NOTE = "✏️ افزودن توضیح";

// ─── Request-type inline buttons ────────────────────────────────
export const BTN_TEMU = "🧡 Temu";
export const BTN_EXTERNAL = "🏪 فروشگاه‌های دیگر";

// ─── Generic ──────────────────────────────────────────────────
export const ERROR_GENERIC =
  "😔 مشکلی پیش آمد.\nلطفاً کمی بعد دوباره امتحان کنید.";
export const ERROR_NETWORK =
  "📡 اتصال برقرار نیست.\nچند ثانیه صبر کنید و دوباره بفرستید.";
export const ERROR_NOT_FOUND = "🔎 موردی پیدا نشد.";
export const CANCELLED_GENERIC = "👌 لغو شد.\nهر وقت خواستید از منو شروع کنید.";
export const BACK_TO_MENU = "🏠 برگشتیم به منوی اصلی.";
export const UNKNOWN_COMMAND = [
  "🤔 متوجه نشدم.",
  "از دکمه‌های پایین صفحه استفاده کنید.",
].join("\n");

export function welcome(name: string, customerCode: string): string {
  return [
    `سلام ${name} 👋`,
    "",
    "به HMRAY خوش آمدید.",
    `کد مشتری: ${customerCode}`,
    "",
    "از منوی پایین درخواست ثبت کنید، پرداخت کنید یا سفارشتان را پیگیری کنید.",
  ].join("\n");
}

export function welcomeBack(name: string): string {
  return `سلام ${name}، خوش برگشتید ✨\nاز منو ادامه دهید.`;
}

// ─── Required channels gate ──────────────────────────────────────
export const CHANNEL_GATE_MESSAGE = [
  "🔐 برای استفاده از ربات، ابتدا عضو کانال‌های زیر شوید.",
  "",
  "سپس «✅ عضو شدم» را بزنید.",
].join("\n");

export const CHANNEL_GATE_STILL_MISSING = [
  "هنوز عضو همه کانال‌ها نشده‌اید.",
  "عضو شوید و دوباره «✅ عضو شدم» را بزنید.",
].join("\n");

export const CHANNEL_GATE_PASSED = "🎉 عضویت تأیید شد. خوش آمدید.";

// ─── New request flow ────────────────────────────────────────────
export const CHOOSE_REQUEST_TYPE = [
  "🛍️ از کجا می‌خرید؟",
  "",
  "یکی از گزینه‌ها را انتخاب کنید:",
].join("\n");

export const ASK_STORE_NAME = [
  "🏪 نام فروشگاه چیست؟",
  "",
  "اگر مهم نیست، «-» بفرستید.",
].join("\n");

export const REQUEST_OPENED_FIRST_ITEM = [
  "✨ درخواست آماده است",
  "",
  "لینک یا عکس محصول را بفرستید.",
  "می‌توانید توضیح هم کنارش بنویسید؛ مثلاً: رنگ آبی، سایز L",
  "",
  "هر تعداد کالا که خواستید. در پایان «✅ ثبت نهایی» را بزنید.",
].join("\n");

export function itemAdded(displayIndex: number): string {
  return [
    `✅ کالا ثبت شد (#${String(displayIndex).padStart(2, "0")})`,
    "",
    "✏️ توضیح اضافه کنید یا کالای بعدی را بفرستید.",
    "وقتی تمام شد → ✅ ثبت نهایی",
  ].join("\n");
}

/** @deprecated use itemAdded — kept for any leftover imports */
export const FIRST_ITEM_ACK = itemAdded(1);

export const ITEM_SOURCE_NEEDED = [
  "🔗 برای هر کالا لینک یا عکس لازم است.",
  "",
  "توضیح را می‌توانید کنار لینک بنویسید یا به صورت کپشن روی عکس بفرستید.",
].join("\n");

export const ASK_ITEM_NOTE = "✏️ توضیح این کالا را بنویسید.\nمثلاً: رنگ آبی، سایز L";

export const ITEM_NOTE_SAVED = "✅ توضیح ذخیره شد.";

export const NO_OPEN_REQUEST =
  "📭 درخواست بازی ندارید.\nاز «🛒 ثبت درخواست خرید» شروع کنید.";

export const NO_ITEMS_TO_DELETE = "🗑 این درخواست هنوز کالایی ندارد.";

export const CHOOSE_ITEM_TO_DELETE = "کدام کالا حذف شود؟ 👇";

export function itemDeleted(displayIndex: number): string {
  return `🗑 کالای #${String(displayIndex).padStart(2, "0")} حذف شد.`;
}

export const REQUEST_EMPTY_ON_FINALIZE = [
  "📭 هنوز کالایی در این درخواست نیست.",
  "اول لینک یا عکس بفرستید، بعد ثبت نهایی را بزنید.",
].join("\n");

export function requestFinalized(code: string, trackingUrl?: string): string {
  const lines = [
    "🎉 ثبت شد",
    `کد پیگیری: ${code}`,
    "",
    "از این لحظه تا تحویل با همین کد پیگیری کنید:",
  ];
  if (trackingUrl) {
    lines.push(trackingUrl);
  }
  lines.push("");
  lines.push("قیمت‌ها به تومان اعلام می‌شوند. فعلاً پرداختی لازم نیست.");
  return lines.join("\n");
}

export const REQUEST_CANCELLED_DRAFT = [
  "👌 کنسل شد.",
  "",
  "پیش‌نویس مانده؛ از «📋 درخواست‌های من» می‌توانید ادامه دهید.",
].join("\n");

// ─── My requests ──────────────────────────────────────────────────
export const MY_REQUESTS_EMPTY = [
  "📋 هنوز درخواستی ثبت نکرده‌اید.",
  "از «🛒 ثبت درخواست خرید» شروع کنید.",
].join("\n");
export const MY_REQUESTS_TITLE = "📋 درخواست‌های شما:";

export const BTN_OPEN_WEB = "🌐 مشاهده در وب";
export const BTN_COPY_CODE = "📋 کپی کد";
export const BTN_CONTINUE_DRAFT = "✏️ ادامه این درخواست";
export const BTN_CANCEL_REQUEST = "❌ انصراف از درخواست";
export const BTN_CONFIRM_CANCEL_REQUEST = "✅ بله، لغو شود";
export const BTN_KEEP_REQUEST = "↩️ نگه دار";
export const BTN_ENTER_TRACK_CODE = "⌨️ وارد کردن کد";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function requestSummary(params: {
  code: string;
  statusLabel: string;
  itemCount: number;
  isDraft: boolean;
  latestQuoteLine?: string;
}): string {
  const codeHtml = `<code>${escapeHtml(params.code)}</code>`;
  const lines = [
    `🆔 ${codeHtml}${params.isDraft ? " (پیش‌نویس ✍️)" : ""}`,
    `📊 وضعیت: ${escapeHtml(params.statusLabel)}`,
    `🧺 تعداد کالا: ${params.itemCount}`,
  ];
  if (params.latestQuoteLine) {
    lines.push(escapeHtml(params.latestQuoteLine));
  }
  lines.push("");
  lines.push("<i>برای کپی کد، روی آن لمس کنید یا دکمه کپی را بزنید.</i>");
  return lines.join("\n");
}

export const CONTINUE_DRAFT_HINT = "برای ادامه، دکمه زیر را بزنید 👇";

export const CANCEL_REQUEST_CONFIRM = [
  "آیا از لغو این درخواست مطمئنید؟",
  "پس از لغو، دیگر قابل ادامه نیست.",
].join("\n");

export function requestCancelled(code: string): string {
  return `✅ درخواست <code>${escapeHtml(code)}</code> لغو شد.`;
}

export const CANCEL_REQUEST_ABORTED = "خُب، درخواست شما همچنان فعال است.";

// ─── Track order ─────────────────────────────────────────────────
export const ASK_ORDER_CODE = [
  "📦 کد پیگیری یا کد سفارش را بفرستید.",
  "مثال: RQ-12345 یا HM-2026-01234",
].join("\n");

export const TRACK_INTRO = [
  "📦 پیگیری سفارش",
  "یکی از موارد زیر را در وب باز کنید، یا «وارد کردن کد» را بزنید.",
].join("\n");

export const TRACK_LIST_EMPTY = [
  "📦 هنوز درخواست یا سفارشی برای پیگیری ندارید.",
  "اگر کد دارید، آن را بفرستید:",
].join("\n");

export const ORDER_NOT_FOUND = [
  "🔎 با این کد چیزی پیدا نشد.",
  "کد را یک‌بار دیگر بررسی کنید و بفرستید.",
].join("\n");

export function orderStatusMessage(params: {
  code: string;
  statusLabel: string;
  totalTomanLabel: string;
  itemCount: number;
}): string {
  return [
    `📦 سفارش ${params.code}`,
    `📊 وضعیت: ${params.statusLabel}`,
    `🧺 تعداد کالا: ${params.itemCount}`,
    `💰 مبلغ کل: ${params.totalTomanLabel}`,
  ].join("\n");
}

export function trackSummary(params: {
  trackingCode: string;
  requestStatusLabel: string;
  itemCount: number;
  orderCode?: string | null;
  orderStatusLabel?: string | null;
  trackingUrl?: string | null;
}): string {
  const lines = [
    `🔖 کد پیگیری: <code>${escapeHtml(params.trackingCode)}</code>`,
    `📊 وضعیت درخواست: ${escapeHtml(params.requestStatusLabel)}`,
    `🧺 تعداد کالا: ${params.itemCount}`,
  ];
  if (params.orderCode && params.orderStatusLabel) {
    lines.push(
      `📦 سفارش <code>${escapeHtml(params.orderCode)}</code>: ${escapeHtml(params.orderStatusLabel)}`,
    );
  }
  if (params.trackingUrl) {
    lines.push("");
    lines.push("🌐 جزئیات کامل را در صفحه وب ببینید.");
  }
  return lines.join("\n");
}

// ─── Addresses ────────────────────────────────────────────────────
export const ADDRESSES_EMPTY = [
  "📍 هنوز آدرسی ثبت نکرده‌اید.",
  "با «➕ افزودن آدرس جدید» شروع کنید.",
].join("\n");
export const ADDRESSES_TITLE = "📍 آدرس‌های شما:";

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
    `👤 ${a.recipientName}${a.isDefault ? " ⭐ (پیش‌فرض)" : ""}`,
    `📱 ${a.mobile}`,
    `🏙 ${a.province}، ${a.city}`,
    `📫 ${a.address}`,
    `📮 کد پستی: ${a.postalCode}`,
  ];
  return lines.join("\n");
}

export const ADDRESS_ASK_RECIPIENT = "👤 نام گیرنده را بفرستید.";
export const ADDRESS_ASK_MOBILE = "📱 شماره موبایل گیرنده را بفرستید.";
export const ADDRESS_ASK_PROVINCE = "🗺 استان چیست؟";
export const ADDRESS_ASK_CITY = "🏙 شهر چیست؟";
export const ADDRESS_ASK_FULL = "🏠 آدرس کامل (خیابان، پلاک، واحد) را بفرستید.";
export const ADDRESS_ASK_POSTAL_CODE = "📮 کد پستی چیست؟";
export const ADDRESS_SAVED = "✅ آدرس ذخیره شد.";
export const ADDRESS_INVALID_MOBILE =
  "⚠️ شماره موبایل باید حداقل ۸ رقم باشد. دوباره بفرستید.";
export const ADDRESS_INVALID_POSTAL =
  "⚠️ کد پستی باید حداقل ۵ رقم باشد. دوباره بفرستید.";
export const ADDRESS_INVALID_TOO_SHORT =
  "⚠️ این مقدار خیلی کوتاه است. کامل‌تر بفرستید.";

// ─── Payments ─────────────────────────────────────────────────────
export const PAYMENTS_MENU_INTRO = [
  "💳 پرداخت",
  "",
  "۱) پیش‌فاکتور را تأیید کنید.",
  "۲) مبلغ اعلام‌شده به تومان را پرداخت کنید.",
  "۳) کد پرداخت و عکس رسید را اینجا بفرستید.",
].join("\n");

export const PENDING_QUOTES_TITLE = "💰 پیش‌فاکتورهای در انتظار پرداخت:";
export const PENDING_QUOTES_EMPTY =
  "📭 الان پیش‌فاکتور بازی برای پرداخت ندارید.";

export function quoteLine(params: { code: string; statusLabel: string; url?: string }): string {
  const lines = [`📄 ${params.code} — ${params.statusLabel}`];
  if (params.url) lines.push(`🔗 ${params.url}`);
  return lines.join("\n");
}

export const ASK_PAYMENT_ID = [
  "🆔 کد پرداخت را بفرستید.",
  "مثال: P-12345",
].join("\n");
export const ASK_PAYMENT_RECEIPT =
  "📸 عکس واضح رسید پرداخت را بفرستید.";
export const PAYMENT_ID_INVALID = [
  "⚠️ این کد درست به نظر نمی‌رسد.",
  "با فرمت P-12345 دوباره بفرستید.",
].join("\n");
export const RECEIPT_UPLOADED = [
  "✅ رسید دریافت شد.",
  "نتیجه را همینجا اعلام می‌کنیم.",
].join("\n");

// ─── Rules ────────────────────────────────────────────────────────
export const RULES_TEXT = [
  "📜 قوانین و هزینه‌ها",
  "",
  "🔍 قیمت هر کالا جداگانه به تومان اعلام می‌شود.",
  "🚚 هزینه ارسال جدا از قیمت کالا است.",
  "✅ تا تأیید پیش‌فاکتور، پرداختی انجام نمی‌شود.",
  "💳 بعد از تأیید، با روش‌های اعلام‌شده پرداخت کنید.",
  "📦 پس از تأیید پرداخت، سفارش پیگیری می‌شود.",
  "",
  "سوال؟ از «💬 پشتیبانی» پیام بدهید.",
].join("\n");

// ─── Support ──────────────────────────────────────────────────────
export const SUPPORT_ASK_HAS_ORDER = "💬 پیام شما درباره سفارش خاصی است؟";
export const SUPPORT_ASK_ORDER_CODE = [
  "📦 کد پیگیری یا سفارش را بفرستید.",
  "مثال: RQ-12345 یا HM-2026-01234",
].join("\n");
export const SUPPORT_ASK_BODY = [
  "✍️ چه کمکی از دستمان برمی‌آید؟",
  "هرچقدر دقیق‌تر بنویسید، زودتر کمک می‌کنیم.",
].join("\n");
export const SUPPORT_TICKET_CREATED = [
  "✅ پیام شما ثبت شد.",
  "به‌زودی پاسخ می‌دهیم.",
].join("\n");
export const SUPPORT_YES = "✅ بله";
export const SUPPORT_NO = "❌ خیر";

// ─── Errors ───────────────────────────────────────────────────────
export function friendlyError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && "status" in err) {
    const apiErr = err as { message: string; status: number };
    if (apiErr.status === 0) return ERROR_NETWORK;
    if (apiErr.message && !apiErr.message.startsWith("HTTP_")) return apiErr.message;
  }
  return ERROR_GENERIC;
}
