"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "../../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";

interface QuoteItem {
  id: string;
  displayIndex: number;
  productCode: string;
  title: string | null;
  quantity: number;
  price: string;
  currency: string;
  imageUrl: string | null;
  totalToman: string;
  totalTomanLabel: string;
}

interface QuoteNote {
  id: string;
  body: string;
}

interface PaymentMethod {
  id: string;
  title: string;
  description: string;
  accountOrWallet: string;
  network: string;
  instructions: string;
}

interface QuoteData {
  code: string;
  status: string;
  isExpired: boolean;
  omrRate: string;
  productsTotal: string;
  productsTotalLabel: string;
  expiresAt: string;
  sentAt: string;
  acceptedAt: string | null;
  request: { code: string; type: string; storeName: string };
  customer: { customerCode: string; displayName: string };
  items: QuoteItem[];
  notes: QuoteNote[];
  paymentMethods: PaymentMethod[];
}

export function QuoteClient({ code }: { code: string }) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Confirm state
  const [priceChecked, setPriceChecked] = useState(false);
  const [shippingChecked, setShippingChecked] = useState(false);
  const [validityChecked, setValidityChecked] = useState(false);
  const [inspectionType, setInspectionType] = useState<"FULL_OPEN" | "VISUAL_ONLY" | "SEALED">("VISUAL_ONLY");
  const [confirming, setConfirming] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  // Payment state
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [code]);

  async function loadQuote() {
    try {
      setLoading(true);
      const data = await apiFetch<QuoteData>(`/public/quotes/${code}`);
      setQuote(data);
      if (data.status === "ACCEPTED") {
        setAwaitingPayment(true);
      }
    } catch (err: any) {
      setError(err.message || "خطا در دریافت اطلاعات پیش‌فاکتور");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!quote) return;
    if (!priceChecked || !shippingChecked || !validityChecked) {
      alert("لطفاً تمامی شرایط را تأیید کنید");
      return;
    }

    try {
      setConfirming(true);
      const res = await apiFetch<any>(`/public/quotes/${code}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          acceptedNoteIds: quote.notes.map((n) => n.id),
          acceptedTerms: true,
          inspectionType,
        }),
      });
      setQuote({ ...quote, paymentMethods: res.paymentMethods });
      setAwaitingPayment(true);
    } catch (err: any) {
      alert(err.message || "خطا در تأیید پیش‌فاکتور");
    } finally {
      setConfirming(false);
    }
  }

  async function handlePayment() {
    if (!selectedMethodId) {
      alert("لطفاً یک روش پرداخت انتخاب کنید");
      return;
    }

    try {
      setPaying(true);
      const formData = new FormData();
      formData.append("methodId", selectedMethodId);
      formData.append("source", "WEB");
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      await apiUpload(`/public/quotes/${code}/payments`, formData);
      setPaymentSuccess(true);
    } catch (err: any) {
      alert(err.message || "خطا در ثبت پرداخت");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  if (error || !quote) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
        <Button onClick={loadQuote} variant="outline" className="mt-4">تلاش مجدد</Button>
      </div>
    );
  }

  if (quote.isExpired) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 text-4xl">⏳</div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">پیش‌فاکتور منقضی شده است</h2>
          <p className="mb-6 text-slate-600">اعتبار این پیش‌فاکتور به پایان رسیده است.</p>
          <Button variant="default" className="w-full">درخواست بررسی مجدد</Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 text-4xl text-green-500">✅</div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">پرداخت ثبت شد</h2>
          <p className="mb-6 text-slate-600">
            رسید شما با موفقیت ثبت شد و پس از تأیید، سفارش شما ثبت خواهد شد.
          </p>
          <Button onClick={() => window.location.href = `/o/${quote.code}`} variant="outline" className="w-full">
            پیگیری سفارش
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">خلاصه خرید شما</h1>
        <p className="mt-1 text-sm text-slate-500 font-mono">{quote.code}</p>
      </div>

      <div className="space-y-4">
        {quote.items.map((item, idx) => (
          <Card key={item.id} className="overflow-hidden border-slate-200">
            <CardContent className="p-4 flex gap-4">
              {item.imageUrl ? (
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  <img src={item.imageUrl} alt={item.title || ""} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-20 w-20 shrink-0 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                  بدون تصویر
                </div>
              )}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">#{String(idx + 1).padStart(2, "0")}</div>
                  <h3 className="font-medium text-slate-900 line-clamp-2">{item.title || item.productCode}</h3>
                </div>
                <div className="mt-2 text-left font-bold text-slate-900">
                  {item.totalTomanLabel} <span className="text-xs font-normal text-slate-500">تومان</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-600">مبلغ کل محصولات</span>
          <span className="text-lg font-bold text-slate-900">{quote.productsTotalLabel} تومان</span>
        </div>
        
        {quote.notes && quote.notes.length > 0 && (
          <div className="mb-4 space-y-2 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-900">توضیحات پیش‌فاکتور:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 pr-2">
              {quote.notes.map((note) => (
                <li key={note.id}>{note.body}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <strong>توجه:</strong> قیمت علی‌الحساب؛ ممکن است تغییر کند.
        </div>

        <div className="text-sm text-slate-500 text-center">
          اعتبار تا: {new Date(quote.expiresAt).toLocaleDateString("fa-IR")}
        </div>
      </div>

      {!awaitingPayment ? (
        <div className="mt-6 space-y-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900">تأیید شرایط</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={priceChecked} onChange={(e) => setPriceChecked(e.target.checked)} />
              <span className="text-sm text-slate-700">شرایط قیمت علی‌الحساب را می‌پذیرم</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={shippingChecked} onChange={(e) => setShippingChecked(e.target.checked)} />
              <span className="text-sm text-slate-700">هزینه ارسال جداگانه محاسبه می‌شود</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={validityChecked} onChange={(e) => setValidityChecked(e.target.checked)} />
              <span className="text-sm text-slate-700">اعتبار پیش‌فاکتور تا تاریخ مقرر است</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="mb-3 text-sm font-bold text-slate-900">نوع بررسی کالا</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="inspection" value="FULL_OPEN" checked={inspectionType === "FULL_OPEN"} onChange={() => setInspectionType("FULL_OPEN")} className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm text-slate-700">بررسی کامل و باز کردن</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="inspection" value="VISUAL_ONLY" checked={inspectionType === "VISUAL_ONLY"} onChange={() => setInspectionType("VISUAL_ONLY")} className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm text-slate-700">فقط ظاهری</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="inspection" value="SEALED" checked={inspectionType === "SEALED"} onChange={() => setInspectionType("SEALED")} className="h-4 w-4 text-primary focus:ring-primary" />
                <span className="text-sm text-slate-700">بدون باز کردن و پلمپ</span>
              </label>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-base" 
            onClick={handleConfirm} 
            disabled={confirming || !priceChecked || !shippingChecked || !validityChecked}
          >
            {confirming ? "در حال ثبت..." : "تأیید و ادامه"}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900">پرداخت</h3>
          
          <div className="space-y-3">
            {quote.paymentMethods.map((method) => (
              <label key={method.id} className={`block cursor-pointer rounded-lg border p-4 transition-colors ${selectedMethodId === method.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="paymentMethod" value={method.id} checked={selectedMethodId === method.id} onChange={() => setSelectedMethodId(method.id)} className="h-4 w-4 text-primary focus:ring-primary" />
                  <div>
                    <div className="font-medium text-slate-900">{method.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{method.accountOrWallet}</div>
                  </div>
                </div>
                {selectedMethodId === method.id && method.instructions && (
                  <div className="mt-3 text-sm text-slate-600 bg-white p-3 rounded border border-slate-100 whitespace-pre-wrap">
                    {method.instructions}
                  </div>
                )}
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="mb-2 text-sm font-medium text-slate-900">آپلود رسید پرداخت</h4>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <p className="mt-2 text-xs text-slate-500">
              در صورت عدم آپلود در اینجا، می‌توانید رسید را از طریق ربات تلگرام ارسال کنید.
            </p>
          </div>

          <Button 
            className="w-full h-12 text-base" 
            onClick={handlePayment} 
            disabled={paying || !selectedMethodId}
          >
            {paying ? "در حال ثبت..." : "ثبت پرداخت"}
          </Button>
        </div>
      )}
    </div>
  );
}
