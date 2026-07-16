"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import nextDynamic from "next/dynamic";
import { useMapMarkers, useSearchDestinations, useCategories } from "@/lib/queries";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MapPin, X, Navigation, ChevronRight, SlidersHorizontal, Check } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import type { Destination } from "@/types";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-2.5, 118.0];

export default function MapPage() {
  const router = useRouter();
  const [bounds, setBounds] = useState<[number, number] | null>(null);
  const [ne, setNe] = useState<[number, number] | null>(null);
  const [q, setQ] = useState("");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  // Ask for location on mount — center map on the user when granted
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => { /* denied: fall back to default Indonesia center */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const { data: cats } = useCategories();
  const markers = useMapMarkers(
    bounds ? bounds : [-10, 114],
    ne ? ne : [-7, 116],
    activeCats.length ? activeCats.join(",") : undefined
  );
  const { data: searchResults } = useSearchDestinations(q);

  const mapMarkers = markers.data?.features?.map((f: any) => ({
    id: f.properties.id,
    name: f.properties.name,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    rating_avg: f.properties.rating_avg,
    price_level: f.properties.price_level,
    images: f.properties.images,
    category_name: f.properties.category_name,
  })) || [];

  const results = useMemo(() => searchResults?.items || [], [searchResults]);
  const TOP = 5;
  const topResults = results.slice(0, TOP);

  const focusDest = (d: Destination) => {
    setFocus([d.latitude, d.longitude]);
    setShowMore(false);
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      {/* Search + category dropdown overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] max-w-md mx-auto space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari lokasi… (contoh: Sanur, Bali)"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category dropdown — filters markers directly, combinable with search */}
          <div className="relative">
            <button
              onClick={() => setCatOpen((o) => !o)}
              className={`h-full px-3 rounded-xl shadow-lg border flex items-center gap-1.5 text-sm font-medium transition-colors ${
                activeCats.length > 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-100"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Kategori</span>
              {activeCats.length > 0 && (
                <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center">
                  {activeCats.length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {catOpen && cats && (
                <>
                  <button
                    className="fixed inset-0 z-[1000]"
                    onClick={() => setCatOpen(false)}
                    aria-label="Tutup filter"
                  />
                  <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[1001]"
                >
                  <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50 flex items-center justify-between">
                    <span>Filter kategori</span>
                    {activeCats.length > 0 && (
                      <button onClick={() => setActiveCats([])} className="text-blue-600 hover:underline">Reset</button>
                    )}
                  </div>
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {cats.map((c) => {
                      const on = activeCats.includes(String(c.id));
                      return (
                        <li key={c.id}>
                          <button
                            onClick={() =>
                              setActiveCats((prev) =>
                                on ? prev.filter((x) => x !== String(c.id)) : [...prev, String(c.id)]
                              )
                            }
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 ${on ? "text-blue-600" : "text-gray-700"}`}
                          >
                            <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${on ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                              {on && <Check className="w-3 h-3 text-white" />}
                            </span>
                            <CategoryIcon name={c.icon} className="w-4 h-4" />
                            {c.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search results panel — preview, max 5, not a filter */}
        <AnimatePresence>
          {q && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="px-3 py-2 text-[11px] text-gray-500 border-b bg-gray-50">
                {results.length} lokasi cocok untuk “{q}” — diurutkan rating tertinggi
              </div>
              <ul className="max-h-[42vh] overflow-y-auto divide-y divide-gray-50">
                {topResults.map((d) => (
                  <ResultRow key={d.id} d={d} onFocus={() => focusDest(d)} onOpen={() => router.push(`/destination/${d.id}`)} />
                ))}
              </ul>
              {results.length > TOP && (
                <button
                  onClick={() => setShowMore(true)}
                  className="w-full py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                >
                  Tampilkan {results.length - TOP} lokasi lainnya
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              )}
            </motion.div>
          )}
          {q && results.length === 0 && searchResults && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 text-sm text-gray-500"
            >
              Tidak ada lokasi untuk “{q}”. Coba kata lain seperti Bali atau Bromo.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Re-center button */}
      {userLoc && (
        <button
          onClick={() => setFocus(userLoc)}
          title="Kembali ke lokasiku"
          className="absolute right-3 bottom-24 z-[1000] w-10 h-10 rounded-full bg-white shadow-lg border flex items-center justify-center text-blue-600 hover:bg-blue-50"
        >
          <Navigation className="w-5 h-5" />
        </button>
      )}

      <MapView
        center={userLoc || DEFAULT_CENTER}
        zoom={userLoc ? 12 : 5}
        markers={mapMarkers}
        focus={focus}
        onMarkerClick={(id) => router.push(`/destination/${id}`)}
        onBoundsChange={(sw, ne) => { setBounds(sw); setNe(ne); }}
        className="h-full w-full"
      />

      {/* Show more — full detail panel */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute top-0 right-0 bottom-0 z-[1100] w-full sm:w-[420px] bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Hasil “{q}”</h3>
                <p className="text-xs text-gray-500">{results.length} lokasi</p>
              </div>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {results.map((d) => (
                <ResultCard key={d.id} d={d} onFocus={() => focusDest(d)} onOpen={() => router.push(`/destination/${d.id}`)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultRow({ d, onFocus, onOpen }: { d: Destination; onFocus: () => void; onOpen: () => void }) {
  const img = d.images?.[0] && !d.images[0].includes("source.unsplash") ? d.images[0] : null;
  return (
    <li className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
      <button onClick={onFocus} className="flex items-center gap-3 flex-1 text-left">
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {img ? (
            <img src={img} alt={d.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <CategoryIcon name={d.category?.icon} className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 truncate">{d.name}</p>
          <p className="text-[11px] text-gray-500 flex items-center truncate">
            <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0" />
            {d.city ? `${d.city}, ` : ""}{d.country}
          </p>
        </div>
        <div className="flex items-center text-[11px] text-yellow-600 font-semibold flex-shrink-0">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-0.5" />
          {d.rating_avg?.toFixed(1)}
        </div>
      </button>
      <button onClick={onOpen} className="text-[11px] text-blue-600 font-medium flex-shrink-0 hover:underline">Detail</button>
    </li>
  );
}

function ResultCard({ d, onFocus, onOpen }: { d: Destination; onFocus: () => void; onOpen: () => void }) {
  const img = d.images?.[0] && !d.images[0].includes("source.unsplash") ? d.images[0] : null;
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="relative h-32 bg-gray-100">
        {img ? (
          <img src={img} alt={d.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
            <CategoryIcon name={d.category?.icon} className="w-10 h-10 text-white" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur rounded-md text-[10px] font-medium capitalize">
          {d.price_level === "budget" ? "💰 Budget" : d.price_level === "luxury" ? "💎 Luxury" : "💳 Mid"}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{d.name}</p>
            <p className="text-[11px] text-gray-500 flex items-center">
              <MapPin className="w-3 h-3 mr-0.5" />
              {d.city ? `${d.city}, ` : ""}{d.country}
            </p>
          </div>
          <div className="flex items-center text-xs text-yellow-600 font-semibold flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 mr-0.5" />
            {d.rating_avg?.toFixed(1)}
            <span className="text-gray-400 ml-1 font-normal">({d.review_count})</span>
          </div>
        </div>
        {d.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{d.description}</p>}
        <div className="flex gap-2 mt-2.5">
          <button onClick={onFocus} className="flex-1 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">
            Lihat di peta
          </button>
          <button onClick={onOpen} className="flex-1 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Buka detail
          </button>
        </div>
      </div>
    </div>
  );
}
