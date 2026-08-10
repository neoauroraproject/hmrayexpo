/** Hardcoded Persian labels for the admin Telegram mini-menu. */
export const ADMIN_COPY = {
  welcome: (name: string) =>
    [`سلام ${name}!`, "", "منوی مدیریت HMRAY فعال است.", "از دکمه‌های زیر استفاده کن."].join(
      "\n",
    ),
  summaryTitle: "📊 خلاصه وضعیت",
  broadcasts: "📢 پیام همگانی (پنل)",
  pendingPayments: "🧾 پرداخت‌های در انتظار",
  newRequests: "🆕 درخواست‌های جدید",
  customerMenu: "👤 منوی مشتری",
  notAdmin: "این بخش فقط برای ادمین در دسترس است.",
  panelHint: (url: string) => `باز کردن پنل:\n${url}`,
} as const;
