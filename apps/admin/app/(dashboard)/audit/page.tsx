"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { unwrapItems } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  actorAdmin?: { displayName?: string | null; username?: string | null } | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setError(null);
      try {
        const data = await apiFetch<unknown>("/admin/audit-logs");
        setLogs(unwrapItems<AuditLog>(data));
      } catch (err: any) {
        console.error("Failed to fetch audit logs:", err);
        setLogs([]);
        setError(err?.message || "خطا در بارگذاری لاگ‌ها");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">تاریخ و زمان</th>
                <th className="px-6 py-4 font-medium">ادمین</th>
                <th className="px-6 py-4 font-medium">اکشن</th>
                <th className="px-6 py-4 font-medium">موجودیت</th>
                <th className="px-6 py-4 font-medium">شناسه</th>
                <th className="px-6 py-4 font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    هیچ لاگی یافت نشد.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {new Date(log.createdAt).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {log.actorAdmin?.displayName || log.actorAdmin?.username || "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900" dir="ltr">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {log.entityType}
                    </td>
                    <td className="px-6 py-4 text-slate-600" dir="ltr">
                      {log.entityId || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-md">
                      <pre className="whitespace-pre-wrap font-mono" dir="ltr">
                        {JSON.stringify(
                          { oldValue: log.oldValue, newValue: log.newValue },
                          null,
                          2,
                        )}
                      </pre>
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
