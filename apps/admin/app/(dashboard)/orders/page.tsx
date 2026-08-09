"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { ManualOrderModal } from "@/app/components/ui/ManualOrderModal";
import Link from "next/link";
import { Eye, Plus, AlertCircle } from "lucide-react";

interface OrderItem {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  totalToman: string;
  user: {
    id: string;
    customerCode: string;
    displayName: string | null;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any>("/admin/orders");
      const list: OrderItem[] = Array.isArray(data) ? data : (data?.items ?? []);
      setOrders(list);
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setOrders([]);
      setError(err?.message || "خطا در بارگذاری سفارش‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const mapStatus = (status: string): any => {
    switch (status) {
      case "CONFIRMED":
        return "pending";
      case "PAID":
      case "PURCHASING":
        return "payment";
      case "PURCHASED":
      case "DELIVERED":
        return "success";
      case "IN_TRANSIT_TO_OMAN":
      case "ARRIVED_OMAN":
      case "QUALITY_CHECK":
      case "READY_FOR_IRAN":
        return "shipped";
      case "CANCELLED":
        return "draft";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">سفارش‌ها</h1>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          ایجاد سفارش دستی
        </Button>
      </div>

      {error && (
        <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <Button variant="outline" size="sm" className="mr-auto" onClick={fetchOrders}>
            تلاش دوباره
          </Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">کد سفارش</th>
                <th className="px-6 py-4 font-medium">مشتری</th>
                <th className="px-6 py-4 font-medium">مبلغ (تومان)</th>
                <th className="px-6 py-4 font-medium">تاریخ ثبت</th>
                <th className="px-6 py-4 font-medium">وضعیت</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    هیچ سفارشی یافت نشد.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{order.code}</td>
                    <td className="px-6 py-4">{order.user?.displayName || order.user?.customerCode}</td>
                    <td className="px-6 py-4" dir="ltr">{parseFloat(order.totalToman).toLocaleString("fa-IR")}</td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={mapStatus(order.status)}>{order.status}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ManualOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchOrders()}
      />
    </div>
  );
}
