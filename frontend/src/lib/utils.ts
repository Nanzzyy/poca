import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "IDR") {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function timeAgo(date: string | Date) {
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 8640000);
  if (days > 0) return `${days} hari lalu`;
  if (hours > 0) return `${hours} jam lalu`;
  if (mins > 0) return `${mins} menit lalu`;
  return "baru saja";
}

// source.unsplash.com is defunct (503). Use the destination's real image when
// present; fall back to a branded placeholder only when empty/dead.
export function destImage(images?: string[] | null, name?: string | null): string {
  const real = images?.find((u) => u && !u.includes("source.unsplash"));
  if (real) return real;
  const text = encodeURIComponent((name || "Poca").slice(0, 24));
  return `https://placehold.co/800x600/004ac6/ffffff?text=${text}`;
}
