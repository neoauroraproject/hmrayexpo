"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { Send, Trash2 } from "lucide-react";

interface Broadcast {
  id: string;
  title: string;
  body: string;
  status: string;
  audience: { kind: string; city?: string; batchId?: string };
  sentCount: number;
  failedCount: number;
  blockedCount: number;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
}

const AUDIENCE_OPTIONS = [
  { value: "all", label: "همه کاربران" },
  { value: "active", label: "کاربران فعال" },
  { value: "temu", label: "مشتریان Temu" },
  { value: "city", label: "بر اساس شهر" },
  { value: "batch", label: "اعضای یک بسته" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SENDING: "در حال ارسال",
  COMPLETED: "ارسال شد",
  FAILED: "ناموفق",
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    kind: "all",
    city: "",
    batchId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Paginated<Broadcast>>("/admin/broadcasts");
      setBroadcasts(data.items ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setBroadcasts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    void run(async () => {
      await apiFetch("/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          audience: {
            kind: form.kind,
            ...(form.kind === "city" && form.city ? { city: form.city } : {}),
            ...(form.kind === "batch" && form.batchId ? { batchId: form.batchId } : {}),
          },
        }),
      });
      setForm({ title: "", body: "", kind: "all", city: "", batchId: "" });
      setMessage("پیام همگانی به‌عنوان پیش‌نویس ذخیره شد.");
    });
  };

  const handleSend = (id: string) => {
    if (!confirm("این پیام برای همه مخاطبان فیلتر ارسال شود؟")) return;
    void run(async () => {
      const result = await apiFetch<{ queued: number }>(`/admin/broadcasts/${id}/send`, {
        method: "POST",
      });
      setMessage(`ارسال برای ${result.queued} مخاطب در صف قرار گرفت.`);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("این پیش‌نویس حذف شود؟")) return;
    void run(async () => {
      await apiFetch(`/admin/broadcasts/${id}`, { method: "DELETE" });
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">پیام‌های همگانی</h1>

      {message && (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}
      {error && (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">پیام جدید</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">عنوان</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">متن پیام</label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-600">مخاطبان</label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.kind === "city" && (
              <div>
                <label className="mb-1 block text-sm text-slate-600">شهر</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="تهران"
                />
              </div>
            )}
            {form.kind === "batch" && (
              <div>
                <label className="mb-1 block text-sm text-slate-600">کد بسته</label>
                <Input
                  value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  placeholder="TB-12345"
                  dir="ltr"
                />
              </div>
            )}
          </div>
          <Button type="submit" disabled={busy}>
            ذخیره پیش‌نویس
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">عنوان</th>
                <th className="px-6 py-4 font-medium">مخاطبان</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium">ارسال / خطا / مسدود</th>
                <th className="px-6 py-4 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    هیچ پیامی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                broadcasts.map((broadcast) => (
                  <tr key={broadcast.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{broadcast.title}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {AUDIENCE_OPTIONS.find((o) => o.value === broadcast.audience?.kind)?.label ??
                        broadcast.audience?.kind}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {STATUS_LABELS[broadcast.status] ?? broadcast.status}
                    </td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {broadcast.sentCount} / {broadcast.failedCount} / {broadcast.blockedCount}
                    </td>
                    <td className="px-6 py-4 text-left">
                      {broadcast.status === "DRAFT" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSend(broadcast.id)}
                            className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                            title="ارسال"
                            disabled={busy}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(broadcast.id)}
                            className="rounded-md p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                            title="حذف"
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
