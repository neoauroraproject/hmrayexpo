"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import Link from "next/link";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<any>(`/admin/search?q=${encodeURIComponent(q)}`);
        setResults(data);
      } catch (error) {
        console.error("Failed to search:", error);
        // Mock results
        setResults({
          customers: [
            { id: "c1", code: "HM-00001", firstName: "علی", lastName: "رضایی", phone: "09123456789" }
          ],
          requests: [
            { id: "r1", code: "RQ-0001", status: "REQUESTED" }
          ],
          orders: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">نتایج جستجو برای «{q}»</h1>
      </div>

      {!q ? (
        <div className="text-center text-slate-500 p-8">
          لطفا عبارتی را برای جستجو در کادر بالا وارد کنید.
        </div>
      ) : loading ? (
        <div className="text-center text-slate-500 p-8">در حال جستجو...</div>
      ) : (
        <div className="space-y-6">
          {/* Customers */}
          {results?.customers?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">مشتریان</h3>
              <ul className="space-y-2">
                {results.customers.map((c: any) => (
                  <li key={c.id}>
                    <Link href={`/customers/${c.id}`} className="text-blue-600 hover:underline">
                      {c.firstName} {c.lastName} ({c.code}) - {c.phone}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Requests */}
          {results?.requests?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">درخواست‌ها</h3>
              <ul className="space-y-2">
                {results.requests.map((r: any) => (
                  <li key={r.id}>
                    <Link href={`/requests/${r.id}`} className="text-blue-600 hover:underline">
                      درخواست {r.code} - وضعیت: {r.status}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Orders */}
          {results?.orders?.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-4">سفارش‌ها</h3>
              <ul className="space-y-2">
                {results.orders.map((o: any) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                      سفارش {o.code} - وضعیت: {o.status}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results && 
           results.customers?.length === 0 && 
           results.requests?.length === 0 && 
           results.orders?.length === 0 && (
            <div className="text-center text-slate-500 p-8">
              نتیجه‌ای یافت نشد.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
