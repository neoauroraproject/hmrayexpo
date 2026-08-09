"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { DollarSign, Send, CreditCard, Link as LinkIcon, Save, Bell } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Forms state
  const [omrRate, setOmrRate] = useState("");
  const [botToken, setBotToken] = useState("");
  const [adminChatId, setAdminChatId] = useState("");
  
  // Channels & Payment methods (simplified for Phase 1)
  const [channels, setChannels] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiFetch<any>("/admin/settings");
        setSettings(data);
        setAdminChatId(data.telegram?.adminChatId || "");
        
        // Fetch channels and payment methods
        const [chData, pmData] = await Promise.all([
          apiFetch<any[]>("/admin/channels"),
          apiFetch<any[]>("/admin/payment-methods")
        ]);
        setChannels(chData);
        setPaymentMethods(pmData);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        // Mock data
        setSettings({
          telegram: { configured: true, adminChatId: "123456789" },
          notifications: { newRequest: true, newPayment: true }
        });
        setChannels([{ id: "1", title: "کانال اصلی", url: "https://t.me/hmray", isRequired: true }]);
        setPaymentMethods([{ id: "1", title: "کارت به کارت", details: "شماره کارت: ۱۲۳۴", isActive: true }]);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/settings/exchange-rates", {
        method: "POST",
        body: JSON.stringify({ rate: parseFloat(omrRate) }),
      });
      alert("نرخ ارز با موفقیت بروزرسانی شد.");
      setOmrRate("");
    } catch (error) {
      console.error("Failed to update exchange rate:", error);
      alert("خطا در بروزرسانی نرخ ارز");
    }
  };

  const handleUpdateTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { adminChatId };
      if (botToken) payload.botToken = botToken;
      
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ telegram: payload }),
      });
      alert("تنظیمات تلگرام بروزرسانی شد.");
      setBotToken(""); // Clear token input
    } catch (error) {
      console.error("Failed to update telegram settings:", error);
      alert("خطا در بروزرسانی تنظیمات تلگرام");
    }
  };

  const handleTestNotification = async () => {
    try {
      await apiFetch("/admin/settings/test-notification", { method: "POST" });
      alert("اعلان تستی ارسال شد.");
    } catch (error) {
      console.error("Failed to send test notification:", error);
      alert("خطا در ارسال اعلان تستی");
    }
  };

  if (loading) return <div className="p-8 text-center">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">تنظیمات سیستم</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exchange Rate */}
        <Card className="p-5" id="exchange">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            نرخ ارز (OMR به تومان)
          </h3>
          <form onSubmit={handleUpdateExchangeRate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">نرخ جدید</label>
              <Input 
                type="number" 
                dir="ltr"
                value={omrRate}
                onChange={(e) => setOmrRate(e.target.value)}
                placeholder="مثال: 160000"
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <Save className="w-4 h-4" />
              ثبت نرخ جدید
            </Button>
          </form>
        </Card>

        {/* Telegram Bot */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-500" />
            تنظیمات ربات تلگرام
          </h3>
          <form onSubmit={handleUpdateTelegram} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex justify-between">
                <span>توکن ربات (Bot Token)</span>
                {settings?.telegram?.configured && (
                  <span className="text-green-600 flex items-center gap-1 text-[10px]">
                    تنظیم شده ✓
                  </span>
                )}
              </label>
              <Input 
                type="password" 
                dir="ltr"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={settings?.telegram?.configured ? "برای تغییر توکن جدید را وارد کنید" : "توکن را وارد کنید"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">شناسه چت ادمین (Admin Chat ID)</label>
              <Input 
                type="text" 
                dir="ltr"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
                placeholder="مثال: 123456789"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                ذخیره
              </Button>
              <Button type="button" variant="outline" onClick={handleTestNotification} className="gap-2" title="ارسال پیام تستی به ادمین">
                <Bell className="w-4 h-4" />
                تست
              </Button>
            </div>
          </form>
        </Card>

        {/* Payment Methods */}
        <Card className="p-5 md:col-span-2" id="payment-methods">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              روش‌های پرداخت
            </h3>
            <Button variant="outline" size="sm">افزودن روش</Button>
          </div>
          <div className="space-y-3">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                <div>
                  <div className="font-medium text-sm text-slate-900">{pm.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{pm.details}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${pm.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {pm.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                  <Button variant="outline" size="sm">ویرایش</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Required Channels */}
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-slate-500" />
              کانال‌های اجباری (عضویت)
            </h3>
            <Button variant="outline" size="sm">افزودن کانال</Button>
          </div>
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                <div>
                  <div className="font-medium text-sm text-slate-900">{ch.title}</div>
                  <a href={ch.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block" dir="ltr">{ch.url}</a>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${ch.isRequired ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {ch.isRequired ? 'اجباری' : 'اختیاری'}
                  </span>
                  <Button variant="outline" size="sm">حذف</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
