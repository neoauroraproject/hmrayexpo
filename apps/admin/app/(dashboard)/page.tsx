"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { displayUserName, unwrapItems } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";
import {
  Inbox,
  Clock,
  CreditCard,
  ShoppingBag,
  Users,
  BadgeDollarSign,
} from "lucide-react";

interface DashboardStats {
  requests?: {
    byStatus?: Record<string, number>;
    newToday?: number;
  };
  quotes?: {
    byStatus?: Record<string, number>;
    awaitingPayment?: number;
  };
  orders?: {
    byStatus?: Record<string, number>;
    inFulfillment?: number;
  };
  payments?: {
    awaitingReview?: number;
    confirmedTotalLabel?: string;
  };
  support?: { openTickets?: number };
  customers?: { total?: number; newToday?: number };
}

interface RecentRequest {
  id: string;
  code: string;
  type: string;
  status: string;
  createdAt: string;
  user?: {
    displayName?: string | null;
    customerCode?: string | null;
  } | null;
}

function n(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [statsData, requestsData] = await Promise.all([
        apiFetch<DashboardStats>("/admin/dashboard/stats"),
        apiFetch<unknown>("/admin/requests", { params: { pageSize: 5 } }),
      ]);
      setStats(statsData);
      setRecent(unwrapItems<RecentRequest>(requestsData));
      setError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch dashboard:", err);
      setError(err instanceof Error ? err.message : "خطا در بارگذاری داشبورد");
      if (isInitial) {
        setStats(null);
        setRecent([]);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll(true);
    const timer = setInterval(() => {
      void fetchAll(false);
    }, 20_000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const requestedCount = n(stats?.requests?.byStatus?.REQUESTED);

  const statCards = [
    {
      title: "درخواست‌های جدید",
      value: requestedCount,
      hint: stats?.requests?.newToday != null ? `${n(stats.requests.newToday)} امروز` : undefined,
      icon: Inbox,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/requests",
    },
    {
      title: "منتظر قیمت",
      value: requestedCount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/requests",
    },
    {
      title: "منتظر پرداخت",
      value: n(stats?.quotes?.awaitingPayment),
      icon: CreditCard,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/payments",
    },
    {
      title: "سفارش‌های فعال",
      value: n(stats?.orders?.inFulfillment),
      icon: ShoppingBag,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/orders",
    },
    {
      title: "مشتریان",
      value: n(stats?.customers?.total),
      hint:
        stats?.customers?.newToday != null
          ? `${n(stats.customers.newToday)} امروز`
          : undefined,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/customers",
    },
    {
      title: "پرداخت در بررسی",
      value: n(stats?.payments?.awaitingReview),
      icon: BadgeDollarSign,
      color: "text-slate-600",
      bg: "bg-slate-50",
      href: "/payments",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">داشبورد</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">داشبورد</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="block">
            <Card className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow h-full">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                {stat.hint && (
                  <p className="text-xs text-slate-400 mt-1">{stat.hint}</p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">آخرین درخواست‌ها</h2>
          <Link href="/requests" className="text-xs text-blue-600 hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">کد</th>
                <th className="px-6 py-3 font-medium">مشتری</th>
                <th className="px-6 py-3 font-medium">نوع</th>
                <th className="px-6 py-3 font-medium">وضعیت</th>
                <th className="px-6 py-3 font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    درخواستی یافت نشد.
                  </td>
                </tr>
              ) : (
                recent.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <Link href={`/requests/${req.id}`} className="hover:underline text-blue-600">
                        {req.code}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{displayUserName(req.user)}</td>
                    <td className="px-6 py-3">{req.type}</td>
                    <td className="px-6 py-3">{req.status}</td>
                    <td className="px-6 py-3 text-slate-600" dir="ltr">
                      {new Date(req.createdAt).toLocaleDateString("fa-IR")}
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
