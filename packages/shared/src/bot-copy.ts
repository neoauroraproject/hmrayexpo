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
    "سلام {name}!",
    "",
    "به ربات خرید HMRAY خوش اومدی.",
    "کد مشتری تو: {customerCode}",
    "",
    "از دکمه‌های پایین هر کاری خواستی رو انجام بده.",
  ].join("\n"),
  welcomeBack: "سلام {name}، خوش برگشتی!",
  channelGateMessage: [
    "برای استفاده از ربات، اول باید عضو کانال‌های زیر بشی.",
    "بعد از عضویت، «✅ عضو شدم» رو بزن.",
  ].join("\n"),
  rulesText: [
    "قوانین و هزینه‌ها، خلاصه:",
    "",
    "• قیمت هر کالا رو جدا بررسی و اعلام می‌کنیم، معمولاً تا ۳ روز کاری.",
    "• هزینه ارسال جدا از قیمت کالاست و توی پیش‌فاکتور مشخص می‌شه.",
    "• تا وقتی پیش‌فاکتور رو تأیید نکردی، هیچ پرداختی انجام نمی‌شه.",
    "• پرداخت فقط بعد از تأیید پیش‌فاکتور و با روش‌های اعلام‌شده انجام می‌شه.",
    "• بعد از پرداخت و تأیید، سفارش ثبت و پیگیری می‌شه.",
    "• برای هر سؤال دیگه، از بخش «پشتیبانی» با ما در تماس باش.",
  ].join("\n"),
  chooseRequestType: "می‌خوای از کجا خرید کنی؟",
  maintenanceMessage: "ربات موقتاً در دسترس نیست. لطفاً کمی بعد دوباره سر بزن.",
  menus: {
    newRequest: "ثبت درخواست خرید",
    myRequests: "درخواست‌های من",
    trackOrder: "پیگیری سفارش",
    myAddresses: "آدرس‌های من",
    payments: "پرداخت‌ها",
    rules: "قوانین و هزینه‌ها",
    support: "پشتیبانی",
  },
  services: {
    temu: "خرید از Temu",
    external: "خرید از سایر فروشگاه‌ها",
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
