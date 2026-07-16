import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { AnnouncementModal } from "@/components/ui/AnnouncementModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poca — AI Tourism Companion",
  description: "Discover, plan, and experience your next adventure with AI",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Providers>
          <TopNav />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <BottomNav />
          <ToastContainer />
          <AnnouncementModal />
        </Providers>
      </body>
    </html>
  );
}
