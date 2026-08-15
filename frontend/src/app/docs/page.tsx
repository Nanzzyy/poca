"use client";

import { TopNav } from "@/components/layout/TopNav";
import { 
  Server, 
  Monitor, 
  Container, 
  Brain, 
  Map, 
  Users, 
  Navigation, 
  Gamepad2, 
  MessageSquareText, 
  Cpu, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  Lock,
  FastForward,
  Settings
} from "lucide-react";
import { useState } from "react";

export default function SystemDocsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "architecture" | "modules" | "aiflow" | "security">("overview");

  const tabs = [
    { id: "overview", label: "Ikhtisar" },
    { id: "architecture", label: "Arsitektur" },
    { id: "modules", label: "Modul Utama" },
    { id: "aiflow", label: "Alur AI (Tiered Flow)" },
    { id: "security", label: "Keamanan" },
  ];

  return (
    <main className="min-h-screen bg-background pb-20">
      <TopNav />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/10 pt-8 pb-12 border-b border-outline-variant/30">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center backdrop-blur-md border border-primary/30">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[28px] font-black text-on-surface leading-tight">Poca Architecture</h1>
              <p className="text-[14px] font-medium text-primary tracking-wide">AI Tourism Companion for Indonesia</p>
            </div>
          </div>
          <p className="text-on-surface-variant text-[15px] leading-relaxed max-w-2xl mt-4">
            Dokumen interaktif ini menjelaskan secara komprehensif mengenai arsitektur, aliran data (flow), dan komponen-komponen utama dari sistem Poca sebelum diserahkan ke juri lomba.
          </p>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-[60px] z-20 bg-background/80 backdrop-blur-xl border-b border-outline-variant/30 px-6 py-3">
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
                activeTab === t.id 
                  ? "bg-primary text-on-primary shadow-md shadow-primary/20" 
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-6 pt-8 space-y-12">
        
        {/* OVERVIEW */}
        {(activeTab === "overview" || activeTab === "architecture") && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
              <Server className="text-primary w-6 h-6" />
              <h2 className="text-[22px] font-bold text-on-surface">Tech Stack & Infrastruktur</h2>
            </div>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">
              Poca menggunakan arsitektur Client-Server modern yang sepenuhnya Asynchronous (non-blocking) untuk memastikan latensi minimal dan skalabilitas tinggi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/40 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-on-surface mb-2">Backend API</h3>
                <ul className="space-y-2 text-[13px] text-on-surface-variant">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Python 3.12 + FastAPI</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> PostgreSQL 16 (asyncpg)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Redis 7 (Caching & Rate Limit)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> LiteLLM (AI Integration)</li>
                </ul>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/40 hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/5 group">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-on-surface mb-2">Frontend PWA</h3>
                <ul className="space-y-2 text-[13px] text-on-surface-variant">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> Next.js 14 (App Router)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> React + TypeScript</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> TailwindCSS (Styling)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> Zustand & React Query</li>
                </ul>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/40 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/5 group">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Container className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-on-surface mb-2">DevOps & Deploy</h3>
                <ul className="space-y-2 text-[13px] text-on-surface-variant">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Docker & Compose</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Coolify (PaaS)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> CI/CD Otomatis</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* MODULES */}
        {(activeTab === "overview" || activeTab === "modules") && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mt-8">
              <Cpu className="text-secondary w-6 h-6" />
              <h2 className="text-[22px] font-bold text-on-surface">Komponen & Modul Utama</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {[
                { icon: Brain, title: "Conversational AI & Planner", desc: "Otak utama Poca. Mendeteksi niat (intent) pengguna, mewawancarai kebutuhan, dan menyusun itinerary dinamis secara context-aware." },
                { icon: Map, title: "Destinasi & Places UGC", desc: "Katalog destinasi wisata yang diperkaya otomatis. Pengguna dapat memberikan rating dan ulasan (review)." },
                { icon: Users, title: "Community Feed", desc: "Mirip media sosial mini. Pengguna membuat post, membagikan foto perjalanan, serta saling berinteraksi (like & comment)." },
                { icon: Navigation, title: "Interactive Maps", desc: "Visualisasi koordinat destinasi di atas peta interaktif menggunakan leaflet dan react-leaflet." },
                { icon: Gamepad2, title: "Gamification", desc: "Meningkatkan retensi dengan User Points, Leveling, Badges (Explorer, Reviewer), dan Global Leaderboard." },
              ].map((mod, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant transition-all">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                    <mod.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-on-surface mb-1">{mod.title}</h3>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed">{mod.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI FLOW */}
        {(activeTab === "overview" || activeTab === "aiflow") && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mt-8">
              <Zap className="text-amber-500 w-6 h-6" />
              <h2 className="text-[22px] font-bold text-on-surface">Alur Kerja Cerdas AI (Tiered AI)</h2>
            </div>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">
              Inovasi terbesar Poca adalah arsitektur <strong>Tiered AI</strong>. Sistem tidak langsung membuang query ke LLM berbayar, melainkan menyaringnya melalui State Machine lokal (0 token, 0 ms latency) terlebih dahulu.
            </p>

            <div className="relative border-l-2 border-outline-variant/30 ml-4 mt-8 space-y-8 pb-4">
              
              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-4 border-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <span className="text-[11px] font-black tracking-widest text-primary uppercase">Step 1: Tier 0</span>
                <h3 className="text-[16px] font-bold text-on-surface mt-1">NLP Intent Classification</h3>
                <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                  <p className="text-[13px] text-on-surface-variant">
                    User input: <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[12px]">"Buatkan rencana liburan santai ke Bali"</span><br/><br/>
                    Regex/NLP lokal membedah input dan menetapkan `Intent = PLAN_CREATE` dan `Location = Bali`. 
                  </p>
                </div>
              </div>

              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-4 border-primary" />
                <span className="text-[11px] font-black tracking-widest text-primary uppercase">Step 2: Tier 0</span>
                <h3 className="text-[16px] font-bold text-on-surface mt-1">Conversation State Machine</h3>
                <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                  <p className="text-[13px] text-on-surface-variant">
                    Sistem mendeteksi slot <span className="font-mono">num_days</span> dan <span className="font-mono">budget</span> masih kosong. <br/>
                    Status diubah ke <span className="font-mono bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded text-[12px]">AWAITING_DAYS</span>.<br/><br/>
                    Backend membalas instan tanpa memanggil API pihak ketiga: <br/>
                    <span className="italic text-secondary">"Tentu! Berapa hari kamu mau liburan di Bali?"</span>
                  </p>
                </div>
              </div>

              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-4 border-primary" />
                <span className="text-[11px] font-black tracking-widest text-primary uppercase">Step 3: Konteks Lanjutan</span>
                <h3 className="text-[16px] font-bold text-on-surface mt-1">Pengumpulan Slot Kosong</h3>
                <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                  <p className="text-[13px] text-on-surface-variant">
                    User membalas hari dan budget secara bertahap. Sistem terus menyimpan state (Memory) hingga semua kriteria terpenuhi untuk sebuah *Plan*.
                  </p>
                </div>
              </div>

              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-4 border-secondary shadow-[0_0_10px_rgba(var(--secondary),0.5)]" />
                <span className="text-[11px] font-black tracking-widest text-secondary uppercase">Step 4: Tier 1</span>
                <h3 className="text-[16px] font-bold text-on-surface mt-1">LLM Generation (LiteLLM)</h3>
                <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
                  <p className="text-[13px] text-on-surface-variant">
                    Konteks lengkap dilempar ke LLM dengan instruksi JSON. LLM mengembalikan Itinerary dinamis berbasis data terkini.
                  </p>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* SECURITY & QA */}
        {(activeTab === "overview" || activeTab === "security") && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-center gap-3 mt-8">
              <ShieldCheck className="text-emerald-500 w-6 h-6" />
              <h2 className="text-[22px] font-bold text-on-surface">Standar Kualitas & Keamanan</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[14px]">Zero Hardcoded Secrets</h3>
                </div>
                <p className="text-[12px] text-on-surface-variant">Semua API Key dan Password terisolasi dengan aman di Environment Variables.</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[14px]">Strict Validation</h3>
                </div>
                <p className="text-[12px] text-on-surface-variant">Pydantic di backend dan TypeScript di frontend menjamin ketelitian tipe end-to-end.</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[14px]">Security Middleware</h3>
                </div>
                <p className="text-[12px] text-on-surface-variant">Dilengkapi CORS spesifik, SecurityHeaders, dan HTML Sanitization (mencegah XSS).</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FastForward className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[14px]">Optimasi N+1 DB</h3>
                </div>
                <p className="text-[12px] text-on-surface-variant">ORM menggunakan `selectinload` untuk menghindari iterasi SQL berulang saat load data relasi.</p>
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
