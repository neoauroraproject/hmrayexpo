"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Eye, Plus } from "lucide-react";

interface Batch {
  id: string;
  code: string;
  status: string;
  currentOmr: string;
  targetOmr: string;
  deadline: string | null;
  progress: number;
  _count?: { orders: number };
}

interface Paginated<T> {
  items: T[];
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  READY: "آماده خرید",
  PURCHASING: "در حال خرید",
  PURCHASED: "خریداری شده",
  CANCELLED: "لغو شده",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", targetOmr: "", deadline: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Paginated<Batch>>("/admin/temu-batches");
      setBatches(data.items ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.targetOmr) return;
    setCreating(true);
    try {
      await apiFetch("/admin/temu-batches", {
        method: "POST",
        body: JSON.stringify({
          ...(form.code ? { code: form.code } : {}),
          targetOmr: form.targetOmr,
          ...(form.deadline ? { deadline: new Date(form.deadline).toISOString() } : {}),
        }),
      });
      setForm({ code: "", targetOmr: "", deadline: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">بسته‌های خرید گروهی</h1>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">بسته جدید</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">کد (اختیاری)</label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="TB-12345"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">هدف (ریال عمان)</label>
            <Input
              value={form.targetOmr}
              onChange={(e) => setForm({ ...form, targetOmr: e.target.value })}
              placeholder="500"
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">مهلت</label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2" disabled={creating}>
              <Plus className="h-4 w-4" />
              {creating ? "در حال ثبت..." : "ایجاد بسته"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">کد</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium">پیشرفت</th>
                <th className="px-6 py-4 font-medium">سفارش‌ها</th>
                <th className="px-6 py-4 font-medium">مهلت</th>
                <th className="px-6 py-4 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    هیچ بسته‌ای ثبت نشده است.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{batch.code}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {STATUS_LABELS[batch.status] ?? batch.status}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${batch.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500" dir="ltr">
                          {batch.currentOmr} / {batch.targetOmr}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{batch._count?.orders ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {batch.deadline
                        ? new Date(batch.deadline).toLocaleDateString("fa-IR")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <Link
                        href={`/batches/${batch.id}`}
                        className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        title="مشاهده جزئیات"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
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
