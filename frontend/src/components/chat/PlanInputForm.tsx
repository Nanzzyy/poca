"use client";

import { useState } from "react";
import { Calendar, Users, Wallet, MapPin, Sparkles } from "lucide-react";

export interface PlanFormData {
  location: string;
  days: number;
  people: number;
  budget: number;
  interest: string;
}

interface Props {
  onGenerate: (data: PlanFormData) => void;
  loading?: boolean;
}

const QUICK_TEMPLATES = [
  { label: "🏖️ Weekend di Bali", location: "Bali", days: 2, people: 2, budget: 3000000, interest: "pantai" },
  { label: "🏔️ Petualangan Gunung", location: "Bromo", days: 3, people: 3, budget: 2000000, interest: "gunung" },
  { label: "🍜 Tur Kuliner Jogja", location: "Yogyakarta", days: 2, people: 1, budget: 1000000, interest: "kuliner" },
  { label: "🏛️ Wisata Sejarah", location: "Jogja", days: 3, people: 2, budget: 2500000, interest: "candi" },
  { label: "🌿 Alam & Relaksasi", location: "Bandung", days: 2, people: 2, budget: 1500000, interest: "alam" },
  { label: "🎒 Backpacker Nusantara", location: "Indonesia", days: 5, people: 1, budget: 3000000, interest: "alam" },
];

const INTERESTS = [
  { key: "pantai", label: "🏖️ Pantai" },
  { key: "gunung", label: "🏔️ Gunung" },
  { key: "candi", label: "🏛️ Candi" },
  { key: "kuliner", label: "🍜 Kuliner" },
  { key: "budaya", label: "🎭 Budaya" },
  { key: "alam", label: "🌿 Alam" },
];

export function PlanInputForm({ onGenerate, loading }: Props) {
  const [step, setStep] = useState<"templates" | "custom">("templates");
  const [form, setForm] = useState<PlanFormData>({
    location: "", days: 2, people: 2, budget: 2000000, interest: "",
  });

  const buildPrompt = (data: PlanFormData) => {
    let prompt = `Buatkan rencana perjalanan ${data.days} hari`;
    if (data.location) prompt += ` di ${data.location}`;
    prompt += ` untuk ${data.people} orang`;
    if (data.budget > 0) prompt += ` dengan budget Rp${data.budget.toLocaleString("id-ID")}`;
    if (data.interest) prompt += `, minat: ${data.interest}`;
    prompt += `. Berikan detail aktivitas per hari, estimasi biaya, dan rekomendasi tempat.`;
    return prompt;
  };

  return (
    <div className="w-full space-y-4">
      {step === "templates" ? (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              <span className="text-[14px] font-bold text-on-surface">Mulai Cepat — Pilih Template</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => onGenerate(t)}
                  disabled={loading}
                  className="text-left p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl hover:border-secondary/40 hover:shadow-sm transition-all active:scale-[0.98] text-[12px] leading-snug disabled:opacity-50"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/30" /></div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-[10px] text-on-surface-variant">ATAU</span>
            </div>
          </div>
          <button
            onClick={() => setStep("custom")}
            className="w-full py-3 border border-dashed border-outline-variant rounded-xl text-[13px] text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-[0.98]"
          >
            + Buat Rencana Custom
          </button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onGenerate(form); }} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-on-surface">Rencana Custom</span>
            <button type="button" onClick={() => setStep("templates")} className="text-[11px] text-on-surface-variant hover:text-primary">← Kembali</button>
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant mb-1 block">Destinasi / Daerah</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input type="text" placeholder="Misal: Bali, Jogja, Bandung..." className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant mb-1 block">Durasi (hari)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input type="number" min={1} max={7} className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={form.days} onChange={(e) => setForm({ ...form, days: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)) })} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant mb-1 block">Orang</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input type="number" min={1} max={10} className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={form.people} onChange={(e) => setForm({ ...form, people: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant mb-1 block">Budget Total (Rp)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input type="number" step={500000} className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/50 rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant mb-1 block">Minat (opsional)</label>
            <div className="flex gap-1.5 flex-wrap">
              {INTERESTS.map((opt) => (
                <button
                  key={opt.key} type="button"
                  onClick={() => setForm({ ...form, interest: form.interest === opt.key ? "" : opt.key })}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${form.interest === opt.key ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit" disabled={loading || !form.location.trim()}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-[13px] hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</> : <><Sparkles className="w-4 h-4" /> Buat Rencana dengan AI</>}
          </button>
        </form>
      )}
    </div>
  );
}
