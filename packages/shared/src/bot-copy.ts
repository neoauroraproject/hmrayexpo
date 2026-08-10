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
    "سلام {name}! 👋",
    "",
    "به ربات خرید بین‌المللی HMRAY خوش اومدی ✨",
    "🆔 کد مشتری تو: {customerCode}",
    "",
    "از منوی پایین می‌تونی درخواست ثبت کنی، پرداخت کنی و سفارشت رو پیگیری کنی.",
    "قیمت‌ها همیشه به تومان ایران اعلام می‌شن 💰",
  ].join("\n"),
  welcomeBack: "سلام {name}، خوش برگشتی! 🌟\nاز منوی پایین ادامه بده.",
  channelGateMessage: [
    "🔐 برای استفاده از ربات، اول عضو کانال‌های زیر شو.",
    "",
    "بعد از عضویت، «✅ عضو شدم» رو بزن.",
  ].join("\n"),
  rulesText: [
    "📜 قوانین و هزینه‌ها — خلاصه شفاف",
    "",
    "🔍 قیمت هر کالا جداگانه و به تومان ایران اعلام می‌شه.",
    "🚚 هزینه ارسال جدا از قیمت کالا است.",
    "✅ تا تأیید پیش‌فاکتور، پرداختی انجام نمی‌شه.",
    "💳 بعد از تأیید، با روش‌های اعلام‌شده پرداخت کن.",
    "📦 پس از تأیید پرداخت، سفارش پیگیری می‌شه.",
    "",
    "سوال؟ از «💬 پشتیبانی» پیام بده.",
  ].join("\n"),
  chooseRequestType: "🛍️ از کجا می‌خوای خرید کنی؟\nیکی از گزینه‌ها رو انتخاب کن:",
  maintenanceMessage: "🛠 ربات موقتاً در حال به‌روزرسانی است.\nلطفاً کمی بعد دوباره سر بزن.",
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
    temu: "🧡 خرید از Temu",
    external: "🏪 خرید از سایر فروشگاه‌ها",
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
