"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Search, MessageCircle, User, Compass } from "lucide-react";

const links = [
  { href: "/search", icon: Search, label: "Explore" },
  { href: "/map", icon: MapPin, label: "Map" },
  { href: "/chat", icon: MessageCircle, label: "AI Chat" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function TopNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 font-bold text-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">Poca</span>
        </Link>
        <div className="hidden md:flex items-center space-x-1 text-sm">
          {links.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${
                path.startsWith(href) ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" /> <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
