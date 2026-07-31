"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Fire-and-forget page-view log to backend (→ /admin/traffic, dashboard).
export function TrafficTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin") || path.startsWith("/auth")) return;
    try {
      const blob = new Blob([JSON.stringify({ path })], { type: "application/json" });
      navigator.sendBeacon(`${API}/analytics/track`, blob);
    } catch {
      // non-critical — swallow
    }
  }, [path]);
  return null;
}
