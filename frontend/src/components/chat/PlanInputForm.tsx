"use client";

import { Sparkles } from "lucide-react";

interface Props {
  onGenerate: (prompt: string) => void;
  loading?: boolean;
}

const QUICK_TEMPLATES = [
  { label: "🏖️ Liburan santai di Bali", prompt: "Buatkan rencana liburan santai ke Bali" },
  { label: "🏔️ Mendaki Gunung Bromo", prompt: "Tolong susun rencana mendaki gunung di Bromo" },
  { label: "🍜 Wisata Kuliner Jogja", prompt: "Buatkan rencana wisata kuliner di Jogja" },
  { label: "🏛️ Tour Sejarah Candi", prompt: "Tolong susun rencana trip untuk explore candi di Jogja" },
  { label: "🌿 Healing ke Bandung", prompt: "Buatkan itinerary untuk healing ke daerah Bandung" },
  { label: "🎒 Backpacking Jawa Timur", prompt: "Tolong buat rencana backpacking keliling Jawa Timur sehemat mungkin" },
];

export function PlanInputForm({ onGenerate, loading }: Props) {
  return (
    <div className="w-full space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-secondary" />
          <span className="text-[14px] font-bold text-on-surface">Mulai Cepat — Pilih Template</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => onGenerate(t.prompt)}
              disabled={loading}
              className="text-left p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl hover:border-secondary/40 hover:shadow-sm transition-all active:scale-[0.98] text-[12px] leading-snug disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
