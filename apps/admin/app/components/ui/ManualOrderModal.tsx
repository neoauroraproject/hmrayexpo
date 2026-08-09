"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { X } from "lucide-react";

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (order: any) => void;
}

const INSPECTION_TYPES = [
  { value: "", label: "پیش‌فرض تنظیمات" },
  { value: "FULL_OPEN", label: "بازرسی کامل (FULL_OPEN)" },
  { value: "VISUAL_ONLY", label: "بازرسی ظاهری (VISUAL_ONLY)" },
  { value: "SEALED", label: "بدون بازگشایی (SEALED)" },
];

const PURCHASE_MODES = [
  { value: "", label: "همان حالت پیش‌فاکتور" },
  { value: "NORMAL", label: "عادی (NORMAL)" },
  { value: "INSTANT", label: "فوری (INSTANT)" },
];

export function ManualOrderModal({ isOpen, onClose, onSuccess }: ManualOrderModalProps) {
  const [quote, setQuote] = useState("");
  const [reason, setReason] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [purchaseMode, setPurchaseMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuote("");
    setReason("");
    setInspectionType("");
    setPurchaseMode("");
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || reason.trim().length < 5) return;
    setLoading(true);
    setError(null);
    try {
      const order = await apiFetch<any>("/admin/orders/manual", {
        method: "POST",
        body: JSON.stringify({
          quote: quote.trim(),
          reason: reason.trim(),
          ...(inspectionType ? { inspectionType } : {}),
          ...(purchaseMode ? { purchaseMode } : {}),
        }),
      });
      onClose();
      onSuccess?.(order);
    } catch (err: any) {
      console.error("Failed to create manual order:", err);
      setError(err?.message || "خطا در ایجاد سفارش دستی");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md relative z-10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">ایجاد سفارش دستی</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">پیش‌فاکتور (کد یا شناسه)</label>
            <Input
              dir="ltr"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Q-00001"
              required
            />
            <p className="text-xs text-slate-400 mt-1">سفارش همیشه از یک پیش‌فاکتور ارسال‌شده ایجاد می‌شود.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">دلیل ایجاد دستی</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
              placeholder="حداقل ۵ نویسه..."
              required
              minLength={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع بازرسی (اختیاری)</label>
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                {INSPECTION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حالت خرید (اختیاری)</label>
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={purchaseMode}
                onChange={(e) => setPurchaseMode(e.target.value)}
              >
                {PURCHASE_MODES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={loading || !quote.trim() || reason.trim().length < 5}>
              {loading ? "در حال ثبت..." : "ثبت سفارش"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
