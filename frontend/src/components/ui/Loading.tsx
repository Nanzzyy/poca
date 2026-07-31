"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MapPin, Clock, Wallet, Compass, Plane } from "lucide-react";

const DEFAULT_MESSAGES = [
  "Memuat data...",
  "Menyiapkan konten...",
  "Hampir selesai...",
];

// Feature-specific message sequences — cycling text gives the user a sense of
// progress instead of an opaque spinner.
const MESSAGE_SETS: Record<string, string[]> = {
  chat: [
    "Poca AI sedang berpikir...",
    "Menganalisis preferensimu...",
    "Mencari destinasi terbaik...",
    "Menyusun jawaban...",
  ],
  plan: [
    "Menyusun rencana perjalanan...",
    "Menghitung estimasi budget...",
    "Memilih aktivitas terbaik...",
    "Mengoptimalkan rute harian...",
    "Merapikan itinerary...",
  ],
  feed: [
    "Memuat cerita perjalanan...",
    "Mengambil postingan terbaru...",
    "Menyusun feed...",
  ],
  search: [
    "Mencari destinasi...",
    "Menyaring hasil...",
    "Mengumpulkan rekomendasi...",
  ],
  profile: [
    "Memuat profil...",
    "Menghitung statistik...",
    "Menyiapkan data...",
  ],
};

const ICONS = [Sparkles, MapPin, Compass, Plane, Clock, Wallet];

export function Loading({
  variant = "chat",
  className = "",
}: {
  variant?: keyof typeof MESSAGE_SETS | string;
  className?: string;
}) {
  const messages = MESSAGE_SETS[variant] || DEFAULT_MESSAGES;
  const [idx, setIdx] = useState(0);
  const [iconIdx, setIconIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => setIconIdx(i => (i + 1) % ICONS.length), 900);
    return () => clearInterval(t);
  }, []);

  const Icon = ICONS[iconIdx];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Animated orbit spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
        <motion.div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          key={iconIdx}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center text-primary"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Rotating status message */}
      <div className="h-6 flex items-center">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-[14px] font-medium text-on-surface-variant"
        >
          {messages[idx]}
        </motion.p>
      </div>

      {/* Indeterminate progress bar */}
      <div className="w-48 h-1.5 rounded-full bg-surface-container overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "45%" }}
        />
      </div>
    </div>
  );
}
