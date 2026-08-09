"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";

interface Rate {
  id: string;
  minKg: string;
  maxKg: string;
  priceToman: string | null;
  pricePerKg: string | null;
  minCharge: string | null;
}

interface Method {
  id: string;
  title: string;
  carrier: string | null;
  isDomestic: boolean;
  enabled: boolean;
  sortOrder: number;
  rates: Rate[];
}

const emptyRate = { minKg: "", maxKg: "", priceToman: "", pricePerKg: "", minCharge: "" };

export default function ShippingPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState({ title: "", carrier: "", isDomestic: true });
  const [rateForms, setRateForms] = useState<Record<string, typeof emptyRate>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Method[]>("/admin/shipping/methods", {
        params: { includeDisabled: "true" },
      });
      setMethods(data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setMethods([]);
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
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateMethod = (event: React.FormEvent) => {
    event.preventDefault();
    if (!methodForm.title.trim()) return;
    void run(async () => {
      await apiFetch("/admin/shipping/methods", {
        method: "POST",
        body: JSON.stringify({
          title: methodForm.title.trim(),
          ...(methodForm.carrier ? { carrier: methodForm.carrier } : {}),
          isDomestic: methodForm.isDomestic,
        }),
      });
      setMethodForm({ title: "", carrier: "", isDomestic: true });
    });
  };

  const handleDisableMethod = (id: string) => {
    if (!confirm("این روش ارسال غیرفعال شود؟")) return;
    void run(async () => {
      await apiFetch(`/admin/shipping/methods/${id}`, { method: "DELETE" });
    });
  };

  const handleCreateRate = (methodId: string) => (event: React.FormEvent) => {
    event.preventDefault();
    const form = rateForms[methodId] ?? emptyRate;
    if (!form.minKg || !form.maxKg) return;
    void run(async () => {
      await apiFetch(`/admin/shipping/methods/${methodId}/rates`, {
        method: "POST",
        body: JSON.stringify({
          minKg: form.minKg,
          maxKg: form.maxKg,
          ...(form.priceToman ? { priceToman: form.priceToman } : {}),
          ...(form.pricePerKg ? { pricePerKg: form.pricePerKg } : {}),
          ...(form.minCharge ? { minCharge: form.minCharge } : {}),
        }),
      });
      setRateForms((prev) => ({ ...prev, [methodId]: emptyRate }));
    });
  };

  const handleDeleteRate = (rateId: string) => {
    if (!confirm("این تعرفه حذف شود؟")) return;
    void run(async () => {
      await apiFetch(`/admin/shipping/rates/${rateId}`, { method: "DELETE" });
    });
  };

  const updateRateForm = (methodId: string, patch: Partial<typeof emptyRate>) => {
    setRateForms((prev) => ({
      ...prev,
      [methodId]: { ...(prev[methodId] ?? emptyRate), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">روش‌های ارسال</h1>

      {error && (
        <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">روش ارسال جدید</h2>
        <form onSubmit={handleCreateMethod} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">عنوان</label>
            <Input
              value={methodForm.title}
              onChange={(e) => setMethodForm({ ...methodForm, title: e.target.value })}
              placeholder="پست پیشتاز"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">حمل‌کننده</label>
            <Input
              value={methodForm.carrier}
              onChange={(e) => setMethodForm({ ...methodForm, carrier: e.target.value })}
              placeholder="اختیاری"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={methodForm.isDomestic}
                onChange={(e) => setMethodForm({ ...methodForm, isDomestic: e.target.checked })}
              />
              ارسال داخلی
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2" disabled={busy}>
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-slate-500">در حال بارگذاری...</Card>
      ) : methods.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">هیچ روش ارسالی تعریف نشده است.</Card>
      ) : (
        methods.map((method) => {
          const form = rateForms[method.id] ?? emptyRate;
          return (
            <Card key={method.id} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {method.title}
                    {!method.enabled && (
                      <span className="mr-2 text-xs text-rose-600">(غیرفعال)</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {method.carrier ?? "بدون حمل‌کننده"} ·{" "}
                    {method.isDomestic ? "داخلی" : "بین‌المللی"}
                  </p>
                </div>
                {method.enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisableMethod(method.id)}
                    disabled={busy}
                  >
                    غیرفعال کردن
                  </Button>
                )}
              </div>

              <table className="w-full text-right text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">از (کیلوگرم)</th>
                    <th className="px-4 py-3 font-medium">تا (کیلوگرم)</th>
                    <th className="px-4 py-3 font-medium">قیمت ثابت</th>
                    <th className="px-4 py-3 font-medium">هر کیلو</th>
                    <th className="px-4 py-3 font-medium">حداقل هزینه</th>
                    <th className="px-4 py-3 text-left font-medium">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {method.rates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        تعرفه‌ای ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    method.rates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-4 py-3" dir="ltr">
                          {rate.minKg}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {rate.maxKg}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {rate.priceToman ?? "-"}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {rate.pricePerKg ?? "-"}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {rate.minCharge ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleDeleteRate(rate.id)}
                            className="rounded-md p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                            disabled={busy}
                            title="حذف تعرفه"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <form
                onSubmit={handleCreateRate(method.id)}
                className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6"
              >
                <Input
                  value={form.minKg}
                  onChange={(e) => updateRateForm(method.id, { minKg: e.target.value })}
                  placeholder="از kg"
                  dir="ltr"
                  required
                />
                <Input
                  value={form.maxKg}
                  onChange={(e) => updateRateForm(method.id, { maxKg: e.target.value })}
                  placeholder="تا kg"
                  dir="ltr"
                  required
                />
                <Input
                  value={form.priceToman}
                  onChange={(e) => updateRateForm(method.id, { priceToman: e.target.value })}
                  placeholder="قیمت ثابت"
                  dir="ltr"
                />
                <Input
                  value={form.pricePerKg}
                  onChange={(e) => updateRateForm(method.id, { pricePerKg: e.target.value })}
                  placeholder="هر کیلو"
                  dir="ltr"
                />
                <Input
                  value={form.minCharge}
                  onChange={(e) => updateRateForm(method.id, { minCharge: e.target.value })}
                  placeholder="حداقل"
                  dir="ltr"
                />
                <Button type="submit" variant="outline" disabled={busy}>
                  افزودن تعرفه
                </Button>
              </form>
            </Card>
          );
        })
      )}
    </div>
  );
}
