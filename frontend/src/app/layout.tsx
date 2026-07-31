import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ToastContainer } from "@/components/ui/Toast";
import { AnnouncementModal } from "@/components/ui/AnnouncementModal";
import { AppShell } from "@/components/layout/AppShell";

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
          <AppShell>{children}</AppShell>
          <ToastContainer />
          <AnnouncementModal />
        </Providers>
      </body>
    </html>
  );
}
