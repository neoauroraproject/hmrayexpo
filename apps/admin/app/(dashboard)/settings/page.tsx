"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import {
  DollarSign,
  Send,
  CreditCard,
  Link as LinkIcon,
  Save,
  Bell,
  Settings2,
  MessageSquareText,
  Trash2,
  Plus,
} from "lucide-react";

/** Inlined to match packages/shared/src/bot-copy.ts (admin has no @hmray/shared dep). */
const DEFAULT_BOT_COPY = {
  welcome: [
    "سلام {name}!",
    "",
    "به ربات خرید HMRAY خوش اومدی.",
    "کد مشتری تو: {customerCode}",
    "",
    "از دکمه‌های پایین هر کاری خواستی رو انجام بده.",
  ].join("\n"),
  welcomeBack: "سلام {name}، خوش برگشتی!",
  channelGateMessage: [
    "برای استفاده از ربات، اول باید عضو کانال‌های زیر بشی.",
    "بعد از عضویت، «✅ عضو شدم» رو بزن.",
  ].join("\n"),
  rulesText: [
    "قوانین و هزینه‌ها، خلاصه:",
    "",
    "• قیمت هر کالا رو جدا بررسی و اعلام می‌کنیم، معمولاً تا ۳ روز کاری.",
    "• هزینه ارسال جدا از قیمت کالاست و توی پیش‌فاکتور مشخص می‌شه.",
    "• تا وقتی پیش‌فاکتور رو تأیید نکردی، هیچ پرداختی انجام نمی‌شه.",
    "• پرداخت فقط بعد از تأیید پیش‌فاکتور و با روش‌های اعلام‌شده انجام می‌شه.",
    "• بعد از پرداخت و تأیید، سفارش ثبت و پیگیری می‌شه.",
    "• برای هر سؤال دیگه، از بخش «پشتیبانی» با ما در تماس باش.",
  ].join("\n"),
  chooseRequestType: "می‌خوای از کجا خرید کنی؟",
  maintenanceMessage: "ربات موقتاً در دسترس نیست. لطفاً کمی بعد دوباره سر بزن.",
  menus: {
    newRequest: "ثبت درخواست خرید",
    myRequests: "درخواست‌های من",
    trackOrder: "پیگیری سفارش",
    myAddresses: "آدرس‌های من",
    payments: "پرداخت‌ها",
    rules: "قوانین و هزینه‌ها",
    support: "پشتیبانی",
  },
  services: {
    temu: "خرید از Temu",
    external: "خرید از سایر فروشگاه‌ها",
    temuEnabled: true,
    externalEnabled: true,
  },
};

type BotCopyState = typeof DEFAULT_BOT_COPY;

type PaymentMethod = {
  id: string;
  title: string;
  description?: string | null;
  accountOrWallet?: string | null;
  instructions?: string | null;
  network?: string | null;
  enabled: boolean;
};

type Channel = {
  id: string;
  name: string;
  username: string;
  inviteLink?: string | null;
  required: boolean;
  enabled: boolean;
};

type PaymentForm = {
  title: string;
  description: string;
  accountOrWallet: string;
  instructions: string;
  enabled: boolean;
};

type ChannelForm = {
  name: string;
  username: string;
  inviteLink: string;
  required: boolean;
  enabled: boolean;
};

function mergeBotCopy(partial: unknown): BotCopyState {
  const p = (partial && typeof partial === "object" ? partial : {}) as Partial<BotCopyState>;
  return {
    ...DEFAULT_BOT_COPY,
    ...p,
    menus: { ...DEFAULT_BOT_COPY.menus, ...(p.menus ?? {}) },
    services: { ...DEFAULT_BOT_COPY.services, ...(p.services ?? {}) },
  };
}

const emptyPaymentForm = (): PaymentForm => ({
  title: "",
  description: "",
  accountOrWallet: "",
  instructions: "",
  enabled: true,
});

const emptyChannelForm = (): ChannelForm => ({
  name: "",
  username: "",
  inviteLink: "",
  required: true,
  enabled: true,
});

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [omrRate, setOmrRate] = useState("");
  const [botToken, setBotToken] = useState("");
  const [adminChatId, setAdminChatId] = useState("");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [botMaintenanceMode, setBotMaintenanceMode] = useState(false);
  const [quoteValidityDays, setQuoteValidityDays] = useState("3");
  const [temuBatchTargetOmr, setTemuBatchTargetOmr] = useState("100");
  const [botCopy, setBotCopy] = useState<BotCopyState>(DEFAULT_BOT_COPY);

  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [channelForm, setChannelForm] = useState<ChannelForm>(emptyChannelForm);
  const [showChannelForm, setShowChannelForm] = useState(false);

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const data = await apiFetch<any>("/admin/settings");
      setSettings(data);
      setAdminChatId(data.telegram?.adminChatId || "");

      const values = data.values ?? {};
      setBotMaintenanceMode(Boolean(values.botMaintenanceMode));
      setQuoteValidityDays(String(values.quoteValidityDays ?? 3));
      setTemuBatchTargetOmr(String(values.temuBatchTargetOmr ?? 100));
      setBotCopy(mergeBotCopy(values.botCopy));

      const liveOmr = data.liveRates?.OMR;
      if (liveOmr) setOmrRate(String(liveOmr));

      const [chData, pmData] = await Promise.all([
        apiFetch<Channel[]>("/admin/channels"),
        apiFetch<PaymentMethod[]>("/admin/payment-methods"),
      ]);
      setChannels(Array.isArray(chData) ? chData : []);
      setPaymentMethods(Array.isArray(pmData) ? pmData : []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setSettings(null);
      setChannels([]);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/settings/exchange-rates", {
        method: "POST",
        body: JSON.stringify({ rateToToman: omrRate }),
      });
      alert("نرخ ارز با موفقیت بروزرسانی شد.");
      await loadAll();
    } catch (error) {
      console.error("Failed to update exchange rate:", error);
      alert("خطا در بروزرسانی نرخ ارز");
    }
  };

  const handleUpdateTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, string> = { adminChatId };
      if (botToken.trim()) payload.botToken = botToken.trim();

      const data = await apiFetch<any>("/admin/settings/telegram", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSettings((prev: any) => ({ ...prev, telegram: data.telegram }));
      alert("تنظیمات تلگرام ذخیره شد. ربات ظرف چند ثانیه وصل می‌شود.");
      setBotToken("");
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

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      const data = await apiFetch<any>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          values: {
            botMaintenanceMode,
            quoteValidityDays: Number(quoteValidityDays),
            temuBatchTargetOmr: Number(temuBatchTargetOmr),
          },
        }),
      });
      setSettings((prev: any) => ({ ...prev, values: data.values }));
      alert("تنظیمات عمومی ذخیره شد.");
    } catch (error) {
      console.error("Failed to save general settings:", error);
      alert("خطا در ذخیره تنظیمات عمومی");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveBotCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCopy(true);
    try {
      const data = await apiFetch<any>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ values: { botCopy } }),
      });
      setSettings((prev: any) => ({ ...prev, values: data.values }));
      setBotCopy(mergeBotCopy(data.values?.botCopy));
      alert("متن‌های ربات ذخیره شد.");
    } catch (error) {
      console.error("Failed to save bot copy:", error);
      alert("خطا در ذخیره متن‌های ربات");
    } finally {
      setSavingCopy(false);
    }
  };

  const openNewPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm(emptyPaymentForm());
    setShowPaymentForm(true);
  };

  const openEditPayment = (pm: PaymentMethod) => {
    setEditingPaymentId(pm.id);
    setPaymentForm({
      title: pm.title ?? "",
      description: pm.description ?? "",
      accountOrWallet: pm.accountOrWallet ?? "",
      instructions: pm.instructions ?? "",
      enabled: pm.enabled,
    });
    setShowPaymentForm(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        title: paymentForm.title.trim(),
        description: paymentForm.description.trim() || undefined,
        accountOrWallet: paymentForm.accountOrWallet.trim() || undefined,
        instructions: paymentForm.instructions.trim() || undefined,
        enabled: paymentForm.enabled,
      };
      if (editingPaymentId) {
        await apiFetch(`/admin/payment-methods/${editingPaymentId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/admin/payment-methods", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setShowPaymentForm(false);
      setEditingPaymentId(null);
      setPaymentForm(emptyPaymentForm());
      const pmData = await apiFetch<PaymentMethod[]>("/admin/payment-methods");
      setPaymentMethods(Array.isArray(pmData) ? pmData : []);
    } catch (error) {
      console.error("Failed to save payment method:", error);
      alert("خطا در ذخیره روش پرداخت");
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("این روش پرداخت غیرفعال شود؟")) return;
    try {
      await apiFetch(`/admin/payment-methods/${id}`, { method: "DELETE" });
      const pmData = await apiFetch<PaymentMethod[]>("/admin/payment-methods");
      setPaymentMethods(Array.isArray(pmData) ? pmData : []);
    } catch (error) {
      console.error("Failed to delete payment method:", error);
      alert("خطا در حذف روش پرداخت");
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/channels", {
        method: "POST",
        body: JSON.stringify({
          name: channelForm.name.trim(),
          username: channelForm.username.trim(),
          inviteLink: channelForm.inviteLink.trim() || undefined,
          required: channelForm.required,
          enabled: channelForm.enabled,
        }),
      });
      setShowChannelForm(false);
      setChannelForm(emptyChannelForm());
      const chData = await apiFetch<Channel[]>("/admin/channels");
      setChannels(Array.isArray(chData) ? chData : []);
    } catch (error) {
      console.error("Failed to create channel:", error);
      alert("خطا در افزودن کانال");
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("این کانال حذف شود؟")) return;
    try {
      await apiFetch(`/admin/channels/${id}`, { method: "DELETE" });
      const chData = await apiFetch<Channel[]>("/admin/channels");
      setChannels(Array.isArray(chData) ? chData : []);
    } catch (error) {
      console.error("Failed to delete channel:", error);
      alert("خطا در حذف کانال");
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
                type="text"
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
                placeholder={
                  settings?.telegram?.configured
                    ? "برای تغییر توکن جدید را وارد کنید"
                    : "توکن را وارد کنید"
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                شناسه چت ادمین (Admin Chat ID)
              </label>
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
              <Button
                type="button"
                variant="outline"
                onClick={handleTestNotification}
                className="gap-2"
                title="ارسال پیام تستی به ادمین"
              >
                <Bell className="w-4 h-4" />
                تست
              </Button>
            </div>
          </form>
        </Card>

        {/* General settings */}
        <Card className="p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500" />
            تنظیمات عمومی
          </h3>
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={botMaintenanceMode}
                onChange={(e) => setBotMaintenanceMode(e.target.checked)}
                className="rounded border-slate-300"
              />
              حالت تعمیرات ربات (Maintenance)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  اعتبار پیش‌فاکتور (روز)
                </label>
                <Input
                  type="number"
                  dir="ltr"
                  min={1}
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  هدف بچ Temu (OMR)
                </label>
                <Input
                  type="number"
                  dir="ltr"
                  min={1}
                  value={temuBatchTargetOmr}
                  onChange={(e) => setTemuBatchTargetOmr(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={savingGeneral} className="gap-2">
              <Save className="w-4 h-4" />
              ذخیره تنظیمات عمومی
            </Button>
          </form>
        </Card>

        {/* Payment Methods */}
        <Card className="p-5 md:col-span-2" id="payment-methods">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              روش‌های پرداخت
            </h3>
            <Button variant="outline" size="sm" className="gap-1" onClick={openNewPayment}>
              <Plus className="w-3.5 h-3.5" />
              افزودن روش
            </Button>
          </div>

          {showPaymentForm && (
            <form
              onSubmit={handleSavePayment}
              className="mb-4 p-4 border border-slate-200 rounded-md space-y-3 bg-slate-50"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">عنوان</label>
                  <Input
                    value={paymentForm.title}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    حساب / کیف پول
                  </label>
                  <Input
                    dir="ltr"
                    value={paymentForm.accountOrWallet}
                    onChange={(e) =>
                      setPaymentForm((f) => ({ ...f, accountOrWallet: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات</label>
                <Input
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">دستورالعمل</label>
                <Textarea
                  value={paymentForm.instructions}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, instructions: e.target.value }))}
                  rows={3}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={paymentForm.enabled}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                فعال
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  {editingPaymentId ? "بروزرسانی" : "ثبت"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setEditingPaymentId(null);
                  }}
                >
                  انصراف
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {paymentMethods.length === 0 && (
              <p className="text-sm text-slate-500">روش پرداختی ثبت نشده است.</p>
            )}
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100 gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900">{pm.title}</div>
                  {(pm.description || pm.accountOrWallet || pm.instructions) && (
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      {pm.description && <div>{pm.description}</div>}
                      {pm.accountOrWallet && (
                        <div dir="ltr">{pm.accountOrWallet}</div>
                      )}
                      {pm.instructions && <div className="whitespace-pre-wrap">{pm.instructions}</div>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      pm.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {pm.enabled ? "فعال" : "غیرفعال"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => openEditPayment(pm)}>
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePayment(pm.id)}
                    title="غیرفعال‌سازی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setChannelForm(emptyChannelForm());
                setShowChannelForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              افزودن کانال
            </Button>
          </div>

          {showChannelForm && (
            <form
              onSubmit={handleSaveChannel}
              className="mb-4 p-4 border border-slate-200 rounded-md space-y-3 bg-slate-50"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">نام</label>
                  <Input
                    value={channelForm.name}
                    onChange={(e) => setChannelForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">یوزرنیم</label>
                  <Input
                    dir="ltr"
                    value={channelForm.username}
                    onChange={(e) => setChannelForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="@channel"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">لینک دعوت</label>
                <Input
                  dir="ltr"
                  value={channelForm.inviteLink}
                  onChange={(e) => setChannelForm((f) => ({ ...f, inviteLink: e.target.value }))}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={channelForm.required}
                    onChange={(e) =>
                      setChannelForm((f) => ({ ...f, required: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  اجباری
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={channelForm.enabled}
                    onChange={(e) =>
                      setChannelForm((f) => ({ ...f, enabled: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  فعال
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  ثبت
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowChannelForm(false)}
                >
                  انصراف
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {channels.length === 0 && (
              <p className="text-sm text-slate-500">کانالی ثبت نشده است.</p>
            )}
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100 gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900">{ch.name}</div>
                  <div className="text-xs text-slate-500 mt-1" dir="ltr">
                    @{ch.username.replace(/^@/, "")}
                  </div>
                  {ch.inviteLink && (
                    <a
                      href={ch.inviteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                      dir="ltr"
                    >
                      {ch.inviteLink}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      ch.required ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {ch.required ? "اجباری" : "اختیاری"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      ch.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {ch.enabled ? "فعال" : "غیرفعال"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteChannel(ch.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bot copy */}
        <Card className="p-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-slate-500" />
            متن‌های ربات
          </h3>
          <form onSubmit={handleSaveBotCopy} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  پیام خوش‌آمد (welcome) — {"{name}"}, {"{customerCode}"}
                </label>
                <Textarea
                  rows={5}
                  value={botCopy.welcome}
                  onChange={(e) => setBotCopy((c) => ({ ...c, welcome: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  خوش‌آمد مجدد (welcomeBack)
                </label>
                <Textarea
                  rows={3}
                  value={botCopy.welcomeBack}
                  onChange={(e) => setBotCopy((c) => ({ ...c, welcomeBack: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  پیام عضویت کانال
                </label>
                <Textarea
                  rows={4}
                  value={botCopy.channelGateMessage}
                  onChange={(e) =>
                    setBotCopy((c) => ({ ...c, channelGateMessage: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  قوانین و هزینه‌ها
                </label>
                <Textarea
                  rows={4}
                  value={botCopy.rulesText}
                  onChange={(e) => setBotCopy((c) => ({ ...c, rulesText: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  انتخاب نوع درخواست
                </label>
                <Input
                  value={botCopy.chooseRequestType}
                  onChange={(e) =>
                    setBotCopy((c) => ({ ...c, chooseRequestType: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  پیام حالت تعمیرات
                </label>
                <Input
                  value={botCopy.maintenanceMessage}
                  onChange={(e) =>
                    setBotCopy((c) => ({ ...c, maintenanceMessage: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-800 mb-2">برچسب دکمه‌های منو</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    ["newRequest", "ثبت درخواست"],
                    ["myRequests", "درخواست‌های من"],
                    ["trackOrder", "پیگیری سفارش"],
                    ["myAddresses", "آدرس‌های من"],
                    ["payments", "پرداخت‌ها"],
                    ["rules", "قوانین"],
                    ["support", "پشتیبانی"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
                    <Input
                      value={botCopy.menus[key]}
                      onChange={(e) =>
                        setBotCopy((c) => ({
                          ...c,
                          menus: { ...c.menus, [key]: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-800 mb-2">سرویس‌ها</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">برچسب Temu</label>
                  <Input
                    value={botCopy.services.temu}
                    onChange={(e) =>
                      setBotCopy((c) => ({
                        ...c,
                        services: { ...c.services, temu: e.target.value },
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={botCopy.services.temuEnabled}
                      onChange={(e) =>
                        setBotCopy((c) => ({
                          ...c,
                          services: { ...c.services, temuEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    Temu فعال
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    برچسب فروشگاه خارجی
                  </label>
                  <Input
                    value={botCopy.services.external}
                    onChange={(e) =>
                      setBotCopy((c) => ({
                        ...c,
                        services: { ...c.services, external: e.target.value },
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={botCopy.services.externalEnabled}
                      onChange={(e) =>
                        setBotCopy((c) => ({
                          ...c,
                          services: { ...c.services, externalEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    فروشگاه خارجی فعال
                  </label>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={savingCopy} className="gap-2">
              <Save className="w-4 h-4" />
              ذخیره متن‌های ربات
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
