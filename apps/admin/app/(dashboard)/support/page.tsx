"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { Composer } from "@/app/components/ui/Composer";
import { Plus, MessageSquare } from "lucide-react";
import { CreateRequestModal } from "@/app/components/ui/CreateRequestModal";

interface TicketItem {
  id: string;
  code: string;
  subject: string;
  status: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  };
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await apiFetch<TicketItem[]>("/admin/tickets");
        setTickets(data);
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
        setTickets([
          {
            id: "t1",
            code: "T-0001",
            subject: "پیگیری سفارش",
            status: "OPEN",
            createdAt: new Date().toISOString(),
            customer: { firstName: "علی", lastName: "رضایی" }
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleSelectTicket = async (id: string) => {
    try {
      const data = await apiFetch<any>(`/admin/tickets/${id}`);
      setSelectedTicket(data);
    } catch (error) {
      console.error("Failed to fetch ticket details:", error);
      setSelectedTicket({
        id,
        code: "T-0001",
        subject: "پیگیری سفارش",
        status: "OPEN",
        messages: [
          { id: "m1", text: "سلام، سفارش من کی ارسال میشه؟", sender: "CUSTOMER", createdAt: new Date().toISOString() }
        ]
      });
    }
  };

  const handleReply = async (text: string, attachmentIds: string[]) => {
    if (!selectedTicket) return;
    try {
      await apiFetch(`/admin/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text, attachmentIds }),
      });
      // Refresh ticket messages ideally
      alert("پاسخ ارسال شد.");
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("خطا در ارسال پاسخ");
    }
  };

  const mapStatus = (status: string): any => {
    switch (status) {
      case "OPEN": return "pending";
      case "CLOSED": return "draft";
      default: return "pending";
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">پشتیبانی</h1>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          ایجاد درخواست جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Tickets List */}
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
                      <span className="font-medium text-slate-900 text-sm">{ticket.subject}</span>
                      <StatusBadge status={mapStatus(ticket.status)} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                      <span>{ticket.customer.firstName} {ticket.customer.lastName}</span>
                      <span dir="ltr">{new Date(ticket.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Ticket Thread */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-slate-100 shrink-0 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500 mt-1">کد: {selectedTicket.code}</p>
                  </div>
                  <Button variant="outline" size="sm">بستن تیکت</Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                  {selectedTicket.messages?.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        msg.sender === 'ADMIN' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-sm'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className={`text-[10px] block mt-2 ${msg.sender === 'ADMIN' ? 'text-slate-400' : 'text-slate-400'}`} dir="ltr">
                          {new Date(msg.createdAt).toLocaleTimeString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
                  <Composer onSend={handleReply} placeholder="پاسخ خود را بنویسید..." />
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

      <CreateRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
