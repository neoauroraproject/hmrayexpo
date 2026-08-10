/** Shared bot UX copy — editable from Admin → Settings. */

export interface BotCopyMenus {
  newRequest: string;
  myRequests: string;
  trackOrder: string;
  myAddresses: string;
  payments: string;
  rules: string;
  support: string;
}

export interface BotCopyServices {
  temu: string;
  external: string;
  temuEnabled: boolean;
  externalEnabled: boolean;
}

export interface BotCopyConfig {
  welcome: string;
  welcomeBack: string;
  channelGateMessage: string;
  rulesText: string;
  chooseRequestType: string;
  maintenanceMessage: string;
  menus: BotCopyMenus;
  services: BotCopyServices;
}

export const DEFAULT_BOT_COPY: BotCopyConfig = {
  welcome: [
    "سلام {name} 👋",
    "",
    "به HMRAY خوش آمدید.",
    "کد مشتری: {customerCode}",
    "",
    "از منوی پایین درخواست ثبت کنید، پرداخت کنید یا سفارشتان را پیگیری کنید.",
  ].join("\n"),
  welcomeBack: "سلام {name}، خوش برگشتید ✨\nاز منو ادامه دهید.",
  channelGateMessage: [
    "🔐 برای استفاده از ربات، ابتدا عضو کانال‌های زیر شوید.",
    "",
    "سپس «✅ عضو شدم» را بزنید.",
  ].join("\n"),
  rulesText: [
    "📜 قوانین و هزینه‌ها",
    "",
    "🔍 قیمت هر کالا جداگانه به تومان اعلام می‌شود.",
    "🚚 هزینه ارسال جدا از قیمت کالا است.",
    "✅ تا تأیید پیش‌فاکتور، پرداختی انجام نمی‌شود.",
    "💳 بعد از تأیید، با روش‌های اعلام‌شده پرداخت کنید.",
    "📦 پس از تأیید پرداخت، سفارش پیگیری می‌شود.",
    "",
    "سوال؟ از «💬 پشتیبانی» پیام بدهید.",
  ].join("\n"),
  chooseRequestType: "🛍️ از کجا می‌خرید؟\nیکی از گزینه‌ها را انتخاب کنید:",
  maintenanceMessage: "🛠 ربات موقتاً در حال به‌روزرسانی است.\nلطفاً کمی بعد دوباره سر بزنید.",
  menus: {
    newRequest: "🛒 ثبت درخواست خرید",
    myRequests: "📋 درخواست‌های من",
    trackOrder: "📦 پیگیری سفارش",
    myAddresses: "📍 آدرس‌های من",
    payments: "💳 پرداخت‌ها",
    rules: "📜 قوانین و هزینه‌ها",
    support: "💬 پشتیبانی",
  },
  services: {
    temu: "🧡 Temu",
    external: "🏪 فروشگاه‌های دیگر",
    temuEnabled: true,
    externalEnabled: true,
  },
};

export function mergeBotCopy(partial?: Partial<BotCopyConfig> | null): BotCopyConfig {
  if (!partial || typeof partial !== "object") {
    return structuredClone(DEFAULT_BOT_COPY);
  }
  return {
    ...DEFAULT_BOT_COPY,
    ...partial,
    menus: {
      ...DEFAULT_BOT_COPY.menus,
      ...(partial.menus ?? {}),
    },
    services: {
      ...DEFAULT_BOT_COPY.services,
      ...(partial.services ?? {}),
    },
  };
}

export function interpolateBotCopy(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
