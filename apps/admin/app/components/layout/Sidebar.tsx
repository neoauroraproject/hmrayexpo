"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Wallet,
  Boxes,
  Truck,
  Megaphone,
  BarChart3,
  Undo2,
} from "lucide-react";

const navItems = [
  { name: "داشبورد", href: "/", icon: LayoutDashboard },
  { name: "درخواست‌ها", href: "/requests", icon: Inbox },
  { name: "سفارش‌ها", href: "/orders", icon: ShoppingCart },
  { name: "بسته‌های گروهی", href: "/batches", icon: Boxes },
  { name: "روش‌های ارسال", href: "/shipping", icon: Truck },
  { name: "مرجوعی", href: "/returns", icon: Undo2 },
  { name: "مشتریان", href: "/customers", icon: Users },
  { name: "پرداخت‌ها", href: "/payments", icon: CreditCard },
  { name: "پشتیبانی", href: "/support", icon: LifeBuoy },
  { name: "پیام همگانی", href: "/broadcasts", icon: Megaphone },
  { name: "گزارش‌ها", href: "/analytics", icon: BarChart3 },
  { name: "نرخ ارز", href: "/settings#exchange", icon: DollarSign },
  { name: "روش‌های پرداخت", href: "/settings#payment-methods", icon: Wallet },
  { name: "تنظیمات", href: "/settings", icon: Settings },
  { name: "Audit Logs", href: "/audit", icon: Activity },
  { name: "جستجو", href: "/search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-50 flex flex-col h-full border-l border-slate-800 hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">HMRAY Admin</h1>
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
  );
}
