"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrafficTracker } from "@/components/TrafficTracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Admin has its own shell (sidebar); no public nav + no self-tracking.
  if (path.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <TrafficTracker />
      <TopNav />
      <main className="flex-1 pb-[calc(var(--bottom-nav-h)+var(--safe-b))] md:pb-0">{children}</main>
      <BottomNav />
    </>
  );
}
