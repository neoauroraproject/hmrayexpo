# متن ربات تلگرام (فارسی)

> Placeholder — copy for bot messages.

## /start

```
سلام {name}! 👋

به ربات خرید HMRAY خوش آمدید.

برای ثبت درخواست خرید، روی «درخواست جدید» بزنید.
```

## درخواست ثبت شد

```
درخواست شما با کد {requestId} ثبت شد.
تیم ما به‌زودی قیمت را ارسال می‌کند.
```

## پیش‌فاکتور

```
پیش‌فاکتور شما آماده است.
مبلغ: {amount}
اعتبار تا: {validUntil}
```

---

# اعلان‌های صف Worker (Phase 1)

> Final copy sent by `apps/worker` (`src/copy.ts`) when it delivers jobs from the
> `hmray-notifications` queue. `{...}` placeholders are filled from the job
> payload; lines are omitted when the field is missing.

## تست اتصال (`test`)

```
«پیام تست HMRAY»
{message}
درخواست‌دهنده: {requestedBy}
اتصال ربات و صف اعلان‌ها سالم است ✅
```

## درخواست جدید — به ادمین (`NEW_REQUEST`)

```
🆕 درخواست خرید جدید
کد درخواست: {requestCode}
مشتری: {customerCode}
نوع: {requestType}
تعداد کالا: {itemCount}

مشاهده در پنل ادمین:
{adminPanelUrl}/requests/{requestCode}
```

## پیش‌فاکتور ارسال شد — به مشتری (`QUOTE_SENT`)

```
💰 پیش‌فاکتور شما آماده شد!
کد پیش‌فاکتور: {quoteCode}

#1 {عنوان کالا} — {قیمت}
#2 {عنوان کالا} — {قیمت}
...

جمع کل: {totalLabel}
اعتبار تا: {expiresAt}

مشاهده و پرداخت:
{quoteUrl}
```

## پیش‌فاکتور منقضی شد — به مشتری (`QUOTE_EXPIRED`)

```
⏰ پیش‌فاکتور {quoteCode} منقضی شد؛ قیمت دیگه اعتبار نداره.
برای گرفتن قیمت جدید، دوباره از ربات درخواست بده.
```

## پرداخت جدید — به ادمین (`PAYMENT_SUBMITTED`)

```
💳 پرداخت جدید ثبت شد
کد پرداخت: {paymentCode}
مشتری: {customerCode}
مبلغ: {amountLabel}

بررسی در پنل ادمین:
{adminPanelUrl}/payments/{paymentCode}
```

## رسید پرداخت بارگذاری شد — به ادمین (`PAYMENT_RECEIPT_UPLOADED`)

```
🧾 رسید پرداخت بارگذاری شد و در انتظار بررسی است.
کد پرداخت: {paymentCode}

بررسی در پنل ادمین:
{adminPanelUrl}/payments/{paymentCode}
```

## پرداخت تأیید شد — به مشتری (`PAYMENT_CONFIRMED`)

```
✅ پرداخت شما تأیید شد و سفارش {orderCode} وارد مرحله خرید شد.
```

## پرداخت رد شد — به مشتری (`PAYMENT_REJECTED`)

```
❌ پرداخت شما تأیید نشد.
کد پرداخت: {paymentCode}
دلیل: {reason}
```

## پیام پشتیبانی — به طرف مقابل (`SUPPORT_MESSAGE`)

```
💬
{title}
{body}
```

## سفارش جدید — به ادمین (`NEW_ORDER`)

```
🛒 سفارش جدید ثبت شد
کد سفارش: {orderCode}
مشتری: {customerCode}
مبلغ: {totalLabel}

مشاهده در پنل ادمین:
{adminPanelUrl}/orders/{orderCode}
```

## سفارش جدید — به مشتری (`NEW_ORDER`)

```
🛒 سفارش شما {orderCode} به مبلغ {totalLabel} ثبت شد و در حال پردازش است.
```

## سایر رویدادها

هر رویداد بدون قالب اختصاصی (`QUOTE_ACCEPTED`، `ORDER_READY`، `QUALITY_ISSUE`، ...) با همان
`title`/`body` فارسی که API از قبل ساخته مستقیماً ارسال می‌شود.
