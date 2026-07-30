"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MapPin, MessageCircle, Newspaper, Home } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Cari" },
  { href: "/map", icon: MapPin, label: "Peta" },
  { href: "/feed", icon: Newspaper, label: "Feed" },
  { href: "/chat", icon: MessageCircle, label: "AI" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-white border-t border-gray-100 safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
      <div className="flex items-stretch justify-around h-[4.5rem] max-w-lg mx-auto px-2 relative">
        {links.map(({ href, icon: Icon, label }) => {
          const active = path ? (href === "/" ? path === "/" : path.startsWith(href)) : false;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center flex-1 gap-1 min-w-0 press-scale"
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${active ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-600"}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] leading-none font-medium transition-colors ${active ? "text-blue-600" : "text-gray-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
