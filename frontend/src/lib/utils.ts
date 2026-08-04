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

const LEGACY_IMAGE_HOST = "source.unsplash.com";

export function isUsableDestinationImage(url?: string | null): url is string {
  return Boolean(url && !url.includes(LEGACY_IMAGE_HOST));
}

// Keep image fallback local so a third-party image outage cannot break cards.
export function destImage(images?: string[] | null, name?: string | null): string {
  const real = images?.find(isUsableDestinationImage);
  if (real) return real;
  // Keep the argument in the public helper signature for callers that use it
  // as alt/fallback context, even though the local placeholder is generic.
  void name;
  return "/destination-placeholder.svg";
}
