"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { useProfile } from "@/lib/queries";
import { LayoutDashboard, MapPin, Users, BarChart3, Tags, LogOut, Menu } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/destinations", label: "Destinasi", icon: MapPin },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/traffic", label: "Traffic", icon: BarChart3 },
  { href: "/admin/categories", label: "Kategori", icon: Tags },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);
  const { data: user } = useProfile();
  const [sidebar, setSidebar] = useState(false);

  const isLogin = path === "/admin/login";

  // Admin-scoped logout: clear token, stay in /admin (no full reload to "/").
  const adminLogout = () => {
    setToken(null);
    qc.clear();
    router.replace("/admin/login");
  };

  useEffect(() => {
    if (!token && !isLogin) router.replace("/admin/login");
    if (token && user && user.role !== "admin" && !isLogin) {
      setToken(null);
      router.replace("/admin/login");
    }
  }, [token, user, isLogin, router, setToken]);

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex h-screen bg-surface-container-low text-on-surface">
      {/* Mobile overlay */}
      {sidebar && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebar(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-surface-container-lowest border-r border-outline-variant/20 flex flex-col transition-transform ${sidebar ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-5 border-b border-outline-variant/20">
          <h1 className="text-[20px] font-bold text-primary">Poca Admin</h1>
          <p className="text-[11px] text-on-surface-variant">{user?.username || "Admin"}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebar(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                path === href ? "bg-primary/10 text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-outline-variant/20">
          <button
            onClick={adminLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-error/10 hover:text-error w-full transition-colors"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 px-5 h-14 flex items-center justify-between">
          <button onClick={() => setSidebar(true)} className="lg:hidden p-1">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[13px] text-on-surface-variant">Admin Panel</span>
          <div className="w-5" />
        </header>
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
