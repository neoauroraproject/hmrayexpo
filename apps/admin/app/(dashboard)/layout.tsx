"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/api";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { Topbar } from "@/app/components/layout/Topbar";
import { X } from "lucide-react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Inbox, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  LifeBuoy, 
  Settings, 
  Activity, 
  Search,
  DollarSign,
  Wallet
} from "lucide-react";

const navItems = [
  { name: "داشبورد", href: "/", icon: LayoutDashboard },
  { name: "درخواست‌ها", href: "/requests", icon: Inbox },
  { name: "سفارش‌ها", href: "/orders", icon: ShoppingCart },
  { name: "مشتریان", href: "/customers", icon: Users },
  { name: "پرداخت‌ها", href: "/payments", icon: CreditCard },
  { name: "پشتیبانی", href: "/support", icon: LifeBuoy },
  { name: "نرخ ارز", href: "/settings#exchange", icon: DollarSign },
  { name: "روش‌های پرداخت", href: "/settings#payment-methods", icon: Wallet },
  { name: "تنظیمات", href: "/settings", icon: Settings },
  { name: "Audit Logs", href: "/audit", icon: Activity },
  { name: "جستجو", href: "/search", icon: Search },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed top-0 bottom-0 right-0 w-64 bg-slate-900 text-slate-50 flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight">HMRAY Admin</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split("#")[0]));
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? "bg-slate-800 text-white" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
