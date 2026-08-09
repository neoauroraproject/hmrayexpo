"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { X } from "lucide-react";

interface CustomerOption {
  id: string;
  customerCode: string;
  displayName: string | null;
  telegramAccount?: { username: string | null; firstName?: string | null; lastName?: string | null } | null;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Preselects the customer — e.g. when opened from a customer profile page. */
  defaultCustomerId?: string;
  /** Disables the customer picker. Defaults to `true` whenever `defaultCustomerId` is set. */
  lockCustomer?: boolean;
  /** Called with the created request. When omitted, the modal navigates to the request workspace. */
  onSuccess?: (request: any) => void;
}

const REQUEST_TYPES = [
  { value: "TEMU", label: "TEMU" },
  { value: "EXTERNAL_STORE", label: "سایر سایت‌ها (EXTERNAL_STORE)" },
  { value: "MANUAL", label: "دستی (MANUAL)" },
];

function customerLabel(c: CustomerOption): string {
  const name =
    c.displayName ||
    [c.telegramAccount?.firstName, c.telegramAccount?.lastName].filter(Boolean).join(" ") ||
    (c.telegramAccount?.username ? `@${c.telegramAccount.username}` : "");
  return name ? `${c.customerCode} — ${name}` : c.customerCode;
}

export function CreateRequestModal({
  isOpen,
  onClose,
  defaultCustomerId,
  lockCustomer,
  onSuccess,
}: CreateRequestModalProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [lockedCustomerLabel, setLockedCustomerLabel] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? "");
  const [type, setType] = useState("TEMU");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = lockCustomer ?? Boolean(defaultCustomerId);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCustomerId(defaultCustomerId ?? "");
    setType("TEMU");
    setStoreName("");
    setError(null);

    if (defaultCustomerId) {
      setLockedCustomerLabel(null);
      apiFetch<CustomerOption>(`/admin/customers/${defaultCustomerId}`)
        .then((data) => setLockedCustomerLabel(customerLabel(data)))
        .catch(() => setLockedCustomerLabel(defaultCustomerId));
      return;
    }

    setCustomersLoading(true);
    apiFetch<any>("/admin/customers", { params: { pageSize: 100 } })
      .then((data) => {
        const list: CustomerOption[] = Array.isArray(data) ? data : (data?.items ?? []);
        setCustomers(list);
      })
      .catch((err) => console.error("Failed to fetch customers for modal:", err))
      .finally(() => setCustomersLoading(false));
  }, [isOpen, defaultCustomerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setLoading(true);
    setError(null);
    try {
      const request = await apiFetch<any>("/admin/requests", {
        method: "POST",
        body: JSON.stringify({
          customer: selectedCustomerId,
          type,
          ...(storeName.trim() ? { storeName: storeName.trim() } : {}),
        }),
      });
      onClose();
      if (onSuccess) {
        onSuccess(request);
      } else if (request?.id) {
        router.push(`/requests/${request.id}`);
      }
    } catch (err: any) {
      console.error("Failed to create request:", err);
      setError(err?.message || "خطا در ایجاد درخواست");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md relative z-10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">ایجاد درخواست جدید</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">مشتری</label>
            {isLocked ? (
              <div className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-slate-50 border text-slate-600">
                {lockedCustomerLabel ?? "در حال بارگذاری..."}
              </div>
            ) : (
              <select
                className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
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
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نوع درخواست</label>
            <select
              className="w-full border-slate-200 rounded-md text-sm py-2 px-3 bg-white border focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              {REQUEST_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">نام فروشگاه (اختیاری)</label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="مثلاً Temu، Amazon، ..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={loading || !selectedCustomerId}>
              {loading ? "در حال ثبت..." : "ثبت درخواست"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
