"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { displayUserName, unwrapItems } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import Link from "next/link";
import { Eye } from "lucide-react";

interface RequestItem {
  id: string;
  code: string;
  type: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    customerCode?: string | null;
    displayName?: string | null;
    phone?: string | null;
  } | null;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setError(null);
      try {
        const data = await apiFetch<unknown>("/admin/requests");
        setRequests(unwrapItems<RequestItem>(data));
      } catch (err: any) {
        console.error("Failed to fetch requests:", err);
        setRequests([]);
        setError(err?.message || "خطا در بارگذاری درخواست‌ها");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const mapStatus = (status: string): "draft" | "pending" | "payment" | "success" | "shipped" => {
    switch (status) {
      case "REQUESTED":
        return "pending";
      case "QUOTED":
        return "payment";
      case "REJECTED":
        return "draft";
      default:
        return "draft";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">درخواست‌ها</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">کد درخواست</th>
                <th className="px-6 py-4 font-medium">مشتری</th>
                <th className="px-6 py-4 font-medium">نوع</th>
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
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    هیچ درخواستی یافت نشد.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{req.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{displayUserName(req.user)}</div>
                      <div className="text-slate-500 text-xs mt-0.5" dir="ltr">
                        {req.user?.customerCode || req.user?.phone || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.type}</td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {new Date(req.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={mapStatus(req.status)} />
                    </td>
                    <td className="px-6 py-4 text-left">
                      <Link
                        href={`/requests/${req.id}`}
                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        title="مشاهده جزئیات"
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
