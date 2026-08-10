/**
 * Customer-facing Persian copy for the Telegram bot.
 * Tone: warm, clear, emoji-friendly. Never show raw Telegram user ids —
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
export const BTN_FINALIZE = "✅ ثبت نهایی درخواست";
export const BTN_DELETE_ITEM = "🗑 حذف یک محصول";
export const BTN_BACK = "🏠 بازگشت به منو";
export const BTN_ADD_ADDRESS = "➕ افزودن آدرس جدید";
export const BTN_SEND_RECEIPT = "🧾 ارسال رسید پرداخت";
export const BTN_SKIP = "-";

// ─── Request-type inline buttons ────────────────────────────────
export const BTN_TEMU = "🧡 خرید از Temu";
export const BTN_EXTERNAL = "🏪 خرید از سایر فروشگاه‌ها";

// ─── Generic ──────────────────────────────────────────────────
export const ERROR_GENERIC =
  "😔 یه مشکلی پیش اومد.\nلطفاً چند لحظه دیگه دوباره امتحان کن. اگه ادامه داشت، از «💬 پشتیبانی» پیام بده.";
export const ERROR_NETWORK =
  "📡 الان به سرور وصل نیستیم.\nچند ثانیه صبر کن و دوباره تست کن.";
export const ERROR_NOT_FOUND = "🔎 چیزی که دنبالش بودیم پیدا نشد.";
export const CANCELLED_GENERIC = "👌 باشه، لغو شد.\nهر وقت خواستی از منو دوباره شروع کن.";
export const BACK_TO_MENU = "🏠 برگشتیم به منوی اصلی.";
export const UNKNOWN_COMMAND = [
  "🤔 متوجه نشدم.",
  "",
  "از دکمه‌های پایین صفحه استفاده کن.",
  "اگه گیر کردی، /start رو بزن تا منو دوباره بیاد.",
].join("\n");

export function welcome(name: string, customerCode: string): string {
  return [
    `سلام ${name}! 👋`,
    "",
    "به ربات خرید بین‌المللی HMRAY خوش اومدی ✨",
    `🆔 کد مشتری تو: ${customerCode}`,
    "",
    "از منوی پایین می‌تونی:",
    "🛒 درخواست خرید ثبت کنی",
    "📋 وضعیت درخواست‌ها رو ببینی",
    "💳 پرداخت و ارسال رسید انجام بدی",
    "📦 سفارشت رو پیگیری کنی",
    "",
    "هر سوالی داشتی، «💬 پشتیبانی» اینجاست.",
  ].join("\n");
}

export function welcomeBack(name: string): string {
  return `سلام ${name}، خوش برگشتی! 🌟\nاز منوی پایین ادامه بده.`;
}

// ─── Required channels gate ──────────────────────────────────────
export const CHANNEL_GATE_MESSAGE = [
  "🔐 برای استفاده از ربات، اول عضو کانال‌های زیر شو.",
  "",
  "بعد از عضویت، دکمه «✅ عضو شدم» رو بزن تا ادامه‌ش بدیم.",
].join("\n");

export const CHANNEL_GATE_STILL_MISSING = [
  "😕 هنوز عضو همه کانال‌ها نشدی.",
  "عضو شو و دوباره «✅ عضو شدم» رو بزن.",
].join("\n");

export const CHANNEL_GATE_PASSED = "🎉 عالی! عضویتت تأیید شد. خوش اومدی.";

// ─── New request flow ────────────────────────────────────────────
export const CHOOSE_REQUEST_TYPE = [
  "🛍️ از کجا می‌خوای خرید کنی؟",
  "",
  "یکی از گزینه‌های زیر رو انتخاب کن:",
].join("\n");

export const ASK_STORE_NAME = [
  "🏪 اسم فروشگاه چیه؟",
  "",
  "اگه نمی‌دونی یا مهم نیست، فقط «-» رو بفرست.",
].join("\n");

export const REQUEST_OPENED_FIRST_ITEM = [
  "🎯 عالیه! درخواست باز شد.",
  "",
  "حالا لینک محصول یا عکسش رو بفرست.",
  "🔢 هر چند تا که خواستی پشت‌سر‌هم بفرست — لازم نیست صبر کنی.",
  "",
  "وقتی تموم شد، دکمه «✅ ثبت نهایی درخواست» رو بزن.",
].join("\n");

export const FIRST_ITEM_ACK = [
  "✅ آیتم اضافه شد!",
  "",
  "می‌تونی لینک یا عکس بعدی رو بفرستی.",
  "وقتی لیست کامل شد، «✅ ثبت نهایی درخواست» رو بزن.",
].join("\n");

export function itemAdded(displayIndex: number): string {
  return [
    `✅ کالای #${String(displayIndex).padStart(2, "0")} اضافه شد.`,
    "",
    "لینک/عکس بعدی رو بفرست، یا «✅ ثبت نهایی درخواست» رو بزن.",
  ].join("\n");
}

export const ITEM_SOURCE_NEEDED = [
  "🔗 برای هر کالا یه لینک یا عکس لازم داریم.",
  "",
  "اگه توضیحی داری (رنگ، سایز، تعداد)، همراه لینک بنویس یا به‌صورت کپشن روی عکس بفرست.",
].join("\n");

export const NO_OPEN_REQUEST =
  "📭 درخواست بازی نداری.\nاز «🛒 ثبت درخواست خرید» شروع کن.";

export const NO_ITEMS_TO_DELETE = "🗑 این درخواست هنوز کالایی نداره.";

export const CHOOSE_ITEM_TO_DELETE = "کدوم کالا رو حذف کنم؟ 👇";

export function itemDeleted(displayIndex: number): string {
  return `🗑 کالای #${String(displayIndex).padStart(2, "0")} حذف شد.`;
}

export const REQUEST_EMPTY_ON_FINALIZE = [
  "📭 هنوز کالایی توی این درخواست نیست.",
  "اول یه لینک یا عکس بفرست، بعد ثبت نهایی رو بزن.",
].join("\n");

export function requestFinalized(code: string): string {
  return [
    "🎉 درخواستت ثبت شد!",
    `🆔 کد پیگیری: ${code}`,
    "",
    "کارشناس ما لینک‌ها/عکس‌ها رو بررسی می‌کنه و قیمت هر کالا رو به تومان ایران برات اعلام می‌کنه.",
    "",
    "⏳ معمولاً تا چند روز کاری طول می‌کشه.",
    "💰 فعلاً هیچ مبلغی پرداخت نکن — اول پیش‌فاکتور می‌اد.",
    "",
    "وضعیت رو از «📋 درخواست‌های من» هم می‌تونی ببینی.",
  ].join("\n");
}

export const REQUEST_CANCELLED_DRAFT = [
  "👌 باشه، فعلاً کنسل کردیم.",
  "",
  "پیش‌نویس دست‌نخورده موند؛ هر وقت خواستی از «📋 درخواست‌های من» ادامه‌اش بده.",
].join("\n");

// ─── My requests ──────────────────────────────────────────────────
export const MY_REQUESTS_EMPTY = [
  "📋 هنوز درخواستی ثبت نکردی.",
  "از «🛒 ثبت درخواست خرید» شروع کن.",
].join("\n");
export const MY_REQUESTS_TITLE = "📋 درخواست‌های تو:";

export function requestSummary(params: {
  code: string;
  statusLabel: string;
  itemCount: number;
  isDraft: boolean;
  latestQuoteLine?: string;
}): string {
  const lines = [
    `🆔 ${params.code}${params.isDraft ? " (پیش‌نویس ✍️)" : ""}`,
    `📊 وضعیت: ${params.statusLabel}`,
    `🧺 تعداد کالا: ${params.itemCount}`,
  ];
  if (params.latestQuoteLine) {
    lines.push(params.latestQuoteLine);
  }
  return lines.join("\n");
}

export const CONTINUE_DRAFT_HINT = "برای ادامه این درخواست، دکمه زیر رو بزن 👇";

// ─── Track order ─────────────────────────────────────────────────
export const ASK_ORDER_CODE = [
  "📦 کد سفارشت رو بفرست.",
  "مثال: HM-2026-01234",
].join("\n");

export const ORDER_NOT_FOUND = [
  "🔎 سفارشی با این کد پیدا نشد.",
  "کد رو یک‌بار دیگه چک کن و بفرست.",
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

// ─── Addresses ────────────────────────────────────────────────────
export const ADDRESSES_EMPTY = [
  "📍 هنوز آدرسی ثبت نکردی.",
  "با «➕ افزودن آدرس جدید» اولین آدرست رو ذخیره کن.",
].join("\n");
export const ADDRESSES_TITLE = "📍 آدرس‌های تو:";

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

export const ADDRESS_ASK_RECIPIENT = "👤 اسم گیرنده رو بفرست.";
export const ADDRESS_ASK_MOBILE = "📱 شماره موبایل گیرنده رو بفرست.";
export const ADDRESS_ASK_PROVINCE = "🗺 استان چیه؟";
export const ADDRESS_ASK_CITY = "🏙 شهر چیه؟";
export const ADDRESS_ASK_FULL = "🏠 آدرس کامل (خیابان، پلاک، واحد) رو بفرست.";
export const ADDRESS_ASK_POSTAL_CODE = "📮 کد پستی چیه؟";
export const ADDRESS_SAVED = "✅ آدرس با موفقیت ذخیره شد.";
export const ADDRESS_INVALID_MOBILE =
  "⚠️ شماره موبایل باید حداقل ۸ رقم باشه. دوباره بفرست.";
export const ADDRESS_INVALID_POSTAL =
  "⚠️ کد پستی باید حداقل ۵ رقم باشه. دوباره بفرست.";
export const ADDRESS_INVALID_TOO_SHORT =
  "⚠️ این مقدار خیلی کوتاهه. کامل‌تر بفرست.";

// ─── Payments ─────────────────────────────────────────────────────
export const PAYMENTS_MENU_INTRO = [
  "💳 بخش پرداخت",
  "",
  "۱) اول پیش‌فاکتور رو از لینک/دکمه‌ای که برات فرستادیم تأیید کن.",
  "۲) مبلغ اعلام‌شده به تومان ایران رو پرداخت کن.",
  "۳) کد پرداخت (مثل P-12345) و بعد عکس رسید رو اینجا بفرست.",
  "",
  "اگه پیش‌فاکتور آماده‌ای داری، از دکمه‌های زیر استفاده کن.",
].join("\n");

export const PENDING_QUOTES_TITLE = "💰 پیش‌فاکتورهای در انتظار پرداخت:";
export const PENDING_QUOTES_EMPTY =
  "📭 الان پیش‌فاکتور بازی برای پرداخت نداری.";

export function quoteLine(params: { code: string; statusLabel: string; url?: string }): string {
  const lines = [`📄 ${params.code} — ${params.statusLabel}`];
  if (params.url) lines.push(`🔗 ${params.url}`);
  return lines.join("\n");
}

export const ASK_PAYMENT_ID = [
  "🆔 کد پرداخت رو بفرست.",
  "مثال: P-12345",
].join("\n");
export const ASK_PAYMENT_RECEIPT =
  "📸 حالا عکس واضح رسید پرداخت رو بفرست.";
export const PAYMENT_ID_INVALID = [
  "⚠️ این کد درست به نظر نمی‌رسه.",
  "با فرمت P-12345 دوباره بفرست.",
].join("\n");
export const RECEIPT_UPLOADED = [
  "✅ رسید دریافت شد!",
  "",
  "تیم مالی بررسیش می‌کنه و نتیجه رو همینجا بهت اعلام می‌کنیم. 🙏",
].join("\n");

// ─── Rules ────────────────────────────────────────────────────────
export const RULES_TEXT = [
  "📜 قوانین و هزینه‌ها — خلاصه شفاف",
  "",
  "🔍 قیمت هر کالا جداگانه بررسی و به تومان ایران اعلام می‌شه (معمولاً تا چند روز کاری).",
  "🚚 هزینه ارسال جدا از قیمت کالا است و توی پیش‌فاکتور می‌اد.",
  "✅ تا وقتی پیش‌فاکتور رو تأیید نکنی، هیچ پرداختی انجام نمی‌شه.",
  "💳 پرداخت فقط بعد از تأیید پیش‌فاکتور و با روش‌های اعلام‌شده.",
  "📦 بعد از تأیید پرداخت، سفارشت ثبت و مرحله‌به‌مرحله پیگیری می‌شه.",
  "",
  "سوال داشتی؟ «💬 پشتیبانی» همیشه در دسترسه.",
].join("\n");

// ─── Support ──────────────────────────────────────────────────────
export const SUPPORT_ASK_HAS_ORDER = "💬 پیامت درباره یه سفارش خاصه؟";
export const SUPPORT_ASK_ORDER_CODE = [
  "📦 کد سفارش رو بفرست.",
  "مثال: HM-2026-01234",
].join("\n");
export const SUPPORT_ASK_BODY = [
  "✍️ بگو چه کمکی از دستمون برمیاد؟",
  "هرچقدر دقیق‌تر بنویسی، زودتر کمکت می‌کنیم.",
].join("\n");
export const SUPPORT_TICKET_CREATED = [
  "✅ پیامت ثبت شد.",
  "به‌زودی جواب می‌دیم. ممنون از صبرت 🙏",
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
