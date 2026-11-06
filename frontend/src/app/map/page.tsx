"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useMapMarkers, useSearchDestinations } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { Star, MapPin, X, Navigation, Search, Compass, Sparkles, Waves, Landmark, Mountain, Utensils, Palette } from "lucide-react";
import type { Destination } from "@/types";
import { destImage } from "@/lib/utils";

const MapView = nextDynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-surface-container-low p-4 text-center" role="status" aria-live="polite">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-on-surface">Menyiapkan peta</p>
      <p className="mt-1 text-xs text-on-surface-variant">Memuat peta dan lokasi di sekitarmu.</p>
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [-2.5, 118.0];

interface SelectedMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating_avg?: number;
  price_level?: string;
  images?: string[];
  category_name?: string;
  city?: string;
  country?: string;
  image?: string;
  description?: string;
}

const CATEGORY_FILTERS = [
  { key: "pantai", label: "Pantai", Icon: Waves },
  { key: "candi", label: "Candi", Icon: Landmark },
  { key: "gunung", label: "Gunung", Icon: Mountain },
  { key: "kuliner", label: "Kuliner", Icon: Utensils },
  { key: "budaya", label: "Budaya", Icon: Palette },
];

export default function MapPage() {
  const router = useRouter();
  const [bounds, setBounds] = useState<[number, number] | null>(null);
  const [ne, setNe] = useState<[number, number] | null>(null);
  const [q, setQ] = useState("");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [activeCat, setActiveCat] = useState<string>("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);
  const [showPopover, setShowPopover] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const markers = useMapMarkers(
    bounds || [-10, 114],
    ne || [-7, 116],
    activeCat || undefined
  );
  const searchQuery = useSearchDestinations(q);
  const { data: searchResults } = searchQuery;

  const results = useMemo(() => searchResults?.items || [], [searchResults]);
  const recommended = results.slice(0, 3);
  const hiddenGems = results.slice(3, 6);

  const boundMarkers = markers.data?.features?.map((f) => ({
    id: f.properties.id as string,
    name: f.properties.name as string,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    rating_avg: f.properties.rating_avg as number,
    price_level: f.properties.price_level as string,
    images: f.properties.images as string[],
    category_name: f.properties.category_name as string,
    city: f.properties.city as string,
    country: f.properties.country as string,
  })) || [];

  // When searching, show matches as markers (and in the list) instead of bounding-box markers.
  const mapMarkers = q.trim() && results.length
    ? results.map((d) => ({
        id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude,
        rating_avg: d.rating_avg, price_level: d.price_level, images: d.images,
        category_name: d.category?.name, city: d.city, country: d.country,
      }))
    : boundMarkers;
  const resultCount = q.trim()
    ? searchResults?.total ?? results.length
    : markers.data?.features.length ?? 0;

  const focusDest = (d: Destination) => {
    setFocus([d.latitude, d.longitude]);
    setSelectedMarker({ id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude, rating_avg: d.rating_avg, category_name: d.category?.name, city: d.city, country: d.country, image: destImage(d.images, d.name), description: d.description, price_level: d.price_level });
    setShowPopover(d.id);
  };

  const handleMarkerClick = (m: SelectedMarker) => {
    setSelectedMarker({ ...m, image: destImage(m.images, m.name) });
    setShowPopover(m.id);
  };

  return (
    <div className="flex h-[calc(100dvh-var(--bottom-nav-h)-var(--safe-b)-0.5rem)] min-h-0 flex-col overflow-hidden md:h-dvh">
      {/* ═══════ MAIN CONTENT: SIDEBAR + MAP ═══════ */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-16 md:flex-row">
        {/* Destination search and results */}
        <aside className="order-2 flex h-[44%] min-h-0 w-full shrink-0 flex-col border-t border-outline-variant/20 bg-surface shadow-[0_-8px_24px_rgba(19,27,46,0.06)] md:order-1 md:h-auto md:w-[40%] md:max-w-[420px] md:border-r md:border-t-0 md:shadow-none">
          {/* Search & Filter Header */}
          <div className="space-y-3 bg-surface-container-lowest px-4 py-3 shadow-sm md:space-y-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[20px] font-bold leading-tight text-on-surface md:text-[28px]">Jelajahi peta</h1>
              <span className="inline-flex shrink-0 items-center rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary md:text-[12px]">
                {searchQuery.isLoading && !searchResults ? (
                  <span className="h-3 w-12 animate-pulse rounded bg-primary/20" aria-label="Memuat jumlah hasil" />
                ) : `${resultCount} tempat`}
              </span>
            </div>
            {/* Search — filters markers + list in-map (no redirect) */}
            <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/30">
              <Search className="w-4 h-4 text-outline mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari destinasi di peta..."
                className="bg-transparent border-none focus:ring-0 text-[14px] flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-on-surface placeholder:text-outline"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) focusDest(results[0]); }}
              />
              {q && <button onClick={() => setQ("")} className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Hapus pencarian"><X className="h-4 w-4" /></button>}
            </div>
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5 md:grid md:grid-cols-3 md:overflow-visible" aria-label="Filter kategori">
              {CATEGORY_FILTERS.map(({ key, label, Icon }) => {
                const on = activeCat === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCat(on ? "" : key)}
                    className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 whitespace-nowrap text-[12px] font-semibold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:h-10 md:w-full md:px-2 md:text-[13px] ${
                      on
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                    aria-pressed={on}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination List */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface-container-low/30 p-4 custom-scrollbar md:space-y-6 md:p-5">
            {/* Recommended Section */}
            {recommended.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Rekomendasi
                </h2>
                {recommended.map((d, i) => (
                  <div
                    key={d.id}
                    onClick={() => focusDest(d)}
                    className="group relative flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-[0.99]"
                  >
                    <div className="h-48 relative overflow-hidden">
                      <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={destImage(d.images, d.name)} alt={`Foto ${d.name}`} />
                      <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm text-on-primary px-2 py-1 rounded-lg flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px] font-bold">{d.rating_avg}</span>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-primary/20 backdrop-blur-md text-white border border-white/30 px-2 py-1 rounded text-[10px] font-bold uppercase">
                          {i === 0 ? "Wajib dikunjungi" : d.price_level === "budget" ? "Hemat" : "Pilihan"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="text-[20px] font-semibold text-on-surface">{d.name}</h3>
                      <p className="text-[14px] text-on-surface-variant line-clamp-2">{d.description || `Rating ${d.rating_avg} dengan ${d.review_count} reviews`}</p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1 text-outline text-[12px]">
                          <MapPin className="w-4 h-4" />
                          <span>{d.city || d.country}</span>
                        </div>
                        <div className="flex items-center gap-1 text-outline text-[12px]">
                          <Compass className="w-4 h-4" />
                          <span>{d.price_level === "budget" ? "Hemat" : d.price_level === "luxury" ? "Premium" : "Menengah"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden Gems Section */}
            {hiddenGems.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-tertiary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  Tersembunyi
                </h2>
                {hiddenGems.slice(0, 2).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => focusDest(d)}
                    className="flex gap-4 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 hover:border-tertiary/30 transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" src={destImage(d.images, d.name)} alt={`Foto ${d.name}`} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="text-[16px] font-bold text-on-surface truncate">{d.name}</h4>
                      <p className="text-[12px] text-on-surface-variant mb-2 line-clamp-1">{d.description || `${d.city}, ${d.country}`}</p>
                      <div className="flex items-center gap-2">
                        <span className="bg-tertiary/10 text-tertiary px-2 py-[2px] rounded text-[10px] font-bold uppercase">Permata lokal</span>
                        <span className="text-[10px] text-outline">{d.city}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.isLoading && !searchResults && (
              <div className="space-y-3" aria-label="Memuat destinasi" aria-busy="true">
                {[0, 1].map((item) => (
                  <div key={item} className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
                    <div className="h-20 animate-pulse bg-surface-container-high md:h-36" />
                    <div className="space-y-2 p-3">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
                      <div className="h-3 w-full animate-pulse rounded bg-surface-container-high" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.isError && (
              <div className="flex flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-6 text-center" role="alert">
                <MapPin className="mb-2 h-7 w-7 text-outline" />
                <p className="text-sm font-semibold text-on-surface">Destinasi belum bisa dimuat</p>
                <p className="mt-1 text-xs text-on-surface-variant">Periksa koneksi, lalu coba lagi.</p>
                <button onClick={() => { void searchQuery.refetch(); }} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Coba lagi</button>
              </div>
            )}

            {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest/80 px-4 py-5 text-center md:py-8">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <Compass className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-on-surface">{q.trim() ? "Belum ada hasil" : "Belum ada destinasi di area ini"}</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-on-surface-variant">
                  {q.trim() ? "Coba kata kunci atau kategori lain." : "Cari nama tempat atau pilih kategori untuk mulai menjelajah."}
                </p>
                {q.trim() && <button onClick={() => setQ("")} className="mt-3 text-xs font-semibold text-primary">Hapus pencarian</button>}
              </div>
            )}
          </div>
        </aside>

        {/* Map stays prominent on mobile; results sit in a separate, scrollable sheet. */}
        <section className="relative order-1 h-[56%] min-h-0 w-full shrink-0 bg-surface-container-highest md:order-2 md:h-auto md:flex-1">
          <MapView
            center={userLoc || DEFAULT_CENTER}
            zoom={userLoc ? 12 : 5}
            markers={mapMarkers}
            focus={focus}
            onMarkerClick={(m) => handleMarkerClick(m)}
            onBoundsChange={(sw, ne) => { setBounds(sw); setNe(ne); }}
            className="h-full w-full"
          />


          {/* AI Insight Floating Badge */}
          {resultCount > 0 && <div className="absolute bottom-5 left-1/2 z-20 hidden w-full max-w-[600px] -translate-x-1/2 px-4 md:block">
            <div className="bg-surface-container-lowest/90 backdrop-blur-md border border-primary/20 rounded-full px-5 py-3 shadow-xl flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-primary/10 px-2 text-[10px] font-bold text-primary">{resultCount}</div>
              </div>
              <div className="h-6 w-px bg-outline-variant/30" />
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-[12px] font-semibold text-on-surface truncate">
                  {resultCount} destinasi tersedia di area peta ini.
                </p>
              </div>
            </div>
          </div>}

          {/* Popover Detail */}
          {selectedMarker && showPopover && (
            <div className="absolute left-3 right-3 top-20 z-30 mx-auto w-full max-w-[18rem] rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-2xl backdrop-blur-md md:left-[10%] md:right-auto md:top-[15%]">
              <div className="relative h-32 rounded-xl overflow-hidden mb-3">
                <img className="w-full h-full object-cover" src={selectedMarker.image || destImage([], selectedMarker.name)} alt={`Foto ${selectedMarker.name}`} />
                <button onClick={() => setShowPopover(null)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[20px] font-semibold text-on-surface leading-tight">{selectedMarker.name}</h4>
                    <p className="text-[10px] text-outline uppercase font-bold tracking-widest mt-1">
                      {selectedMarker.rating_avg ? `${selectedMarker.rating_avg} Rating` : "Recommended"}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-on-surface-variant line-clamp-2">{selectedMarker.description || `${selectedMarker.city}, ${selectedMarker.country}`}</p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => router.push(`/destination/${selectedMarker.id}`)}
                    className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-[12px] font-bold hover:opacity-90 transition-all"
                  >
                    Lihat Detail
                  </button>
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/30 transition-all hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Buka petunjuk arah">
                    <Navigation className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
