"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useMapMarkers, useSearchDestinations, useCategories } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { Star, MapPin, X, Navigation, Search, Compass, Sparkles, ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import type { Destination } from "@/types";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-2.5, 118.0];

const CATEGORY_FILTERS = [
  { key: "pantai", label: "Beach", icon: "beach_access" },
  { key: "candi", label: "Temple", icon: "temple_buddhist" },
  { key: "gunung", label: "Mountain", icon: "landscape" },
  { key: "kuliner", label: "Food", icon: "restaurant" },
  { key: "budaya", label: "Nightlife", icon: "nightlife" },
];

export default function MapPage() {
  const router = useRouter();
  const [bounds, setBounds] = useState<[number, number] | null>(null);
  const [ne, setNe] = useState<[number, number] | null>(null);
  const [q, setQ] = useState("");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [activeCat, setActiveCat] = useState<string>("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [showPopover, setShowPopover] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const { data: cats } = useCategories();
  const markers = useMapMarkers(
    bounds || [-10, 114],
    ne || [-7, 116],
    activeCat || undefined
  );
  const { data: searchResults } = useSearchDestinations(q);

  const results = useMemo(() => searchResults?.items || [], [searchResults]);
  const recommended = results.slice(0, 3);
  const hiddenGems = results.slice(3, 6);

  const boundMarkers = markers.data?.features?.map((f: any) => ({
    id: f.properties.id,
    name: f.properties.name,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    rating_avg: f.properties.rating_avg,
    price_level: f.properties.price_level,
    images: f.properties.images,
    category_name: f.properties.category_name,
    city: f.properties.city,
    country: f.properties.country,
  })) || [];

  // When searching, show matches as markers (and in the list) instead of bounding-box markers.
  const mapMarkers = q.trim() && results.length
    ? results.map((d) => ({
        id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude,
        rating_avg: d.rating_avg, price_level: d.price_level, images: d.images,
        category_name: d.category?.name, city: d.city, country: d.country,
      }))
    : boundMarkers;

  const focusDest = (d: Destination) => {
    setFocus([d.latitude, d.longitude]);
    setSelectedMarker({ id: d.id, name: d.name, latitude: d.latitude, longitude: d.longitude, rating_avg: d.rating_avg, category_name: d.category?.name, city: d.city, country: d.country, image: d.images?.[0], description: d.description, price_level: d.price_level });
    setShowPopover(d.id);
  };

  const togglePopover = (id: string | null) => {
    setShowPopover(showPopover === id ? null : id);
  };

  const handleMarkerClick = (m: any) => {
    setSelectedMarker(m);
    setShowPopover(m.id);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ═══════ MAIN CONTENT: SIDEBAR + MAP ═══════ */}
      <main className="flex flex-1 overflow-hidden pt-16">
        {/* ═══ LEFT SIDEBAR (40%) ═══ */}
        <aside className="w-[40%] bg-surface flex flex-col border-r border-outline-variant/20 z-10">
          {/* Search & Filter Header */}
          <div className="p-5 space-y-4 shadow-sm bg-surface-container-lowest">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-bold text-on-surface leading-tight">Explore</h1>
              <span className="text-[12px] text-outline">{results.length || mapMarkers.length || "128"} Results Found</span>
            </div>
            {/* Search — filters markers + list in-map (no redirect) */}
            <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/30">
              <Search className="w-4 h-4 text-outline mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari destinasi di peta..."
                className="bg-transparent border-none focus:ring-0 text-[14px] flex-1 outline-none text-on-surface placeholder:text-outline"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) focusDest(results[0]); }}
              />
              {q && <button onClick={() => setQ("")} className="text-outline hover:text-on-surface ml-2"><X className="w-4 h-4" /></button>}
            </div>
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {CATEGORY_FILTERS.map(({ key, label }) => {
                const on = activeCat === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCat(on ? "" : key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap active:scale-95 transition-all text-[14px] font-semibold ${
                      on
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-surface-container-low/30">
            {/* Recommended Section */}
            {recommended.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Recommended For You
                </h2>
                {recommended.map((d, i) => (
                  <div
                    key={d.id}
                    onClick={() => focusDest(d)}
                    className="group relative flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-[0.99]"
                  >
                    <div className="h-48 relative overflow-hidden">
                      {d.images?.[0] && !d.images[0].includes("source.unsplash") ? (
                        <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={d.images[0]} alt={d.name} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                          <CategoryIcon name={d.category?.icon} className="w-12 h-12 text-outline/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm text-on-primary px-2 py-1 rounded-lg flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-[10px] font-bold">{d.rating_avg}</span>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-primary/20 backdrop-blur-md text-white border border-white/30 px-2 py-1 rounded text-[10px] font-bold uppercase">
                          {i === 0 ? "Must Visit" : d.price_level === "budget" ? "Budget" : "Recommended"}
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
                          <span>{d.price_level === "budget" ? "Budget" : d.price_level === "luxury" ? "Luxury" : "Mid"}</span>
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
                  Hidden Gems
                </h2>
                {hiddenGems.slice(0, 2).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => focusDest(d)}
                    className="flex gap-4 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 hover:border-tertiary/30 transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      {d.images?.[0] && !d.images[0].includes("source.unsplash") ? (
                        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" src={d.images[0]} alt={d.name} />
                      ) : (
                        <div className="w-full h-full bg-tertiary/10 flex items-center justify-center">
                          <CategoryIcon name={d.category?.icon} className="w-6 h-6 text-tertiary/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="text-[16px] font-bold text-on-surface truncate">{d.name}</h4>
                      <p className="text-[12px] text-on-surface-variant mb-2 line-clamp-1">{d.description || `${d.city}, ${d.country}`}</p>
                      <div className="flex items-center gap-2">
                        <span className="bg-tertiary/10 text-tertiary px-2 py-[2px] rounded text-[10px] font-bold uppercase">Emerald Badge</span>
                        <span className="text-[10px] text-outline">{d.city}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && !searchResults && (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <Compass className="w-16 h-16 text-outline/30 mb-4" />
                <p className="text-on-surface-variant text-[14px]">Cari destinasi atau pilih kategori</p>
              </div>
            )}
          </div>
        </aside>

        {/* ═══ MAP CANVAS (60%) ═══ */}
        <section className="flex-1 relative bg-surface-container-highest">
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
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 max-w-[600px] w-full px-4">
            <div className="bg-surface-container-lowest/90 backdrop-blur-md border border-primary/20 rounded-full px-5 py-3 shadow-xl flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">+{results.length || 12}</div>
              </div>
              <div className="h-6 w-px bg-outline-variant/30" />
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-[12px] font-semibold text-on-surface truncate">
                  Poca AI merekomendasikan <span className="text-primary">destinasi terdekat</span> dalam jangkauan.
                </p>
              </div>
            </div>
          </div>

          {/* Popover Detail */}
          {selectedMarker && showPopover && (
            <div className="absolute top-[15%] left-[10%] w-72 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl z-30 p-4 border border-primary/20">
              <div className="relative h-32 rounded-xl overflow-hidden mb-3">
                {selectedMarker.image && !selectedMarker.image.includes("source.unsplash") ? (
                  <img className="w-full h-full object-cover" src={selectedMarker.image} alt={selectedMarker.name} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-outline/30" />
                  </div>
                )}
                <button onClick={() => setShowPopover(null)} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-1 text-white transition-all">
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
                  <button className="px-3 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-high transition-all">
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
