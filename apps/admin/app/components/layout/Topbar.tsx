"use client";

import { Bell, Search, Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, removeAuthToken } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  event?: string;
};

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<AdminNotification[]>("/admin/notifications");
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Keep last good list if the poll fails (e.g. logged out mid-session).
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const id = window.setInterval(() => {
      void loadNotifications();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleLogout = () => {
    removeAuthToken();
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      );
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/admin/notifications/read-all", { method: "PATCH" });
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-md md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="hidden sm:flex items-center relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3" />
          <input
            type="text"
            placeholder="جستجو..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-4 pr-9 py-2 bg-slate-100 border-transparent rounded-md text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none w-64 transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative"
            aria-label="اعلان‌ها"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900">اعلان‌ها</span>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs text-slate-600 hover:text-slate-900"
                  disabled={unreadCount === 0}
                >
                  خواندن همه
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">اعلانی نیست</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className={`w-full text-right px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        !n.readAt ? "bg-slate-50/80" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            !n.readAt ? "font-semibold text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.readAt && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatRelative(n.createdAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900">مدیر سیستم</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
            title="خروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
