"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";

interface OrderItem {
  displayIndex: number;
  productCode: string;
  title: string | null;
  quantity: number;
  imageUrl: string | null;
}

interface TimelineEvent {
  toStatus: string;
  createdAt: string;
}

interface OrderData {
  code: string;
  trackingCode?: string;
  status: string;
  inspectionType: string;
  purchaseMode: string;
  totalToman: string;
  totalTomanLabel: string;
  createdAt: string;
  deliveredAt: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
  shipment: any;
}

const statusLabels: Record<string, string> = {
  CONFIRMED: "تأیید شده",
  PURCHASING: "در حال خرید",
  PURCHASED: "خریداری شده",
  READY_FOR_IRAN: "آماده ارسال به ایران",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
};

export function OrderClient({ code }: { code: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrder();
  }, [code]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await apiFetch<OrderData>(`/public/orders/${code}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "خطا در دریافت اطلاعات سفارش");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
        <Button onClick={loadOrder} variant="outline" className="mt-4">تلاش مجدد</Button>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">پیگیری سفارش</h1>
        <p className="mt-1 text-sm text-slate-500 font-mono">{order.code}</p>
        {order.trackingCode && (
          <p className="mt-2 text-sm text-slate-600">
            کد پیگیری:{" "}
            <a
              href={`/t/${encodeURIComponent(order.trackingCode)}`}
              className="font-mono font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              {order.trackingCode}
            </a>
          </p>
        )}
      </div>

      <div className="mb-8 rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
        <h2 className="mb-4 font-bold text-slate-900">وضعیت سفارش</h2>
        <div className="relative border-r-2 border-slate-200 pr-4 ml-2">
          {order.timeline.map((event, idx) => (
            <div key={idx} className="mb-6 last:mb-0 relative">
              <div className="absolute -right-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white"></div>
              <div className="font-medium text-slate-900">
                {statusLabels[event.toStatus] || event.toStatus}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(event.createdAt).toLocaleString("fa-IR")}
              </div>
            </div>
          ))}
          {order.timeline.length === 0 && (
            <div className="mb-0 relative">
              <div className="absolute -right-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-white"></div>
              <div className="font-medium text-slate-900">
                {statusLabels[order.status] || order.status}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(order.createdAt).toLocaleString("fa-IR")}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 font-bold text-slate-900">اقلام سفارش</h2>
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <Card key={idx} className="overflow-hidden border-slate-200">
              <CardContent className="p-3 flex items-center gap-3">
                {item.imageUrl ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    بدون تصویر
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">محصول #{String(item.displayIndex).padStart(2, "0")}</div>
                  <div className="text-xs text-slate-500 mt-1">تعداد: {item.quantity}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {botUsername && (
        <div className="mt-8 text-center">
          <a 
            href={`https://t.me/${botUsername}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-md bg-blue-50 px-6 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
          >
            پشتیبانی در تلگرام
          </a>
        </div>
      )}
    </div>
  );
}
