"use client";

import { Bell, Search, Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeAuthToken } from "@/lib/api";
import { useState } from "react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

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
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
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
