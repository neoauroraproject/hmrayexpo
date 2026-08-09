"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { X, Paperclip } from "lucide-react";

interface CustomerOption {
  id: string;
  customerCode: string;
  displayName: string | null;
  telegramAccount?: { username: string | null; firstName?: string | null; lastName?: string | null } | null;
}

interface PaymentMethodOption {
  id: string;
  title: string;
  enabled: boolean;
}

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (payment: any) => void;
}

const CURRENCIES = ["TOMAN", "OMR", "USD", "USDT"];
const SOURCES = [
  { value: "SUPPORT", label: "پشتیبانی (SUPPORT)" },
  { value: "ADMIN", label: "مدیر (ADMIN)" },
];

function customerLabel(c: CustomerOption): string {
  const name =
    c.displayName ||
    [c.telegramAccount?.firstName, c.telegramAccount?.lastName].filter(Boolean).join(" ") ||
    (c.telegramAccount?.username ? `@${c.telegramAccount.username}` : "");
  return name ? `${c.customerCode} — ${name}` : c.customerCode;
}

export function ManualPaymentModal({ isOpen, onClose, onSuccess }: ManualPaymentModalProps) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TOMAN");
  const [source, setSource] = useState("SUPPORT");
  const [quoteId, setQuoteId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerId("");
    setMethodId("");
    setAmount("");
    setCurrency("TOMAN");
    setSource("SUPPORT");
    setQuoteId("");
    setOrderId("");
    setNote("");
    setReceiptFile(null);
    setError(null);

    setCustomersLoading(true);
    apiFetch<any>("/admin/customers", { params: { pageSize: 100 } })
      .then((data) => {
        const list: CustomerOption[] = Array.isArray(data) ? data : (data?.items ?? []);
        setCustomers(list);
      })
      .catch((err) => console.error("Failed to fetch customers for manual payment:", err))
      .finally(() => setCustomersLoading(false));

    setMethodsLoading(true);
    apiFetch<any>("/admin/payment-methods")
      .then((data) => {
        const list: PaymentMethodOption[] = Array.isArray(data) ? data : (data?.items ?? []);
        setMethods(list.filter((m) => m.enabled));
        if (list.length > 0) setMethodId(list.find((m) => m.enabled)?.id ?? "");
      })
      .catch((err) => console.error("Failed to fetch payment methods:", err))
      .finally(() => setMethodsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !methodId || !amount) return;
    setLoading(true);
    setError(null);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        const uploaded = await apiUpload<{ url: string }>("/admin/uploads", formData);
        receiptUrl = uploaded.url;
      }

      const payment = await apiFetch<any>("/admin/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          methodId,
          amount,
          currency,
          source,
          ...(quoteId.trim() ? { quoteId: quoteId.trim() } : {}),
          ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(receiptUrl ? { receiptUrl } : {}),
        }),
      });

      onClose();
      onSuccess?.(payment);
    } catch (err: any) {
      console.error("Failed to create manual payment:", err);
      setError(err?.message || "خطا در ثبت پرداخت");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">ثبت پرداخت دستی</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مشتری</label>
            <select
              className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={customersLoading}
              required
            >
              <option value="" disabled>
                {customersLoading ? "در حال بارگذاری..." : "انتخاب مشتری..."}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">روش پرداخت</label>
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                disabled={methodsLoading}
                required
              >
                <option value="" disabled>
                  {methodsLoading ? "در حال بارگذاری..." : "انتخاب روش..."}
                </option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">منبع</label>
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ</label>
              <Input
                type="number"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">واحد پول</label>
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد پیش‌فاکتور (اختیاری)</label>
              <Input
                dir="ltr"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                placeholder="Q-00001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد سفارش (اختیاری)</label>
              <Input
                dir="ltr"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-00001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت (اختیاری)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[70px]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رسید پرداخت (اختیاری)</label>
            <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-md py-2 px-3 text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
              <Paperclip className="w-4 h-4" />
              {receiptFile ? receiptFile.name : "انتخاب فایل رسید..."}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="text-xs text-slate-400 mt-1">آدرس فایل بارگذاری‌شده به یادداشت افزوده می‌شود.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={loading || !customerId || !methodId || !amount}>
              {loading ? "در حال ثبت..." : "ثبت پرداخت"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
