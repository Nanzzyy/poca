"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, User, Menu, X, Sparkles, Search, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/stores";
import { useUnreadCount, useProfile } from "@/lib/queries";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Discover" },
  { href: "/map", label: "Map" },
  { href: "/feed", label: "Feed" },
  { href: "/chat", label: "AI Assistant", icon: Sparkles },
];

export function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (href: string) => {
    if (href === "/") return path === "/";
    return path ? path.startsWith(href) : false;
  };

  const showAuthed = mounted && token;
  const { data: user } = useProfile();
  const logout = useAuthStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Map page has its own in-sidebar search — hide the global one there.
  const onMap = path?.startsWith("/map") ?? false;
  const { data: unread } = useUnreadCount();

  // Close menu on click outside
  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  // Block background scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm">
      <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/poca.svg" alt="Poca" className="w-8 h-8 rounded-lg" />
            <span className="text-[24px] font-bold leading-[1.2] tracking-tight text-primary">Poca</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-[14px] leading-[1.5] transition-colors flex items-center gap-1 ${
                    active
                      ? "text-primary font-bold"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {Icon && <Icon className="w-[18px] h-[18px]" />}
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar — desktop (hidden on /map, which has its own sidebar search) */}
          {!onMap && (
          <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30">
            <Search className="w-4 h-4 text-outline mr-2" />
            <input
              type="text"
              placeholder="Cari destinasi..."
              className="bg-transparent border-none focus:ring-0 text-[13px] w-36 outline-none text-on-surface placeholder:text-outline"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchQ.trim()) { router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`); setSearchQ(""); } }}
            />
          </div>
          )}

          <Link
            href="/notifications"
            className="relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-transform active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {!!(unread?.count) && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center">
                {unread.count > 9 ? "9+" : unread.count}
              </span>
            )}
          </Link>
          <div className="h-8 w-px bg-outline-variant/30 mx-1 hidden sm:block" />
          {showAuthed ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant overflow-hidden flex items-center justify-center text-on-surface-variant hover:border-primary/30 transition-colors"
              >
                {user?.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : (user?.username || "U")[0].toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1 z-[200]">
                  <div className="px-4 py-2 border-b border-outline-variant/20">
                    <p className="text-[13px] font-bold text-on-surface flex items-center gap-1">
                      {user?.username || "User"}
                      {user?.is_verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <User className="w-4 h-4" /> Profil Saya
                  </Link>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); router.push("/"); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-[14px] leading-[1.5] px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors font-bold"
            >
              Masuk
            </Link>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-container-low transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute top-16 left-0 right-0 bg-surface border-b border-outline-variant/30 shadow-lg"
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 space-y-1">
                {/* Mobile search (hidden on /map) */}
                {!onMap && (
                <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 mb-2 border border-outline-variant/30">
                  <Search className="w-4 h-4 text-outline mr-2" />
                  <input
                    type="text"
                    placeholder="Cari destinasi..."
                    className="bg-transparent border-none focus:ring-0 text-[14px] flex-1 outline-none"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && searchQ.trim()) { router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`); setSearchQ(""); setOpen(false); } }}
                  />
                </div>
                )}
                {links.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3.5 rounded-lg text-[14px] leading-[1.5] transition-colors ${
                        active ? "bg-surface-container text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      {label}
                    </Link>
                  );
                })}
                {!token && (
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-[14px] leading-[1.5] text-on-surface-variant hover:bg-surface-container-low mt-2 border-t border-outline-variant/20 pt-4"
                  >
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
