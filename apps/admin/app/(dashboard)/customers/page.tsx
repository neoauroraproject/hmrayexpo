"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { displayUserName, unwrapItems } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";
import Link from "next/link";
import { Eye } from "lucide-react";

interface CustomerItem {
  id: string;
  customerCode?: string | null;
  displayName?: string | null;
  phone?: string | null;
  createdAt: string;
  telegramAccount?: {
    username?: string | null;
    telegramUserId?: string | null;
  } | null;
  _count?: {
    requests?: number;
    orders?: number;
    tickets?: number;
  } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setError(null);
      try {
        const data = await apiFetch<unknown>("/admin/customers", {
          params: { pageSize: 50 },
        });
        setCustomers(unwrapItems<CustomerItem>(data));
      } catch (err: unknown) {
        console.error("Failed to fetch customers:", err);
        setCustomers([]);
        setError(err instanceof Error ? err.message : "خطا در بارگذاری مشتریان");
      } finally {
        setLoading(false);
      }
    };

    void fetchCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مشتریان</h1>
        <p className="text-sm text-slate-500 mt-1">
          همه کسانی که ربات را با /start شروع کرده‌اند
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">کد مشتری</th>
                <th className="px-6 py-4 font-medium">نام</th>
                <th className="px-6 py-4 font-medium">موبایل</th>
                <th className="px-6 py-4 font-medium">تلگرام</th>
                <th className="px-6 py-4 font-medium">شناسه تلگرام</th>
                <th className="px-6 py-4 font-medium">درخواست‌ها</th>
                <th className="px-6 py-4 font-medium">سفارش‌ها</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    هیچ مشتری یافت نشد.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900" dir="ltr">
                      {customer.customerCode || "—"}
                    </td>
                    <td className="px-6 py-4">{displayUserName(customer)}</td>
                    <td className="px-6 py-4" dir="ltr">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-6 py-4" dir="ltr">
                      {customer.telegramAccount?.username
                        ? `@${customer.telegramAccount.username}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {customer.telegramAccount?.telegramUserId || "—"}
                    </td>
                    <td className="px-6 py-4">{customer._count?.requests ?? 0}</td>
                    <td className="px-6 py-4">{customer._count?.orders ?? 0}</td>
                    <td className="px-6 py-4 text-left">
                      <Link
                        href={`/customers/${customer.id}`}
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
    </div>
  );
}
