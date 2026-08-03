"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearchDestinations, useCategories, useProfile, useFavoriteIds, useToggleFavorite } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { destImage } from "@/lib/utils";
import { Star, MapPin, Sparkles, Heart, Compass } from "lucide-react";
import { GridSkeleton, Loading } from "@/components/ui";

const cardImg = (item: any) => destImage(item.images, item.name);

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToast = useUIStore(s => s.addToast);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [budget, setBudget] = useState("");
  const [rating, setRating] = useState("");
  const [showAllRecos, setShowAllRecos] = useState(false);

  const { data: user } = useProfile();
  const favIds = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const { data: cats } = useCategories();
  // Trending cards must come from real destinations so each item has an ID
  // and can open its detail page. Do not use name-only placeholders here.
  const { data: trendingData, isLoading: trendingLoading } = useSearchDestinations("", { sort: "popular", size: "4" });
  // Resolve category slug/name (from chips/select) → category_id the backend expects.
  const resolvedCat = (cats || []).find(
    c => c.slug.toLowerCase() === category.toLowerCase() || c.name.toLowerCase() === category.toLowerCase()
  );

  const filters: Record<string, string> = {};
  if (resolvedCat) filters.category_id = String(resolvedCat.id);
  if (budget) filters.price_level = budget;
  if (rating) filters.rating_min = rating;

  const { data, isLoading } = useSearchDestinations(q, filters);
  const results = data?.items || [];
  const trending = trendingData?.items || [];

  // Recommendations: live results first, then real trending destinations.
  // Never fall back to static AI_RECOS (no images / foreign places).
  const hasResults = results.length > 0;
  const recoList = hasResults
    ? (showAllRecos ? results.slice(0, 9) : results.slice(0, 3))
    : (showAllRecos ? trending : trending.slice(0, 3));

  const onLike = (id: string | undefined) => {
    if (!id) return;
    if (!user) return router.push("/auth/login");
    toggleFav.mutate(id);
  };

  return (
    <div className="pt-16 bg-background text-on-background min-h-screen">
      {/* ═══════ HERO ═══════ */}
      <section className="relative rounded-none md:rounded-[2rem] overflow-hidden h-[500px] flex items-center justify-center text-center px-4 group mx-0 md:mx-4 md:mt-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10" />
          <div className="w-full h-full bg-gradient-to-br from-primary via-primary-container to-secondary" />
        </div>
        <div className="relative z-20 max-w-2xl text-white">
          <h1 className="text-[36px] font-bold mb-4 drop-shadow-lg">Temukan Destinasi Impian</h1>
          <p className="text-[16px] text-white/90 mb-6 drop-shadow-md">Biarkan AI kami membantu Anda merancang perjalanan paling berkesan di seluruh penjuru dunia.</p>
          <div className="bg-white p-2 rounded-full shadow-2xl flex items-center gap-2 mb-4">
            <Sparkles className="text-primary ml-4 w-5 h-5 flex-shrink-0" />
            <input
              type="text"
              placeholder="Mau kemana hari ini? Misal: Pantai tersembunyi di Bali"
              className="flex-1 border-none focus:ring-0 text-on-surface caret-primary text-[16px] bg-transparent outline-none placeholder:text-on-surface-variant"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && q && router.push(`/search?q=${encodeURIComponent(q)}`)}
            />
            <button onClick={() => q && router.push(`/search?q=${encodeURIComponent(q)}`)} className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary-container transition-all active:scale-95">
              Cari
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["Pantai", "Candi", "Gunung", "Kuliner", "Budaya", "Alam"].map((chip) => {
              const slug = chip.toLowerCase();
              const on = category.toLowerCase() === slug;
              return (
                <button
                  key={chip}
                  onClick={() => setCategory(on ? "" : slug)}
                  className={`px-4 py-1 rounded-full border text-[12px] transition-all ${on ? "bg-white text-primary border-white" : "bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-primary"}`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 pb-10">
        {/* ═══════ FILTER BAR ═══════ */}
        <section className="mt-8 flex items-center justify-between border-b border-outline-variant pb-4 gap-4">
          <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-2 font-bold text-primary whitespace-nowrap text-[14px]">Filter Destinasi</div>
            <div className="h-6 w-px bg-outline-variant" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border-none bg-surface-container rounded-lg text-[14px] text-on-surface outline-none px-3 py-2 cursor-pointer">
              <option value="">Kategori: Semua</option>
              {(cats || []).map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className="border-none bg-surface-container rounded-lg text-[14px] text-on-surface outline-none px-3 py-2 cursor-pointer">
              <option value="">Budget: Semua</option>
              <option value="budget">Ekonomis</option>
              <option value="mid">Menengah</option>
              <option value="luxury">Mewah</option>
            </select>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className="border-none bg-surface-container rounded-lg text-[14px] text-on-surface outline-none px-3 py-2 cursor-pointer">
              <option value="">Rating: Semua</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </select>
          </div>
          <div className="hidden md:block text-[12px] text-outline whitespace-nowrap">
            Menampilkan {results.length || 0} destinasi
          </div>
        </section>

        {/* ═══════ AI RECOMMENDATIONS ═══════ */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white fill-current" />
              </div>
              <div>
                <h2 className="text-[28px] font-bold text-secondary">Rekomendasi Cerdas Poca AI</h2>
                <p className="text-[12px] text-on-surface-variant">Berdasarkan riwayat perjalanan dan preferensi Anda</p>
              </div>
            </div>
            <button onClick={() => setShowAllRecos(s => !s)} className="text-secondary font-bold text-[14px] hover:underline whitespace-nowrap">
              {showAllRecos ? "Tampilkan Sedikit" : "Lihat Semua Rekomendasi"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recoList.map((item: any, i: number) => (
              <div
                key={item.id || i}
                onClick={() => item.id && router.push(`/destination/${item.id}`)}
                className="rounded-2xl overflow-hidden bg-surface-container-lowest p-2 group cursor-pointer transition-transform hover:-translate-y-1"
                style={{ boxShadow: "0 0 20px rgba(124, 58, 237, 0.15)", border: "1px solid rgba(124, 58, 237, 0.2)" }}
              >
                <div className="relative rounded-xl overflow-hidden h-64">
                  <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={cardImg(item)} alt={item.name} />
                  <div className="absolute top-3 right-3 bg-secondary text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Generated by Poca</div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[12px]">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    {item.rating_avg ?? item.rating} ({item.reviews ?? "—"})
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[20px] font-semibold">{item.name}</h3>
                    <span className="text-secondary font-bold">{item.price || "—"}{item.price && <span className="text-outline text-xs font-normal">/org</span>}</span>
                  </div>
                  <p className="text-[14px] text-on-surface-variant line-clamp-2">{item.desc || item.description || "Rekomendasi pilihan Poca AI untukmu."}</p>
                  <div className="mt-3 flex gap-1">
                    {(item.tags || (item.category?.name ? [item.category.name] : [])).map((t: string) => (
                      <span key={t} className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded text-[10px] font-bold uppercase">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ TRENDING DESTINATIONS ═══════ */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[28px] font-bold text-on-background">Trending Destinations</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trendingLoading && (
              <div className="col-span-full py-8 text-center text-sm text-on-surface-variant">Memuat destinasi trending...</div>
            )}
            {!trendingLoading && trending.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-on-surface-variant">Belum ada destinasi trending.</div>
            )}
            {trending.map((item: any) => (
              <div
                key={item.id}
                onClick={() => router.push(`/destination/${item.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/destination/${item.id}`); }}
                className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden group hover:shadow-md transition-all cursor-pointer"
              >
                <div className="h-48 relative overflow-hidden">
                  <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={cardImg(item)} alt={item.name} />
                  <button
                    onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${favIds.has(item.id) ? "bg-red-500 text-white" : "bg-white/30 text-white hover:bg-white hover:text-red-500"}`}
                  >
                    <Heart className={`w-5 h-5 ${favIds.has(item.id) ? "fill-current" : ""}`} />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1 text-tertiary font-bold text-[10px] uppercase mb-1">Trending</div>
                  <h4 className="text-[16px] font-bold mb-1">{item.name}</h4>
                  <div className="flex items-center gap-1 text-[12px] text-on-surface-variant">
                    <MapPin className="w-4 h-4" />
                    {item.location || `${item.city || ""}${item.city ? ", " : ""}${item.country || ""}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ CTA SECTION ═══════ */}
        <section className="mt-10 bg-primary rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <Sparkles className="w-full h-full" />
          </div>
          <div className="flex-1 relative z-10">
            <h2 className="text-[36px] font-bold text-white mb-4">Siap untuk petualangan berikutnya?</h2>
            <p className="text-[16px] text-white/80 mb-6">Dapatkan rencana perjalanan (itinerary) yang dibuat khusus oleh Poca AI hanya untuk Anda. Gratis dan personal!</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => router.push("/chat")} className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-surface-container transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95">
                <Sparkles className="w-5 h-5" />
                Coba AI Planner Sekarang
              </button>
              <button
                onClick={() => addToast(user ? "Berhasil berlangganan info diskon!" : "Masuk untuk berlangganan.", user ? "success" : "info")}
                className="px-8 py-4 bg-primary-container border border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Langganan Info Diskon
              </button>
            </div>
          </div>
          <div className="w-full md:w-80 h-64 rounded-2xl overflow-hidden relative z-10 shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500">
            <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
              <Compass className="w-20 h-20 text-white/30" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-16 bg-background min-h-screen"><div className="max-w-[1280px] mx-auto px-4 py-8"><Loading variant="search" /></div></div>}>
      <SearchContent />
    </Suspense>
  );
}
