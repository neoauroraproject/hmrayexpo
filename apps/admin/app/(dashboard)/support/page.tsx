"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { displayUserName, unwrapItems } from "@/lib/list";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { Composer } from "@/app/components/ui/Composer";
import { MessageSquare } from "lucide-react";

interface TicketItem {
  id: string;
  code: string;
  subject: string;
  status: string;
  createdAt: string;
  user?: {
    displayName?: string | null;
    customerCode?: string | null;
  } | null;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setError(null);
    try {
      const data = await apiFetch<unknown>("/admin/tickets");
      setTickets(unwrapItems<TicketItem>(data));
    } catch (err: any) {
      console.error("Failed to fetch tickets:", err);
      setTickets([]);
      setError(err?.message || "خطا در بارگذاری تیکت‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSelectTicket = async (id: string) => {
    try {
      const data = await apiFetch<any>(`/admin/tickets/${id}`);
      setSelectedTicket(data);
    } catch (err) {
      console.error("Failed to fetch ticket details:", err);
      alert("خطا در بارگذاری تیکت");
    }
  };

  const handleReply = async (text: string) => {
    if (!selectedTicket) return;
    try {
      await apiFetch(`/admin/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      await handleSelectTicket(selectedTicket.id);
    } catch (err) {
      console.error("Failed to send reply:", err);
      alert("خطا در ارسال پاسخ");
    }
  };

  const mapStatus = (status: string): any => {
    switch (status) {
      case "OPEN":
        return "pending";
      case "CLOSED":
        return "draft";
      default:
        return "pending";
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">پشتیبانی</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-4 flex flex-col h-full">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h3 className="font-semibold text-slate-900">لیست تیکت‌ها</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="p-4 text-center text-slate-500 text-sm">در حال بارگذاری...</div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">تیکتی یافت نشد.</div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket.id)}
                    className={`w-full text-right p-3 rounded-lg border transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? "bg-slate-50 border-slate-300"
                        : "bg-white border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {ticket.subject || ticket.code}
                      </span>
                      <StatusBadge status={mapStatus(ticket.status)} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                      <span>{displayUserName(ticket.user)}</span>
                      <span dir="ltr">
                        {new Date(ticket.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-slate-100 shrink-0 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {selectedTicket.subject || "تیکت پشتیبانی"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">کد: {selectedTicket.code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSelectTicket(selectedTicket.id)}>
                    بروزرسانی
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                  {(selectedTicket.messages ?? []).map((msg: any) => {
                    const fromAdmin = Boolean(msg.fromAdmin || msg.sender === "ADMIN");
                    const body = msg.body ?? msg.text ?? "";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 text-sm ${
                            fromAdmin
                              ? "bg-slate-900 text-white rounded-tr-none"
                              : "bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{body}</p>
                          <span
                            className="text-[10px] block mt-2 text-slate-400"
                            dir="ltr"
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("fa-IR")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
                  <Composer onSend={(text) => handleReply(text)} placeholder="پاسخ خود را بنویسید..." />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p>یک تیکت را برای مشاهده انتخاب کنید</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
