"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";

interface TrackItem {
  displayIndex: number;
  productCode: string;
  title: string | null;
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
  previewPending?: boolean;
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

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function TrackClient({ code }: { code: string }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    async function loadTrack(opts?: { silent?: boolean; attempt?: number }) {
      try {
        if (!opts?.silent) {
          setLoading(true);
          setError("");
        }
        const result = await apiFetch<TrackData>(`/public/track/${encodeURIComponent(code)}`);
        if (cancelled) return;
        setData(result);
        const attempt = opts?.attempt ?? 0;
        if (result.previewPending && attempt < 3) {
          retryTimer = window.setTimeout(() => {
            void loadTrack({ silent: true, attempt: attempt + 1 });
          }, 2000 + attempt * 1500);
        }
      } catch (err: unknown) {
        if (cancelled || opts?.silent) return;
        const message = err instanceof Error ? err.message : "خطا در دریافت اطلاعات";
        setError(message);
      } finally {
        if (!cancelled && !opts?.silent) setLoading(false);
      }
    }

    void loadTrack();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [code]);

  async function reload() {
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

  async function onCopyCode() {
    if (!data) return;
    const ok = await copyText(data.trackingCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm tracking-[0.2em] text-[#7a8680]">HMRAY</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="text-[#1c2420]">{error || "موردی پیدا نشد"}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="mt-8 border border-[#1c2420]/px-6 py-3 text-sm text-[#1c2420] transition hover:bg-[#1c2420] hover:text-[#f4f6f4]"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
  const statusLabel =
    data.order
      ? orderStatusLabels[data.order.status] || data.order.status
      : requestStatusLabels[data.request.status] || data.request.status;
  const timeline =
    data.order?.timeline?.length
      ? data.order.timeline
      : data.order
        ? [{ toStatus: data.order.status, createdAt: data.request.submittedAt ?? "" }]
        : [];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f4f6f4]">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(47,79,68,0.12), transparent 60%), linear-gradient(180deg, #eef2ef 0%, #f4f6f4 38%, #e8ece9 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(28,36,32,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(28,36,32,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-md px-5 pb-28 pt-12">
        <header className="mb-12 text-center">
          <p className="font-[family-name:var(--font-track-display)] text-4xl tracking-[0.22em] text-[#1c2420]">
            HMRAY
          </p>
          <button
            type="button"
            onClick={onCopyCode}
            className="mt-6 inline-flex flex-col items-center gap-1 transition active:scale-[0.99]"
            aria-label="کپی کد پیگیری"
          >
            <span className="font-mono text-2xl tracking-wide text-[#1c2420]">{data.trackingCode}</span>
            <span className="text-[11px] text-[#6b7872]">
              {copied ? "کپی شد" : "برای کپی لمس کنید"}
            </span>
          </button>
          <p className="mt-5 text-sm leading-relaxed text-[#4a5650]">{statusLabel}</p>
          {data.request.storeName ? (
            <p className="mt-2 text-xs text-[#7a8680]">{data.request.storeName}</p>
          ) : null}
        </header>

        <section className="mb-12">
          <h2 className="mb-5 text-[11px] font-medium tracking-[0.25em] text-[#6b7872]">کالاها</h2>
          <ul className="space-y-0">
            {data.request.items.map((item, index) => {
              const thumb = item.images?.[0];
              return (
                <li
                  key={`${item.productCode}-${item.displayIndex}`}
                  className={`flex gap-4 py-5 ${index > 0 ? "border-t border-[#1c2420]/10" : ""}`}
                >
                  {thumb ? (
                    <div className="h-20 w-20 shrink-0 overflow-hidden bg-[#dce3de]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-[#dce3de] text-[10px] text-[#6b7872]">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="text-sm leading-snug text-[#1c2420]">
                      {item.title?.trim() || `کالا ${String(item.displayIndex).padStart(2, "0")}`}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-[#7a8680]" dir="ltr">
                      {item.productCode}
                    </div>
                    {item.originalUrl ? (
                      <a
                        href={item.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-[#2f4f44] underline-offset-4 hover:underline"
                      >
                        لینک محصول
                      </a>
                    ) : null}
                    {item.userNote ? (
                      <p className="mt-2 text-xs leading-relaxed text-[#4a5650]">{item.userNote}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {data.request.items.length === 0 ? (
              <li className="py-4 text-sm text-[#6b7872]">هنوز کالایی ثبت نشده است.</li>
            ) : null}
          </ul>
        </section>

        {data.quotes.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-5 text-[11px] font-medium tracking-[0.25em] text-[#6b7872]">
              پیش‌فاکتور
            </h2>
            <ul className="space-y-4">
              {data.quotes.map((quote) => (
                <li
                  key={quote.code}
                  className="flex items-end justify-between gap-4 border-b border-[#1c2420]/10 pb-4"
                >
                  <div>
                    <div className="text-sm text-[#1c2420]">{quote.code}</div>
                    <div className="mt-1 text-xs text-[#6b7872]">
                      {quoteStatusLabels[quote.status] || quote.status}
                    </div>
                    <div className="mt-2 text-sm text-[#1c2420]">{quote.productsTotalLabel}</div>
                  </div>
                  <a
                    href={quote.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-[#2f4f44] underline-offset-4 hover:underline"
                  >
                    مشاهده
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.payments.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-5 text-[11px] font-medium tracking-[0.25em] text-[#6b7872]">پرداخت‌ها</h2>
            <ul className="space-y-4">
              {data.payments.map((payment) => (
                <li
                  key={payment.code}
                  className="flex items-start justify-between gap-4 border-b border-[#1c2420]/10 pb-4"
                >
                  <div>
                    <div className="text-sm text-[#1c2420]">{payment.code}</div>
                    <div className="mt-1 text-xs text-[#6b7872]">
                      {paymentStatusLabels[payment.status] || payment.status}
                    </div>
                    <div className="mt-1 text-[11px] text-[#7a8680]">
                      {formatFaDate(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm text-[#1c2420]">{payment.amountLabel}</div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.order ? (
          <section className="mb-12">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="text-[11px] font-medium tracking-[0.25em] text-[#6b7872]">مسیر سفارش</h2>
              <span className="font-mono text-[11px] text-[#7a8680]">{data.order.code}</span>
            </div>
            {data.order.totalTomanLabel ? (
              <p className="mb-6 text-sm text-[#1c2420]">{data.order.totalTomanLabel}</p>
            ) : null}
            <ol className="relative border-r border-[#1c2420]/15 pr-5">
              {timeline.map((event, idx) => (
                <li key={`${event.toStatus}-${idx}`} className="relative mb-7 last:mb-0">
                  <span className="absolute -right-[23px] top-1.5 h-2 w-2 rounded-full bg-[#2f4f44] ring-4 ring-[#f4f6f4]" />
                  <div className="text-sm text-[#1c2420]">
                    {orderStatusLabels[event.toStatus] || event.toStatus}
                  </div>
                  <div className="mt-1 text-xs text-[#7a8680]">{formatFaDate(event.createdAt)}</div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="mb-12 border border-dashed border-[#1c2420]/15 px-4 py-6 text-center">
            <p className="text-sm leading-relaxed text-[#4a5650]">
              پس از تأیید پیش‌فاکتور و پرداخت، مسیر سفارش اینجا نمایش داده می‌شود.
            </p>
            <p className="mt-3 text-xs text-[#7a8680]">
              برای انصراف یا ویرایش کالاها از ربات تلگرام استفاده کنید.
            </p>
          </section>
        )}

        {botUsername ? (
          <div className="text-center">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center bg-[#1c2420] px-8 text-sm tracking-wide text-[#f4f6f4] transition hover:bg-[#2f4f44]"
            >
              ادامه در تلگرام
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
