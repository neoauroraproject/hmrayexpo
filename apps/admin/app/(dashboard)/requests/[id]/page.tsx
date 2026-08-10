"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { displayUserName } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Composer } from "@/app/components/ui/Composer";
import { ExternalLink, User, Clock, FileText, CheckCircle } from "lucide-react";

interface TelegramAccount {
  username?: string | null;
  telegramUserId?: string | null;
}

interface RequestUser {
  id: string;
  customerCode?: string | null;
  displayName?: string | null;
  phone?: string | null;
  telegramAccount?: TelegramAccount | null;
}

interface RequestItemRow {
  id: string;
  title?: string | null;
  originalUrl?: string | null;
  userNote?: string | null;
  price?: string | number | null;
  currency?: string | null;
  images?: string[] | null;
  imageUrl?: string | null;
  displayIndex?: number | null;
  productCode?: string | null;
  status?: string | null;
}

interface EntityNote {
  id: string;
  body: string;
  visibility?: string | null;
  createdAt: string;
  authorAdmin?: { id: string; displayName?: string | null } | null;
}

interface QuoteRow {
  id: string;
  code?: string | null;
  status?: string | null;
  url?: string | null;
}

interface RequestWorkspace {
  id: string;
  code: string;
  type: string;
  status: string;
  createdAt: string;
  user?: RequestUser | null;
  items?: RequestItemRow[];
  notes?: EntityNote[];
  quotes?: QuoteRow[];
}

function itemThumb(item: RequestItemRow): string | null {
  if (item.imageUrl) return item.imageUrl;
  if (item.images?.length) return item.images[0] ?? null;
  return null;
}

function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function formatToman(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "۰";
  return Math.round(value).toLocaleString("fa-IR");
}

const DEFAULT_OMR_RATE = "160000";

export default function RequestWorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [omrRate, setOmrRate] = useState(DEFAULT_OMR_RATE);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [refreshingPreviewId, setRefreshingPreviewId] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadOmrRate = useCallback(async () => {
    try {
      const settings = await apiFetch<{ liveRates?: { OMR?: string | number | null } }>(
        "/admin/settings",
      );
      const liveOmr = settings.liveRates?.OMR;
      if (liveOmr !== null && liveOmr !== undefined && String(liveOmr).trim() !== "") {
        setOmrRate(String(liveOmr));
      } else {
        setOmrRate(DEFAULT_OMR_RATE);
      }
    } catch {
      setOmrRate(DEFAULT_OMR_RATE);
    }
  }, []);

  const loadRequest = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      const data = await apiFetch<RequestWorkspace>(`/admin/requests/${id}`);
      setRequest(data);
      const prices: Record<string, string> = {};
      data.items?.forEach((item) => {
        prices[item.id] = formatPrice(item.price);
      });
      setItemPrices(prices);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطا در بارگذاری درخواست";
      if (/404|not found|یافت نشد/i.test(message)) {
        setNotFound(true);
        setRequest(null);
      } else {
        setError(message);
        setRequest(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadRequest();
    void loadOmrRate();
  }, [loadRequest, loadOmrRate]);

  const handlePriceSave = async (itemId: string) => {
    const val = itemPrices[itemId]?.trim() ?? "";
    if (!val || Number.isNaN(Number(val))) return;
    setSavingPriceId(itemId);
    setActionError(null);
    try {
      await apiFetch(`/admin/requests/${id}/items/${itemId}/price`, {
        method: "PATCH",
        body: JSON.stringify({ price: val, currency: "OMR" }),
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "خطا در ذخیره قیمت");
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleIssueQuote = async () => {
    setIssuing(true);
    setActionError(null);
    try {
      const quote = await apiFetch<{ id: string }>(`/admin/requests/${id}/quotes`, {
        method: "POST",
        body: JSON.stringify({ omrRate: String(omrRate) }),
      });
      await apiFetch(`/admin/quotes/${quote.id}/issue`, {
        method: "POST",
      });
      await loadRequest();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "خطا در صدور پیش‌فاکتور");
    } finally {
      setIssuing(false);
    }
  };

  const handleRefreshPreview = async (itemId: string) => {
    setRefreshingPreviewId(itemId);
    setActionError(null);
    try {
      await apiFetch(`/admin/requests/${id}/items/${itemId}/refresh-preview`, {
        method: "POST",
      });
      await loadRequest();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "خطا در بروزرسانی عکس");
    } finally {
      setRefreshingPreviewId(null);
    }
  };

  const handleSendMessage = async (text: string, _attachmentIds: string[]) => {
    setActionError(null);
    try {
      await apiFetch(`/admin/requests/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      await loadRequest();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "خطا در ارسال پیام");
      throw err;
    }
  };

  const mapStatus = (status: string): "draft" | "pending" | "payment" | "success" | "shipped" => {
    switch (status) {
      case "REQUESTED":
        return "pending";
      case "QUOTED":
        return "payment";
      case "REJECTED":
      case "CANCELLED":
      case "EXPIRED":
        return "draft";
      default:
        return "draft";
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  if (notFound) {
    return <div className="p-8 text-center text-slate-500">درخواست یافت نشد.</div>;
  }

  if (error || !request) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-red-600">{error || "خطا در بارگذاری درخواست"}</p>
        <Button variant="outline" onClick={() => { setLoading(true); void loadRequest(); }}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const rateNum = parseFloat(omrRate || "0") || 0;
  const totalOmr = Object.values(itemPrices).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const totalToman = totalOmr * rateNum;
  const user = request.user;
  const notes = request.notes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">فضای کاری درخواست {request.code}</h1>
      </div>

      {actionError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  {new Date(request.createdAt).toLocaleDateString("fa-IR")}
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
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">نام:</span>
                <span className="font-medium text-slate-900 text-left">{displayUserName(user)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">کد مشتری:</span>
                <span className="font-medium text-slate-900" dir="ltr">
                  {user?.customerCode || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">موبایل:</span>
                <span className="font-medium text-slate-900" dir="ltr">
                  {user?.phone || "—"}
                </span>
              </div>
              {user?.telegramAccount?.username && (
                <div className="flex justify-between">
                  <span className="text-slate-500">تلگرام:</span>
                  <span className="font-medium text-slate-900" dir="ltr">
                    @{user.telegramAccount.username}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {(request.quotes?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">پیش‌فاکتورها</h3>
              <div className="space-y-2 text-sm">
                {request.quotes!.map((quote) => (
                  <div key={quote.id} className="flex justify-between gap-2 items-center">
                    <span className="font-medium text-slate-900">{quote.code || quote.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{quote.status}</span>
                      {quote.url && (
                        <a
                          href={quote.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          لینک
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">لیست محصولات</h3>
            <div className="space-y-4">
              {(request.items?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">آیتمی ثبت نشده است.</p>
              ) : (
                request.items!.map((item) => {
                  const thumb = itemThumb(item);
                  const idx = item.displayIndex ?? 0;
                  const priceOmr = parseFloat(itemPrices[item.id] || "") || 0;
                  const priceToman = priceOmr * rateNum;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50"
                    >
                      <div className="w-16 h-16 bg-slate-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="Product" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-400 text-xs">بدون عکس</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-3">
                          <div className="truncate min-w-0">
                            <span className="text-xs font-medium text-slate-500 mb-1 block">
                              آیتم #{idx}
                              {item.productCode ? ` · ${item.productCode}` : ""}
                            </span>
                            {item.title ? (
                              <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">
                                {item.title}
                              </p>
                            ) : null}
                            {item.originalUrl && (
                              <a
                                href={item.originalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1 truncate"
                              >
                                لینک محصول <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {item.originalUrl && (!thumb || !item.title) && (
                              <button
                                type="button"
                                onClick={() => void handleRefreshPreview(item.id)}
                                disabled={refreshingPreviewId === item.id}
                                className="text-[11px] text-blue-600 hover:underline mt-1 disabled:opacity-50"
                              >
                                {refreshingPreviewId === item.id
                                  ? "در حال بروزرسانی…"
                                  : "بروزرسانی عکس و عنوان"}
                              </button>
                            )}
                            {item.status && (
                              <span className="text-[11px] text-slate-400 mt-1 block">{item.status}</span>
                            )}
                          </div>
                          <div className="w-36 shrink-0">
                            <label className="text-xs text-slate-500 block mb-1">
                              قیمت (OMR)
                              {savingPriceId === item.id ? " …" : ""}
                            </label>
                            <Input
                              type="number"
                              dir="ltr"
                              value={itemPrices[item.id] || ""}
                              onChange={(e) =>
                                setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              onBlur={() => void handlePriceSave(item.id)}
                              className="h-8 text-sm"
                              placeholder="0.00"
                            />
                            <p className="text-[11px] text-slate-500 mt-1" dir="rtl">
                              ≈ {formatToman(priceToman)} تومان
                            </p>
                          </div>
                        </div>
                        {item.userNote && (
                          <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-100">
                            {item.userNote}
                          </p>
                        )}
                        {(item.images?.length ?? 0) > 1 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {item.images!.slice(0, 6).map((src) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={src}
                                src={src}
                                alt=""
                                className="w-10 h-10 rounded object-cover border border-slate-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              پیام‌ها و یادداشت‌ها
            </h3>

            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto p-2">
              {notes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">پیامی ثبت نشده است.</p>
              ) : (
                notes.map((note) => {
                  const fromAdmin = Boolean(note.authorAdmin);
                  return (
                    <div
                      key={note.id}
                      className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          fromAdmin
                            ? "bg-slate-900 text-white rounded-tr-none"
                            : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
                        }`}
                      >
                        {note.authorAdmin?.displayName && (
                          <span
                            className={`text-[10px] block mb-1 ${
                              fromAdmin ? "text-slate-400" : "text-slate-400"
                            }`}
                          >
                            {note.authorAdmin.displayName}
                            {note.visibility ? ` · ${note.visibility}` : ""}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap">{note.body}</p>
                        <span
                          className={`text-[10px] block mt-1 ${
                            fromAdmin ? "text-slate-400" : "text-slate-400"
                          }`}
                          dir="ltr"
                        >
                          {new Date(note.createdAt).toLocaleString("fa-IR")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Composer onSend={handleSendMessage} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">پنل قیمت‌گذاری</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  نرخ تبدیل (تومان به ازای ۱ OMR)
                </label>
                <Input
                  type="number"
                  dir="ltr"
                  value={omrRate}
                  onChange={(e) => setOmrRate(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  از تنظیمات بارگذاری شده؛ قابل ویرایش است. مشتری مبلغ را به تومان می‌بیند.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">جمع OMR:</span>
                  <span className="font-medium text-slate-900" dir="ltr">
                    {totalOmr.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">جمع تومان (پرداخت مشتری):</span>
                  <span className="font-medium text-slate-900">
                    {formatToman(totalToman)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleIssueQuote()}
                  disabled={totalOmr === 0 || issuing}
                >
                  <CheckCircle className="w-4 h-4" />
                  {issuing ? "در حال صدور..." : "صدور پیش‌فاکتور"}
                </Button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  با نرخ بالا صادر می‌شود؛ مشتری مبلغ را به تومان می‌بیند.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
