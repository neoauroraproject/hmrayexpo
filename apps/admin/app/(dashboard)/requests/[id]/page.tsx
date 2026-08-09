"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Composer } from "@/app/components/ui/Composer";
import { ExternalLink, User, Clock, FileText, CheckCircle } from "lucide-react";

export default function RequestWorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [omrRate, setOmrRate] = useState("160000"); // Example default
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch request details
    const fetchRequest = async () => {
      try {
        const data = await apiFetch<any>(`/admin/requests/${id}`);
        setRequest(data);
        
        // Initialize prices
        const prices: Record<string, string> = {};
        data.items?.forEach((item: any) => {
          prices[item.id] = item.priceOmr || "";
        });
        setItemPrices(prices);
      } catch (error) {
        console.error("Failed to fetch request:", error);
        // Mock data for UI
        const mockData = {
          id,
          code: `RQ-${id.substring(0, 4)}`,
          type: "TEMU",
          status: "REQUESTED",
          createdAt: new Date().toISOString(),
          customer: {
            id: "c1",
            firstName: "علی",
            lastName: "رضایی",
            phone: "09123456789",
          },
          items: [
            { id: "i1", url: "https://temu.com/product/123", note: "رنگ مشکی سایز L", priceOmr: "", imageUrl: null },
            { id: "i2", url: "https://temu.com/product/456", note: "دو عدد", priceOmr: "", imageUrl: null },
          ],
          messages: [
            { id: "m1", text: "سلام، لطفا قیمت این دو مورد را اعلام کنید.", sender: "CUSTOMER", createdAt: new Date().toISOString() }
          ]
        };
        setRequest(mockData);
        
        const prices: Record<string, string> = {};
        mockData.items.forEach((item) => {
          prices[item.id] = item.priceOmr;
        });
        setItemPrices(prices);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handlePriceChange = async (itemId: string, val: string) => {
    setItemPrices(prev => ({ ...prev, [itemId]: val }));
    try {
      await apiFetch(`/admin/requests/${id}/items/${itemId}/price`, {
        method: "PATCH",
        body: JSON.stringify({ priceOmr: val ? parseFloat(val) : null }),
      });
    } catch (error) {
      console.error("Failed to update price:", error);
    }
  };

  const handleIssueQuote = async () => {
    try {
      await apiFetch(`/admin/requests/${id}/quotes`, {
        method: "POST",
        body: JSON.stringify({ omrRate: parseFloat(omrRate) }),
      });
      await apiFetch(`/admin/quotes/${id}/issue`, {
        method: "POST",
      });
      alert("پیش‌فاکتور با موفقیت صادر شد.");
      // Refresh data
    } catch (error) {
      console.error("Failed to issue quote:", error);
      alert("خطا در صدور پیش‌فاکتور");
    }
  };

  const handleSendMessage = async (text: string, attachmentIds: string[]) => {
    try {
      await apiFetch(`/admin/requests/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text, attachmentIds }),
      });
      // Refresh messages
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  };

  const mapStatus = (status: string): any => {
    switch (status) {
      case "REQUESTED": return "pending";
      case "QUOTED": return "payment";
      case "REJECTED": return "draft";
      default: return "draft";
    }
  };

  if (loading || !request) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  const totalOmr = Object.values(itemPrices).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const totalToman = totalOmr * parseFloat(omrRate || "0");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">فضای کاری درخواست {request.code}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {/* Change status */}}>تغییر وضعیت</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right Column: Info */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-slate-500" />
              اطلاعات درخواست
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">کد:</span>
                <span className="font-medium text-slate-900">{request.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نوع:</span>
                <span className="font-medium text-slate-900">{request.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">وضعیت:</span>
                <StatusBadge status={mapStatus(request.status)} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاریخ ثبت:</span>
                <span className="font-medium text-slate-900" dir="ltr">
                  {new Date(request.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-500" />
              اطلاعات مشتری
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">نام:</span>
                <span className="font-medium text-slate-900">{request.customer.firstName} {request.customer.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">موبایل:</span>
                <span className="font-medium text-slate-900" dir="ltr">{request.customer.phone}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Center Column: Products */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">لیست محصولات</h3>
            <div className="space-y-4">
              {request.items?.map((item: any, idx: number) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="w-16 h-16 bg-slate-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs">بدون عکس</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="truncate">
                        <span className="text-xs font-medium text-slate-500 mb-1 block">آیتم #{idx + 1}</span>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 truncate">
                            لینک محصول <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="w-32">
                        <label className="text-xs text-slate-500 block mb-1">قیمت (OMR)</label>
                        <Input 
                          type="number" 
                          dir="ltr"
                          value={itemPrices[item.id] || ""}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {item.note && (
                      <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-100">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Timeline / Messages */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              پیام‌ها و تاریخچه
            </h3>
            
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto p-2">
              {request.messages?.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    msg.sender === 'ADMIN' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}>
                    <p>{msg.text}</p>
                    <span className={`text-[10px] block mt-1 ${msg.sender === 'ADMIN' ? 'text-slate-400' : 'text-slate-400'}`} dir="ltr">
                      {new Date(msg.createdAt).toLocaleTimeString('fa-IR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Composer onSend={handleSendMessage} />
          </div>
        </div>

        {/* Left Column: Pricing Panel */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">پنل قیمت‌گذاری</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نرخ تبدیل (تومان / OMR)</label>
                <Input 
                  type="number" 
                  dir="ltr"
                  value={omrRate}
                  onChange={(e) => setOmrRate(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">جمع محصولات (OMR):</span>
                  <span className="font-medium text-slate-900" dir="ltr">{totalOmr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">جمع به تومان:</span>
                  <span className="font-medium text-slate-900" dir="ltr">
                    {totalToman.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full gap-2" 
                  onClick={handleIssueQuote}
                  disabled={totalOmr === 0}
                >
                  <CheckCircle className="w-4 h-4" />
                  صدور پیش‌فاکتور
                </Button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  پیش‌فاکتور تا ۲۴ ساعت معتبر خواهد بود.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
