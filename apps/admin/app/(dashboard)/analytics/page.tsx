"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";

interface Summary {
  range: { from: string; to: string };
  users: { created: number };
  requests: { created: number; expired: number };
  quotes: { created: number; accepted: number; expired: number; conversionRate: number };
  orders: { created: number; cancelled: number; fromQuoteRate: number };
  sales: { total: string; totalLabel: string };
  refunds: {
    count: number;
    total: string;
    totalLabel: string;
    completedTotalLabel: string;
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(isoDate(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Summary>("/admin/analytics/summary", {
        params: {
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
        },
      });
      setSummary(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
    // Only on mount — later reloads are triggered by the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = summary
    ? [
        { title: "کاربران جدید", value: summary.users.created },
        { title: "درخواست‌ها", value: summary.requests.created },
        { title: "پیش‌فاکتورها", value: summary.quotes.created },
        { title: "نرخ تبدیل پیش‌فاکتور", value: `${summary.quotes.conversionRate}٪` },
        { title: "سفارش‌ها", value: summary.orders.created },
        { title: "سفارش‌های لغو‌شده", value: summary.orders.cancelled },
        { title: "درخواست‌های منقضی", value: summary.requests.expired },
        { title: "پیش‌فاکتورهای منقضی", value: summary.quotes.expired },
        { title: "مجموع فروش", value: summary.sales.totalLabel },
        { title: "مجموع بازپرداخت", value: summary.refunds.totalLabel },
        { title: "بازپرداخت انجام‌شده", value: summary.refunds.completedTotalLabel },
        { title: "تعداد بازپرداخت", value: summary.refunds.count },
      ]
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">گزارش‌ها</h1>

      <Card className="p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-sm text-slate-600">از تاریخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">تا تاریخ</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "در حال محاسبه..." : "اعمال بازه"}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="p-6">
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">{card.value}</h3>
          </Card>
        ))}
      </div>

      {!loading && !summary && !error && (
        <Card className="p-8 text-center text-slate-500">داده‌ای برای این بازه وجود ندارد.</Card>
      )}
    </div>
  );
}
