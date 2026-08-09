"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

interface BatchOrderLink {
  id: string;
  orderId: string;
  addedAt: string;
  omrAmount: string | null;
  counted: boolean;
  order: {
    id: string;
    code: string;
    status: string;
    totalToman: string;
    user: { customerCode: string; displayName: string | null } | null;
  };
}

interface BatchDetail {
  id: string;
  code: string;
  status: string;
  currentOmr: string;
  targetOmr: string;
  deadline: string | null;
  note: string | null;
  progress: number;
  orders: BatchOrderLink[];
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  READY: "آماده خرید",
  PURCHASING: "در حال خرید",
  PURCHASED: "خریداری شده",
  CANCELLED: "لغو شده",
};

export default function BatchDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BatchDetail>(`/admin/temu-batches/${id}`);
      setBatch(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderCode.trim()) return;
    void run(async () => {
      await apiFetch(`/admin/temu-batches/${id}/orders`, {
        method: "POST",
        body: JSON.stringify({ order: orderCode.trim() }),
      });
      setOrderCode("");
      setMessage("سفارش به بسته اضافه شد.");
    });
  };

  const handleRemoveOrder = (linkOrderId: string) => {
    if (!confirm("این سفارش از بسته حذف شود؟")) return;
    void run(async () => {
      await apiFetch(`/admin/temu-batches/${id}/orders/${linkOrderId}`, { method: "DELETE" });
      setMessage("سفارش از بسته حذف شد.");
    });
  };

  const handlePurchase = (endpoint: "start-purchase" | "complete-purchase") => {
    if (!confirm("آیا مطمئن هستید؟ این عملیات وضعیت سفارش‌ها را تغییر می‌دهد.")) return;
    void run(async () => {
      const result = await apiFetch<{ moved: string[]; skipped?: Array<{ code: string }> }>(
        `/admin/temu-batches/${id}/${endpoint}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const skipped = result.skipped?.length ?? 0;
      setMessage(
        `${result.moved.length} سفارش به‌روزرسانی شد${skipped ? ` — ${skipped} سفارش رد شد` : ""}.`,
      );
    });
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <Link href="/batches" className="inline-flex items-center gap-2 text-sm text-slate-500">
          <ArrowRight className="h-4 w-4" />
          بازگشت به لیست
        </Link>
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? "بسته یافت نشد."}
        </div>
      </div>
    );
  }

  const editable = batch.status === "OPEN" || batch.status === "READY";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/batches"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">بسته {batch.code}</h1>
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button onClick={() => handlePurchase("start-purchase")} disabled={busy}>
              شروع خرید
            </Button>
          )}
          {batch.status === "PURCHASING" && (
            <Button onClick={() => handlePurchase("complete-purchase")} disabled={busy}>
              ثبت خرید نهایی
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}
      {error && (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-slate-500">وضعیت</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {STATUS_LABELS[batch.status] ?? batch.status}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">مجموع فعلی (OMR)</p>
          <p className="mt-1 text-xl font-bold text-slate-900" dir="ltr">
            {batch.currentOmr}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">هدف (OMR)</p>
          <p className="mt-1 text-xl font-bold text-slate-900" dir="ltr">
            {batch.targetOmr}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">پیشرفت</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-500" style={{ width: `${batch.progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{batch.progress}%</p>
        </Card>
      </div>

      {editable && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">افزودن سفارش</h2>
          <form onSubmit={handleAddOrder} className="flex gap-3">
            <Input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="کد سفارش، مثلاً HM-2026-01234"
              dir="ltr"
            />
            <Button type="submit" className="gap-2 whitespace-nowrap" disabled={busy}>
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            فقط سفارش‌های Temu با وضعیت تأیید‌شده یا پرداخت‌شده قابل افزودن هستند.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">کد سفارش</th>
                <th className="px-6 py-4 font-medium">مشتری</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium">معادل OMR</th>
                <th className="px-6 py-4 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batch.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    هنوز سفارشی به این بسته اضافه نشده است.
                  </td>
                </tr>
              ) : (
                batch.orders.map((link) => (
                  <tr key={link.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link href={`/orders/${link.order.id}`} className="hover:underline">
                        {link.order.code}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {link.order.user?.displayName ?? link.order.user?.customerCode ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{link.order.status}</td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {link.omrAmount ?? "-"}
                      {!link.counted && (
                        <span className="mr-2 text-xs text-amber-600">(محاسبه نشده)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-left">
                      {editable && (
                        <button
                          onClick={() => handleRemoveOrder(link.orderId)}
                          className="rounded-md p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                          title="حذف از بسته"
                          disabled={busy}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
