/**
 * Persian copy for everything a customer (bot / public web) can see.
 * Admin-only failures may stay in English — they are read by operators, not buyers.
 */
export const FA = {
  AUTH_INVALID_CREDENTIALS: "نام کاربری یا رمز عبور نادرست است.",
  AUTH_ACCOUNT_DISABLED: "حساب کاربری شما غیرفعال شده است.",
  AUTH_UNAUTHORIZED: "برای انجام این کار باید وارد شوید.",
  AUTH_FORBIDDEN: "شما مجوز انجام این عملیات را ندارید.",
  BOT_SECRET_INVALID: "دسترسی ربات معتبر نیست.",
  BOT_SECRET_MISSING: "سرویس ربات پیکربندی نشده است.",

  USER_NOT_FOUND: "کاربر یافت نشد.",
  USER_BLOCKED: "حساب کاربری شما مسدود شده است.",

  REQUEST_NOT_FOUND: "درخواست یافت نشد.",
  REQUEST_ITEM_NOT_FOUND: "کالای موردنظر در این درخواست یافت نشد.",
  REQUEST_ALREADY_SUBMITTED: "این درخواست قبلاً ثبت نهایی شده است.",
  REQUEST_EMPTY: "برای ثبت نهایی، حداقل یک کالا اضافه کنید.",
  REQUEST_CLOSED: "این درخواست بسته شده و قابل ویرایش نیست.",
  REQUEST_INVALID_TRANSITION: "تغییر وضعیت درخواست مجاز نیست.",
  ITEM_SOURCE_REQUIRED: "برای هر کالا، لینک یا تصویر لازم است.",

  QUOTE_NOT_FOUND: "پیش‌فاکتور یافت نشد.",
  QUOTE_EXPIRED: "مهلت این پیش‌فاکتور به پایان رسیده است. لطفاً درخواست جدید ثبت کنید.",
  QUOTE_NOT_SENT: "این پیش‌فاکتور هنوز برای شما ارسال نشده است.",
  QUOTE_ALREADY_ACCEPTED: "این پیش‌فاکتور قبلاً تأیید شده است.",
  QUOTE_ALREADY_REJECTED: "این پیش‌فاکتور قبلاً رد شده است.",
  QUOTE_NOT_ACCEPTED: "ابتدا باید پیش‌فاکتور تأیید شود.",
  QUOTE_EMPTY: "پیش‌فاکتور بدون کالا قابل ارسال نیست.",
  QUOTE_NOT_DRAFT: "فقط پیش‌فاکتور پیش‌نویس قابل ویرایش یا ارسال است.",
  QUOTE_TERMS_REQUIRED: "برای ادامه، باید همه شرایط را بپذیرید.",
  QUOTE_SUPERSEDED: "نسخه جدیدی از این پیش‌فاکتور صادر شده است.",
  QUOTE_NOT_OWNED: "این پیش‌فاکتور متعلق به شما نیست.",

  RATE_MISSING: "نرخ ارز هنوز تعیین نشده است. لطفاً با پشتیبانی تماس بگیرید.",

  PAYMENT_NOT_FOUND: "پرداخت یافت نشد.",
  PAYMENT_ALREADY_FINALIZED: "وضعیت این پرداخت قبلاً نهایی شده است.",
  PAYMENT_METHOD_NOT_FOUND: "روش پرداخت یافت نشد.",
  PAYMENT_METHOD_DISABLED: "این روش پرداخت در حال حاضر فعال نیست.",
  PAYMENT_AMOUNT_INVALID: "مبلغ پرداخت معتبر نیست.",

  ORDER_NOT_FOUND: "سفارش یافت نشد.",
  ORDER_INVALID_TRANSITION: "تغییر وضعیت سفارش مجاز نیست.",
  ORDER_PURCHASE_REQUIRES_PAYMENT:
    "تا زمانی که پرداخت تأیید نشود، سفارش قابل ثبت خرید نیست.",
  ORDER_ALREADY_EXISTS: "برای این پیش‌فاکتور قبلاً سفارش ثبت شده است.",
  ORDER_REASON_REQUIRED: "برای ثبت دستی سفارش، ذکر دلیل الزامی است.",

  ADDRESS_NOT_FOUND: "آدرس یافت نشد.",

  TICKET_NOT_FOUND: "تیکت پشتیبانی یافت نشد.",
  TICKET_CLOSED: "این تیکت بسته شده است.",

  CHANNEL_NOT_FOUND: "کانال یافت نشد.",

  BATCH_NOT_FOUND: "بسته خرید گروهی یافت نشد.",
  BATCH_CODE_TAKEN: "این کد بسته قبلاً استفاده شده است.",
  BATCH_CLOSED: "این بسته بسته شده و قابل تغییر نیست.",
  BATCH_INVALID_STATUS: "تغییر وضعیت بسته مجاز نیست.",
  BATCH_ORDER_NOT_TEMU: "فقط سفارش‌های Temu به بسته گروهی اضافه می‌شوند.",
  BATCH_ORDER_NOT_PAYABLE: "فقط سفارش تأییدشده یا پرداخت‌شده قابل افزودن است.",
  BATCH_ORDER_ALREADY_LINKED: "این سفارش قبلاً در یک بسته ثبت شده است.",
  BATCH_ORDER_NOT_LINKED: "این سفارش در این بسته نیست.",

  SHIPPING_METHOD_NOT_FOUND: "روش ارسال یافت نشد.",
  SHIPPING_RATE_NOT_FOUND: "تعرفه ارسال یافت نشد.",
  SHIPPING_RATE_MISSING: "برای این وزن تعرفه‌ای تعریف نشده است.",
  SHIPPING_RATE_RANGE_INVALID: "بازه وزنی تعرفه معتبر نیست.",
  SHIPPING_RATE_PRICE_REQUIRED: "برای تعرفه باید قیمت ثابت یا نرخ هر کیلو تعیین شود.",
  SHIPMENT_NOT_FOUND: "مرسوله‌ای برای این سفارش ثبت نشده است.",
  TRACKING_EVENT_NOT_FOUND: "رویداد رهگیری یافت نشد.",

  QUALITY_CHECK_NOT_FOUND: "گزارش بازرسی یافت نشد.",

  RETURN_NOT_FOUND: "درخواست مرجوعی یافت نشد.",
  RETURN_ALREADY_OPEN: "برای این سفارش یک درخواست مرجوعی باز وجود دارد.",
  RETURN_INVALID_TRANSITION: "تغییر وضعیت مرجوعی مجاز نیست.",
  RETURN_NOT_REFUNDABLE: "تا زمانی که مرجوعی به مرحله بازپرداخت نرسد، ثبت بازپرداخت ممکن نیست.",
  REFUND_NOT_FOUND: "بازپرداخت یافت نشد.",
  REFUND_AMOUNT_INVALID: "مبلغ بازپرداخت معتبر نیست.",
  REFUND_EXCEEDS_ORDER: "مبلغ بازپرداخت از مبلغ سفارش بیشتر است.",

  BROADCAST_NOT_FOUND: "پیام همگانی یافت نشد.",
  BROADCAST_NOT_DRAFT: "فقط پیام همگانی پیش‌نویس قابل ویرایش یا ارسال است.",
  BROADCAST_NO_RECIPIENTS: "هیچ مخاطبی با این فیلتر پیدا نشد.",

  UPLOAD_REQUIRED: "فایلی ارسال نشده است.",
  UPLOAD_INVALID_TYPE: "فقط فایل تصویری مجاز است.",
  UPLOAD_TOO_LARGE: "حجم فایل باید کمتر از ۵ مگابایت باشد.",

  /**
   * Shown alongside every EXTERNAL_STORE return: those sellers rarely accept
   * returns, so nothing may be promised to the customer before the seller answers.
   */
  EXTERNAL_STORE_RETURN_WARNING:
    "این سفارش از فروشگاه خارجی تهیه شده است. امکان مرجوعی و بازپرداخت به سیاست همان فروشنده بستگی دارد و تا پاسخ فروشنده هیچ تعهدی به مشتری داده نمی‌شود.",

  NOT_FOUND: "موردی یافت نشد.",
  INVALID_INPUT: "اطلاعات ارسال‌شده معتبر نیست.",
} as const;
