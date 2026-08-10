"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { Button } from "../../../components/ui/Button";

interface TrackItem {
  displayIndex: number;
  productCode: string;
  originalUrl: string | null;
  images: string[];
  userNote: string | null;
  status: string;
}

interface TrackQuote {
  code: string;
  status: string;
  productsTotalLabel: string;
  url: string;
  expiresAt: string;
  acceptedAt: string | null;
}

interface TrackPayment {
  code: string;
  status: string;
  amountLabel: string;
  createdAt: string;
}

interface TrackTimelineEvent {
  toStatus: string;
  createdAt: string;
}

interface TrackData {
  trackingCode: string;
  customerCode: string | null;
  trackingUrl?: string;
  request: {
    id: string;
    code: string;
    type: string;
    status: string;
    submittedAt: string | null;
    storeName: string | null;
    items: TrackItem[];
  };
  quotes: TrackQuote[];
  order: null | {
    code: string;
    status: string;
    totalTomanLabel: string;
    deliveredAt: string | null;
    timeline: TrackTimelineEvent[];
    shipment?: {
      status?: string;
      shippedAt?: string | null;
      deliveredAt?: string | null;
    };
  };
  payments: TrackPayment[];
}

const requestStatusLabels: Record<string, string> = {
  REQUESTED: "در حال بررسی",
  UNDER_REVIEW: "در حال بررسی توسط تیم",
  QUOTED: "قیمت‌گذاری‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغوشده",
};

const orderStatusLabels: Record<string, string> = {
  CONFIRMED: "ثبت‌شده",
  PAID: "پرداخت‌شده",
  PURCHASING: "در حال خرید",
  PURCHASED: "خریداری‌شده",
  IN_TRANSIT_TO_OMAN: "در مسیر عمان",
  ARRIVED_OMAN: "رسیده به عمان",
  QUALITY_CHECK: "بازرسی کیفیت",
  READY_FOR_IRAN: "آماده ارسال به ایران",
  SHIPPING_TO_IRAN: "در مسیر ایران",
  ARRIVED_IRAN: "رسیده به ایران",
  DOMESTIC_DELIVERY: "ارسال داخلی",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  UNDER_REVIEW: "در حال بررسی",
  CONFIRMED: "تأییدشده",
  REJECTED: "ردشده",
  REFUNDED: "برگشت‌داده‌شده",
};

const quoteStatusLabels: Record<string, string> = {
  SENT: "ارسال‌شده",
  ACCEPTED: "تأییدشده",
  REJECTED: "ردشده",
  EXPIRED: "منقضی‌شده",
  SUPERSEDED: "نسخه جدیدتر",
};

function formatFaDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export function TrackClient({ code }: { code: string }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTrack();
  }, [code]);

  async function loadTrack() {
    try {
      setLoading(true);
      setError("");
      const result = await apiFetch<TrackData>(`/public/track/${encodeURIComponent(code)}`);
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطا در دریافت اطلاعات";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm tracking-wide text-stone-500">در حال بارگذاری…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-stone-700">{error || "موردی پیدا نشد"}</p>
        <Button onClick={loadTrack} variant="outline" className="mt-6">
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
  const timeline =
    data.order?.timeline?.length
      ? data.order.timeline
      : data.order
        ? [{ toStatus: data.order.status, createdAt: data.request.submittedAt ?? "" }]
        : [];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[radial-gradient(ellipse_at_top,_#f7f3ec_0%,_#f0ebe3_45%,_#e8e2d8_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a89880' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-lg px-4 py-10 pb-24">
        <header className="mb-10 text-center">
          <p className="text-[11px] font-medium tracking-[0.28em] text-stone-500">HMRAY</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
            {data.trackingCode}
          </h1>
          <p className="mt-2 text-sm text-stone-600">کد پیگیری شما تا تحویل</p>
          {data.customerCode && (
            <p className="mt-3 text-xs text-stone-500">مشتری: {data.customerCode}</p>
          )}
          <div className="mt-5 inline-flex items-center rounded-full border border-stone-300/80 bg-white/70 px-4 py-1.5 text-xs text-stone-700 backdrop-blur">
            {requestStatusLabels[data.request.status] || data.request.status}
            {data.request.storeName ? ` · ${data.request.storeName}` : ""}
          </div>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-stone-800">کالاها</h2>
          <div className="space-y-3">
            {data.request.items.map((item) => {
              const thumb = item.images?.[0];
              return (
                <article
                  key={`${item.productCode}-${item.displayIndex}`}
                  className="flex gap-3 border-b border-stone-300/50 pb-4 last:border-0"
                >
                  {thumb ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden bg-stone-200/80">
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-stone-200/60 text-[10px] text-stone-500">
                      بدون تصویر
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-stone-900">
                      کالا #{String(item.displayIndex).padStart(2, "0")}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">{item.productCode}</div>
                    {item.originalUrl && (
                      <a
                        href={item.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block truncate text-xs text-amber-900/80 underline-offset-2 hover:underline"
                      >
                        لینک محصول
                      </a>
                    )}
                    {item.userNote && (
                      <p className="mt-2 text-xs leading-relaxed text-stone-600">{item.userNote}</p>
                    )}
                  </div>
                </article>
              );
            })}
            {data.request.items.length === 0 && (
              <p className="text-sm text-stone-500">هنوز کالایی ثبت نشده است.</p>
            )}
          </div>
        </section>

        {data.quotes.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-stone-800">پیش‌فاکتورها</h2>
            <div className="space-y-3">
              {data.quotes.map((quote) => (
                <div
                  key={quote.code}
                  className="flex items-start justify-between gap-3 border-b border-stone-300/50 pb-3"
                >
                  <div>
                    <div className="text-sm font-medium text-stone-900">{quote.code}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {quoteStatusLabels[quote.status] || quote.status}
                    </div>
                    <div className="mt-1 text-xs text-stone-700">{quote.productsTotalLabel}</div>
                  </div>
                  <a
                    href={quote.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-amber-950 underline-offset-2 hover:underline"
                  >
                    مشاهده
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.payments.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-stone-800">پرداخت‌ها</h2>
            <div className="space-y-3">
              {data.payments.map((payment) => (
                <div
                  key={payment.code}
                  className="flex items-start justify-between gap-3 border-b border-stone-300/50 pb-3"
                >
                  <div>
                    <div className="text-sm font-medium text-stone-900">{payment.code}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {paymentStatusLabels[payment.status] || payment.status}
                    </div>
                    <div className="mt-1 text-[11px] text-stone-400">
                      {formatFaDate(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm text-stone-800">{payment.amountLabel}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.order && (
          <section className="mb-10">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-stone-800">وضعیت سفارش</h2>
              <span className="font-mono text-xs text-stone-500">{data.order.code}</span>
            </div>
            <p className="mb-5 text-sm text-stone-700">
              {orderStatusLabels[data.order.status] || data.order.status}
              {data.order.totalTomanLabel ? ` · ${data.order.totalTomanLabel}` : ""}
            </p>
            <div className="relative border-r border-stone-300 pr-5">
              {timeline.map((event, idx) => (
                <div key={`${event.toStatus}-${idx}`} className="relative mb-6 last:mb-0">
                  <div className="absolute -right-[23px] top-1 h-2.5 w-2.5 rounded-full bg-stone-800 ring-4 ring-[#f3eee6]" />
                  <div className="text-sm font-medium text-stone-900">
                    {orderStatusLabels[event.toStatus] || event.toStatus}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">{formatFaDate(event.createdAt)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!data.order && (
          <section className="mb-10 rounded-sm border border-dashed border-stone-300/80 bg-white/40 px-4 py-5 text-center">
            <p className="text-sm text-stone-600">
              هنوز سفارشی ثبت نشده است. پس از تأیید پیش‌فاکتور و پرداخت، وضعیت اینجا نمایش داده می‌شود.
            </p>
          </section>
        )}

        {botUsername && (
          <div className="text-center">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center bg-stone-900 px-6 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800"
            >
              پشتیبانی در تلگرام
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
