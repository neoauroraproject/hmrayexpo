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
  /** Intro shown when customer taps «ثبت درخواست خرید» (supports multi-line + [label](url)). */
  chooseRequestType: string;
  /** Shown after choosing Temu, before/when collecting items. */
  temuStartMessage: string;
  /** Shown after choosing other stores (and store name), when collecting items. */
  externalStartMessage: string;
  maintenanceMessage: string;
  menus: BotCopyMenus;
  services: BotCopyServices;
}

export const DEFAULT_BOT_COPY: BotCopyConfig = {
  welcome: [
    "سلام {name} 👋",
    "",
    "به HMray Expo خوش آمدید.",
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
  chooseRequestType: [
    "🛍 از کجا می‌خوای خرید کنی؟",
    "",
    "### 🛒 خرید از Temu",
    "",
    "[www.temu.com](https://www.temu.com)",
    "",
    "هر محصولی که می‌خوای رو از Temu پیدا کن و لینک یا عکسش رو برای ما بفرست. می‌تونی چندین محصول رو در یک درخواست اضافه کنی و در نهایت همه رو یکجا برات تهیه کنیم.",
    "",
    "امکان بررسی کالا قبل از ارسال به ایران هم وجود داره.",
    "",
    "💡 فعلاً هیچ پرداختی لازم نیست؛ فقط محصولاتت رو بفرست و در پایان **ثبت نهایی** کن تا قیمت رو برات محاسبه کنیم.",
    "",
    "### 🌎 خرید از سایر فروشگاه‌ها",
    "",
    "لینک محصولت رو از هر فروشگاه و هر کشوری که هست برامون بفرست.",
    "",
    "شرایط خرید، ارسال، تجمیع کالا و مرجوعی هر فروشگاه متفاوته و قبل از خرید بررسی می‌شه.",
    "",
    "💰 قیمت و شرایط نهایی همیشه قبل از پرداخت بهت اعلام می‌شه.",
  ].join("\n"),
  temuStartMessage: [
    "🧡 خرید از Temu",
    "",
    "لینک یا عکس محصول Temu را بفرستید.",
    "می‌توانید توضیح هم کنارش بنویسید؛ مثلاً رنگ / سایز.",
    "",
    "هر تعداد کالا اضافه کنید؛ در پایان «✅ ثبت نهایی» را بزنید.",
  ].join("\n"),
  externalStartMessage: [
    "🏪 خرید از سایر فروشگاه‌ها",
    "",
    "لینک یا عکس محصول را بفرستید.",
    "می‌توانید توضیح هم کنارش بنویسید.",
    "",
    "هر تعداد کالا اضافه کنید؛ در پایان «✅ ثبت نهایی» را بزنید.",
  ].join("\n"),
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
    temu: "🛒 خرید از Temu",
    external: "🌎 خرید از سایر فروشگاه‌ها",
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
