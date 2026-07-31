"use client";

import { useRouter } from "next/navigation";
import { Star, MapPin, Heart, ChevronLeft, ChevronRight, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useSearchDestinations, useProfile, useFavoriteIds, useToggleFavorite } from "@/lib/queries";
import { destImage } from "@/lib/utils";
import type { Destination } from "@/types";

const HERO_SLIDES = [
  { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA06FlgT9AkfHd2LSz0WTSnf2KXdUrBJoBzTBN5HhERWbrTbFXsNwgUv-TrpSkvvJDzBG8d72RuQiWBow-avIMbOqZtXZ3YxqVFHOpj0ulAHNNSRjZWya2QtH2_I58hFAKLwwbXSvlZHarlIAUuye7Q-qHOXBSSl6b7FqGFgph4-o1aZcoj60QDrybMo8QomxNh3VVLVjZhJrI71nF5fP3hyTTzisb3dkWF11YSYhunFMJutJvrZyi", badge: "Trending", rating: "4.9 (2.4k reviews)", title: "Candi Borobudur, Magelang", desc: "Warisan dunia UNESCO yang megah." },
  { src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcoLVNXwMErlwUAQVTKnjNBkdqJzBLhKyT7jTSTw4Y0DCvulcTY6eJKxUC_BMLk6fgJRXOxAsLJ6uggKYTQk-bykaonaARkCzy_2d0TTezEML27pbQ1kzgdUbolOKYVpF0_2g7sEp2F9rWRN71PQ47I1GHIOlpkR8Ahsh6KRd2xh_DB04OXfXgCa5mwe1KG3xbYfpkuRGXk4bEKOTOC5HHqG0Ekq-xG8UJdXP9nPlvrq6npyNPF7ht", badge: "RECOMMENDED", rating: "4.8 (1.2k reviews)", title: "Uluwatu, Bali", desc: "Pura megah di atas tebing dengan pemandangan sunset terbaik." },
];

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);
  const slide = HERO_SLIDES[heroIdx];

  const { data: user } = useProfile();
  const favIds = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const { data, isLoading } = useSearchDestinations("", {});

  // Live data first; the curated list is only a fallback before hydration / on empty.
  const dests: Destination[] = data?.items?.length ? data.items.slice(0, 8) : [];

  const onLike = (id: string) => {
    if (!user) return router.push("/auth/login");
    toggleFav.mutate(id);
  };

  return (
    <div className="pt-20 space-y-10">
      {/* HERO */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-primary-container/10 text-primary-container rounded-full text-[11px] font-bold uppercase tracking-wider inline-block">AI-POWERED TRAVEL</span>
              <h1 className="text-[36px] lg:text-[48px] font-bold text-on-background leading-tight">Jelajahi Indonesia dengan <span className="text-primary">AI Companion</span> Pintar</h1>
              <p className="text-[16px] text-on-surface max-w-lg">Rencanakan perjalanan impian Anda di Indonesia dengan bantuan asisten cerdas.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center bg-white border border-outline-variant rounded-2xl p-2 shadow-sm">
                <input type="text" placeholder="Cari destinasi, kuliner, atau aktivitas..." className="w-full border-none bg-transparent px-4 py-2 text-[14px] text-on-surface outline-none placeholder:text-outline" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && q && router.push(`/search?q=${encodeURIComponent(q)}`)} />
                <button onClick={() => q && router.push(`/search?q=${encodeURIComponent(q)}`)} className="bg-primary-container text-on-primary-container px-6 py-3 rounded-xl text-[14px] font-bold active:scale-[0.98]">Cari</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Pantai","Candi","Gunung","Kuliner"].map(label => (
                  <button key={label} onClick={() => router.push(`/search?category=${label.toLowerCase()}`)} className="px-4 py-2 bg-white border border-outline-variant rounded-full text-[12px] text-on-surface hover:border-primary hover:text-primary transition-all">{label}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative group h-[480px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-2xl -rotate-2" />
            <div className="relative h-full w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-outline-variant/30">
              <img className="w-full h-full object-cover transition-opacity duration-500" src={slide.src} alt={slide.title} />
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase">{slide.badge}</span>
                  <div className="flex items-center text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /><span className="text-[12px] text-white ml-1">{slide.rating}</span></div>
                </div>
                <h3 className="text-[20px] font-semibold text-white mb-1">{slide.title}</h3>
                <p className="text-[12px] text-white/80 line-clamp-2">{slide.desc}</p>
              </div>
              {/* prev/next — always visible on touch, hover-reveal on desktop */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full px-4 flex justify-between opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => setHeroIdx(i => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 active:scale-90 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 active:scale-90 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DESTINASI POPULER */}
      <section className="max-w-[1280px] mx-auto px-6 space-y-6">
        <div className="flex items-end justify-between">
          <div><h2 className="text-[20px] font-semibold text-on-surface">Destinasi Populer</h2><p className="text-[14px] text-on-surface">Tempat paling banyak dikunjungi.</p></div>
          <button onClick={() => router.push("/search")} className="text-primary text-[14px] font-bold hover:underline">Lihat Semua</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-outline-variant/30 overflow-hidden">
              <div className="h-48 skeleton" />
              <div className="p-4 space-y-2"><div className="h-4 w-2/3 skeleton" /><div className="h-3 w-1/2 skeleton" /></div>
            </div>
          ))}
          {dests.map(d => {
            const liked = favIds.has(d.id);
            return (
              <div key={d.id} onClick={() => router.push(`/destination/${d.id}`)} className="group bg-white rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={destImage(d.images, d.name)} alt={d.name} />
                  <button onClick={e => { e.stopPropagation(); onLike(d.id); }} className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${liked ? "bg-red-500 text-white" : "bg-white/50 text-on-surface hover:bg-white"}`}><Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} /></button>
                  {d.rating_avg >= 4.9 && <div className="absolute bottom-3 left-3 px-2 py-1 bg-primary/90 text-white text-[10px] font-bold rounded">RECOMMENDED</div>}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-[14px] font-bold text-on-surface">{d.name}</h4>
                    <div className="flex items-center text-[14px] font-bold"><Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />{d.rating_avg}</div>
                  </div>
                  <p className="text-[12px] text-on-surface flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{d.city ? `${d.city}, ` : ""}{d.country}</p>
                  <div className="flex gap-2 pt-1">
                    {d.category?.name && <span className="px-2 py-1 bg-surface-container text-on-surface text-[10px] rounded">{d.category.name}</span>}
                    {(d.tags || []).slice(0, 2).map(t => <span key={t} className="px-2 py-1 bg-surface-container text-on-surface text-[10px] rounded">{t}</span>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI TEASER */}
      <section className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="ai-glow rounded-2xl p-8 bg-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
          <div className="md:w-1/2 space-y-4 relative z-10">
            <div className="flex items-center gap-2 text-primary font-bold"><Sparkles className="w-5 h-5" /><span className="text-[11px] font-bold uppercase tracking-wider">AI TRIP PLANNER</span></div>
            <h2 className="text-[28px] font-bold text-on-surface">Rencanakan Perjalanan dalam <span className="text-secondary">30 Detik</span></h2>
            <p className="text-[16px] text-on-surface">Beri tahu AI kami apa yang Anda sukai, dan kami akan menyusun itinerary lengkap.</p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button onClick={() => router.push("/chat")} className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl text-[14px] font-bold hover:shadow-lg active:scale-95">Mulai Planning Sekarang</button>
              <button onClick={() => router.push("/chat?example=1")} className="bg-white border border-outline-variant text-on-surface px-8 py-4 rounded-xl text-[14px] font-bold hover:bg-surface-container-low active:scale-95">Lihat Contoh Plan</button>
            </div>
          </div>
          <div className="md:w-1/2 relative z-10">
            <div className="bg-surface-container-low/50 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-4 shadow-xl max-w-sm mx-auto md:rotate-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white"><MessageCircle className="w-5 h-5" /></div>
                <div><h5 className="text-[14px] font-bold">Poca AI</h5><p className="text-[10px] text-on-surface-variant">Typing suggestions...</p></div>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-xl rounded-tl-none text-[12px] shadow-sm border border-outline-variant/20 text-on-surface">Berdasarkan profil Anda, saya merekomendasikan 3 hari di Ubud untuk yoga.</div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl rounded-tr-none text-[12px] ml-8">Kedengarannya bagus! Bisakah kamu carikan hotel?</div>
                <div className="p-3 bg-white rounded-xl rounded-tl-none text-[12px] shadow-sm border border-outline-variant/20 text-on-surface">Tentu! Saya telah menemukan 3 eco-resort dengan rating 4.5+.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
