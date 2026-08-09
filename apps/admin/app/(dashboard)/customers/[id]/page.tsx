"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Textarea";
import { CreateRequestModal } from "@/app/components/ui/CreateRequestModal";
import { User, MapPin, Plus, FileText, AlertCircle, ShoppingBag, Wallet, LifeBuoy } from "lucide-react";

export default function CustomerProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any>(`/admin/customers/${id}`);
      setCustomer(data);
    } catch (err: any) {
      console.error("Failed to fetch customer:", err);
      setCustomer(null);
      setError(err?.message || "خطا در بارگذاری اطلاعات مشتری");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const note = await apiFetch<any>(`/admin/customers/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteText.trim(), visibility: "INTERNAL" }),
      });
      setCustomer((prev: any) => ({
        ...prev,
        notes: [note, ...(prev?.notes ?? [])],
      }));
      setNoteText("");
    } catch (err) {
      console.error("Failed to add note:", err);
      alert("خطا در ثبت یادداشت");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  if (error || !customer) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-700 font-medium">مشتری یافت نشد یا خطایی رخ داد.</p>
        {error && <p className="text-sm text-slate-500">{error}</p>}
        <Button variant="outline" onClick={fetchCustomer}>تلاش دوباره</Button>
      </Card>
    );
  }

  const displayName =
    customer.displayName ||
    [customer.telegramAccount?.firstName, customer.telegramAccount?.lastName].filter(Boolean).join(" ") ||
    customer.customerCode;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">پروفایل مشتری: {displayName}</h1>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          ایجاد درخواست
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              اطلاعات پایه
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">کد مشتری:</span>
                <span className="font-medium text-slate-900" dir="ltr">{customer.customerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">موبایل:</span>
                <span className="font-medium text-slate-900" dir="ltr">{customer.phone || "-"}</span>
              </div>
              {customer.telegramAccount && (
                <div className="flex justify-between">
                  <span className="text-slate-500">تلگرام:</span>
                  <span className="font-medium text-slate-900" dir="ltr">
                    {customer.telegramAccount.username ? `@${customer.telegramAccount.username}` : "-"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">وضعیت:</span>
                <span className="font-medium text-slate-900">{customer.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاریخ عضویت:</span>
                <span className="font-medium text-slate-900" dir="ltr">
                  {new Date(customer.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              آدرس‌ها
            </h3>
            <div className="space-y-3">
              {customer.addresses?.map((addr: any) => (
                <div key={addr.id} className="p-3 bg-slate-50 rounded-md text-sm border border-slate-100">
                  <div className="font-medium text-slate-900 mb-1">
                    {addr.recipientName} {addr.isDefault && <span className="text-xs text-slate-400">(پیش‌فرض)</span>}
                  </div>
                  <div className="text-slate-600 mb-1">
                    {addr.province}، {addr.city}، {addr.address}
                  </div>
                  <div className="text-slate-500 text-xs" dir="ltr">
                    {addr.mobile} — کد پستی: {addr.postalCode}
                  </div>
                </div>
              ))}
              {(!customer.addresses || customer.addresses.length === 0) && (
                <div className="text-sm text-slate-500 text-center py-2">آدرسی ثبت نشده است.</div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              یادداشت‌های داخلی
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="یادداشت جدید..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddNote} disabled={!noteText.trim() || savingNote}>
                  {savingNote ? "در حال ثبت..." : "ثبت یادداشت"}
                </Button>
              </div>

              <div className="space-y-3 mt-6">
                {customer.notes?.map((note: any) => (
                  <div key={note.id} className="p-3 bg-amber-50/50 rounded-md border border-amber-100 text-sm">
                    <p className="text-slate-800 whitespace-pre-wrap">{note.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">{note.authorAdmin?.displayName ?? ""}</span>
                      <span className="text-xs text-slate-400" dir="ltr">
                        {new Date(note.createdAt).toLocaleString("fa-IR")}
                      </span>
                    </div>
                  </div>
                ))}
                {(!customer.notes || customer.notes.length === 0) && (
                  <div className="text-sm text-slate-500 text-center py-2">یادداشتی ثبت نشده است.</div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">تاریخچه فعالیت‌ها</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-md text-center">
                <FileText className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-slate-900">{customer.requests?.length ?? 0}</div>
                <div className="text-xs text-slate-500">درخواست</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md text-center">
                <ShoppingBag className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-slate-900">{customer.orders?.length ?? 0}</div>
                <div className="text-xs text-slate-500">سفارش</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md text-center">
                <Wallet className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-slate-900">{customer.payments?.length ?? 0}</div>
                <div className="text-xs text-slate-500">پرداخت</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-md text-center">
                <LifeBuoy className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-slate-900">{customer.tickets?.length ?? 0}</div>
                <div className="text-xs text-slate-500">تیکت</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <CreateRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultCustomerId={id} />
    </div>
  );
}
