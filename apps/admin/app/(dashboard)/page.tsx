"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Inbox, Clock, CreditCard, ShoppingBag, Calendar, Activity } from "lucide-react";

interface DashboardStats {
  newRequests: number;
  awaitingQuote: number;
  awaitingPayment: number;
  activeOrders: number;
  todayActivity: number;
  // Add more as needed based on API
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch<DashboardStats>("/admin/dashboard/stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Fallback for UI dev
        setStats({
          newRequests: 12,
          awaitingQuote: 5,
          awaitingPayment: 8,
          activeOrders: 24,
          todayActivity: 45,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "درخواست‌های جدید", value: stats?.newRequests || 0, icon: Inbox, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "منتظر قیمت", value: stats?.awaitingQuote || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "منتظر پرداخت", value: stats?.awaitingPayment || 0, icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
    { title: "سفارش‌های فعال", value: stats?.activeOrders || 0, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "فعالیت امروز", value: stats?.todayActivity || 0, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "کل تراکنش‌ها", value: "...", icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
