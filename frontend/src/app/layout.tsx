import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { AnnouncementModal } from "@/components/ui/AnnouncementModal";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poca — Jelajahi Indonesia dengan AI Companion Pintar",
  description: "Rencanakan perjalanan impian Anda di Indonesia dengan bantuan asisten cerdas. Dapatkan rekomendasi personal, jadwal perjalanan otomatis, dan panduan lokal dalam satu aplikasi.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poca",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#004ac6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-background text-foreground font-sans">
        <Providers>
          <TopNav />
          <main className="flex-1 pb-[calc(var(--bottom-nav-h)+var(--safe-b))] md:pb-0">{children}</main>
          <BottomNav />
          <ToastContainer />
          <AnnouncementModal />
        </Providers>
      </body>
    </html>
  );
}
