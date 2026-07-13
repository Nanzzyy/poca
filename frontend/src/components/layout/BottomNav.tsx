"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MapPin, Briefcase, MessageCircle, User } from "lucide-react";

const links = [
  { href: "/search", icon: Search, label: "Explore" },
  { href: "/map", icon: MapPin, label: "Map" },
  { href: "/trips", icon: Briefcase, label: "Trips" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14">
        {links.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-lg transition-colors ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "fill-blue-50" : ""}`} />
              <span className={`text-[10px] font-medium ${active ? "text-blue-600" : "text-gray-500"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
