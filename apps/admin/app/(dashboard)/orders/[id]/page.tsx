"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Package, CheckCircle, Clock } from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiFetch<any>(`/admin/orders/${id}`);
        setOrder(data);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        setOrder({
          id,
          code: `ORD-${id.substring(0, 4)}`,
          status: "PURCHASED",
          createdAt: new Date().toISOString(),
          totalToman: "1500000",
          customer: { firstName: "علی", lastName: "رضایی", phone: "09123456789" },
          items: [
            { id: "i1", url: "https://temu.com/product/123", note: "رنگ مشکی", priceOmr: "10" }
          ],
          history: [
            { id: "h1", status: "PENDING", createdAt: new Date(Date.now() - 86400000).toISOString() },
            { id: "h2", status: "PURCHASED", createdAt: new Date().toISOString() }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
      alert("وضعیت با موفقیت تغییر کرد.");
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("خطا در تغییر وضعیت");
    } finally {
      setStatusUpdating(false);
    }
  };


  if (loading || !order) return <div className="p-8 text-center">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">جزئیات سفارش {order.code}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">تغییر وضعیت:</span>
          <select 
            className="border-slate-200 rounded-md text-sm py-1.5 pl-8 pr-3 bg-white"
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusUpdating}
          >
            <option value="PENDING">در انتظار</option>
            <option value="PURCHASING">در حال خرید</option>
            <option value="PURCHASED">خریداری شده</option>
            <option value="SHIPPED">ارسال شده</option>
            <option value="DELIVERED">تحویل شده</option>
            <option value="CANCELLED">لغو شده</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              آیتم‌های سفارش
            </h3>
            <div className="space-y-3">
              {order.items?.map((item: any, idx: number) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                  <div>
                    <span className="text-sm font-medium text-slate-900">آیتم #{idx + 1}</span>
                    {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  </div>
                  <div className="text-sm font-medium" dir="ltr">{item.priceOmr} OMR</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-semibold text-slate-900">جمع کل:</span>
              <span className="font-bold text-lg text-slate-900" dir="ltr">
                {parseFloat(order.totalToman).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">اطلاعات مشتری</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">نام:</span>
                <span className="font-medium text-slate-900">{order.customer.firstName} {order.customer.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">موبایل:</span>
                <span className="font-medium text-slate-900" dir="ltr">{order.customer.phone}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              تاریخچه وضعیت
            </h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {order.history?.map((hist: any) => (
                <div key={hist.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-slate-900">{hist.status}</span>
                      <span className="text-xs text-slate-500" dir="ltr">{new Date(hist.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
