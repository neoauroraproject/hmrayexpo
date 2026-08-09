"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await apiFetch<RequestItem[]>("/admin/requests");
        setRequests(data);
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        // Fallback for UI dev
        setRequests([
          {
            id: "1",
            code: "RQ-0001",
            type: "TEMU",
            status: "REQUESTED",
            createdAt: new Date().toISOString(),
            customer: { id: "c1", firstName: "علی", lastName: "رضایی", phone: "09123456789" }
          },
          {
            id: "2",
            code: "RQ-0002",
            type: "EXTERNAL",
            status: "QUOTED",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            customer: { id: "c2", firstName: "سارا", lastName: "احمدی", phone: "09129876543" }
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const mapStatus = (status: string): "draft" | "pending" | "payment" | "success" | "shipped" => {
    switch (status) {
      case "REQUESTED": return "pending";
      case "QUOTED": return "payment";
      case "REJECTED": return "draft";
      default: return "draft";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">درخواست‌ها</h1>
      </div>

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
                    <div className="animate-pulse flex justify-center">
                      <div className="h-6 w-6 border-b-2 border-slate-900 rounded-full animate-spin"></div>
                    </div>
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
                      <div className="font-medium text-slate-900">{req.customer.firstName} {req.customer.lastName}</div>
                      <div className="text-slate-500 text-xs mt-0.5" dir="ltr">{req.customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.type}</td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {new Date(req.createdAt).toLocaleDateString('fa-IR')}
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
