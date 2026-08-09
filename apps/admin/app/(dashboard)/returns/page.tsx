"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatusBadge } from "@/app/components/ui/StatusBadge";

interface ReturnItem {
  id: string;
  status: string;
  reason?: string | null;
  externalStore?: boolean;
  conservativeMessage?: string;
  order?: { id: string; code: string };
  createdAt: string;
}

const STATUS_FLOW = [
  "RETURN_REQUESTED",
  "ADMIN_REVIEW",
  "RETURN_APPROVED",
  "RETURN_TO_SELLER",
  "REFUND",
  "REJECTED",
] as const;

export default function ReturnsPage() {
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReturnItem[] | { items: ReturnItem[] }>("/admin/returns");
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch (e) {
      console.error(e);
      setError("بارگذاری مرجوعی‌ها ناموفق بود.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const advance = async (id: string, status: string) => {
    try {
      await apiFetch(`/admin/returns/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch {
      alert("تغییر وضعیت ناموفق بود.");
    }
  };

  const createRefund = async (id: string) => {
    const amount = prompt("مبلغ Refund (تومان):");
    if (!amount) return;
    try {
      await apiFetch(`/admin/returns/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      await load();
    } catch {
      alert("ثبت Refund ناموفق بود.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">مرجوعی و Refund</h1>
        <Button variant="outline" onClick={() => void load()}>
          تازه‌سازی
        </Button>
      </div>

      {error && (
        <Card className="p-4 text-sm text-amber-800 bg-amber-50 border-amber-100">
          {error}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">سفارش</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium">دلیل</th>
                <th className="px-6 py-4 font-medium">یادداشت</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    موردی ثبت نشده. مرجوعی را از صفحه سفارش ایجاد کنید.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {item.order ? (
                        <Link
                          href={`/orders/${item.order.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {item.order.code}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status="pending">{item.status}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {item.reason || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-sm">
                      {item.externalStore
                        ? item.conservativeMessage ||
                          "برای فروشگاه غیر Temu قبل از وعده، شرایط فروشنده را چک کنید."
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {STATUS_FLOW.filter((s) => s !== item.status).slice(0, 3).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => void advance(item.id, s)}
                          >
                            {s}
                          </Button>
                        ))}
                        <Button size="sm" onClick={() => void createRefund(item.id)}>
                          Refund
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
