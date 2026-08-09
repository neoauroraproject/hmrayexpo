"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { ManualPaymentModal } from "@/app/components/ui/ManualPaymentModal";
import { Check, X, Plus, ExternalLink, AlertCircle } from "lucide-react";

interface PaymentItem {
  id: string;
  code: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  receiptUrl: string | null;
  user: {
    id: string;
    customerCode: string;
    displayName: string | null;
  };
  quote?: { code: string } | null;
  order?: { code: string } | null;
}

const ACTIONABLE_STATUSES = ["PENDING", "UNDER_REVIEW"];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any>("/admin/payments");
      const list: PaymentItem[] = Array.isArray(data) ? data : (data?.items ?? []);
      setPayments(list);
    } catch (err: any) {
      console.error("Failed to fetch payments:", err);
      setPayments([]);
      setError(err?.message || "خطا در بارگذاری پرداخت‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleConfirm = async (id: string) => {
    try {
      await apiFetch(`/admin/payments/${id}/confirm`, { method: "POST" });
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "CONFIRMED" } : p)));
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      alert("خطا در تایید پرداخت");
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("دلیل رد پرداخت را وارد کنید:");
    if (!reason || reason.trim().length < 3) return;
    try {
      await apiFetch(`/admin/payments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "REJECTED" } : p)));
    } catch (error) {
      console.error("Failed to reject payment:", error);
      alert("خطا در رد پرداخت");
    }
  };

  const mapStatus = (status: string): any => {
    switch (status) {
      case "PENDING":
      case "UNDER_REVIEW":
        return "pending";
      case "CONFIRMED":
        return "success";
      case "REJECTED":
      case "REFUNDED":
        return "draft";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">پرداخت‌ها</h1>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          ثبت پرداخت دستی
        </Button>
      </div>

      {error && (
        <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <Button variant="outline" size="sm" className="mr-auto" onClick={fetchPayments}>
            تلاش دوباره
          </Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">کد پرداخت</th>
                <th className="px-6 py-4 font-medium">مشتری</th>
                <th className="px-6 py-4 font-medium">مبلغ</th>
                <th className="px-6 py-4 font-medium">بابت</th>
                <th className="px-6 py-4 font-medium">رسید</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    هیچ پرداختی یافت نشد.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{payment.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{payment.user?.displayName || payment.user?.customerCode}</div>
                      <div className="text-slate-500 text-xs mt-0.5" dir="ltr">{payment.user?.customerCode}</div>
                    </td>
                    <td className="px-6 py-4 font-medium" dir="ltr">
                      {parseFloat(payment.amount).toLocaleString("fa-IR")} {payment.currency}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {payment.quote ? `پیش‌فاکتور ${payment.quote.code}` : payment.order ? `سفارش ${payment.order.code}` : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {payment.receiptUrl ? (
                        <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          مشاهده <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={mapStatus(payment.status)}>{payment.status}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-left">
                      {ACTIONABLE_STATUSES.includes(payment.status) && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleConfirm(payment.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="تایید"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="رد"
                          >
                            <X className="w-4 h-4" />
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

      <ManualPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchPayments()}
      />
    </div>
  );
}
