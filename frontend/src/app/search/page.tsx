"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSearchDestinations, useCategories } from "@/lib/queries";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import { DestinationCard } from "@/components/search/DestinationCard";
import { GridSkeleton, EmptyState, CategoryIcon } from "@/components/ui";
import { staggerContainer } from "@/lib/animations";

const PRICES = [
  { key: "", label: "Semua" },
  { key: "budget", label: "💰 Budget" },
  { key: "mid", label: "💳 Mid" },
  { key: "luxury", label: "💎 Luxury" },
];
const RATINGS = [
  { key: "", label: "Semua" },
  { key: "4", label: "4.0+" },
  { key: "4.5", label: "4.5+" },
];
const SORTS = [
  { key: "rating", label: "Rating" },
  { key: "popular", label: "Terpopuler" },
  { key: "name", label: "A–Z" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [price, setPrice] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [sort, setSort] = useState("rating");
  const [debounced, setDebounced] = useState({ q, location });

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q, location }), 300);
    return () => clearTimeout(t);
  }, [q, location]);

  const filters: Record<string, string> = {};
  if (category) filters.category_id = category;
  if (price) filters.price_level = price;
  if (ratingMin) filters.rating_min = ratingMin;
  if (debounced.location.trim()) filters.city = debounced.location.trim();
  if (sort) filters.sort = sort;

  const { data, isLoading } = useSearchDestinations(debounced.q, filters);
  const { data: cats } = useCategories();

  const reset = () => { setQ(""); setLocation(""); setCategory(""); setPrice(""); setRatingMin(""); setSort("rating"); };
  const hasFilter = q || location || category || price || ratingMin;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Jelajahi Destinasi</h1>
        <p className="text-sm text-gray-500">Temukan tempat liburan impianmu di seluruh Indonesia</p>
      </motion.div>

      {/* Search + location */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama destinasi… (Borobudur, Bromo)"
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Lokasi… (Bali, Yogyakarta, Bandung)"
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      {/* Category chips (icons, no double label) */}
      {cats && cats.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setCategory("")}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-medium flex items-center ${
              !category ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:border-blue-300"
            }`}
          >
            Semua
          </button>
          {cats.map((c) => {
            const on = category === String(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setCategory(on ? "" : String(c.id))}
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-medium flex items-center ${
                  on ? "bg-blue-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:border-blue-300"
                }`}
              >
                <CategoryIcon name={c.icon} className="w-3.5 h-3.5 mr-1" />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Price / Rating / Sort */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Seg label="Harga" options={PRICES} value={price} onChange={setPrice} />
        <Seg label="Rating" options={RATINGS} value={ratingMin} onChange={setRatingMin} />
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400">Urutkan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Results count + reset */}
      {data && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {data.total} destinasi ditemukan
            {debounced.q && <span> untuk “<span className="font-medium text-gray-700">{debounced.q}</span>”</span>}
          </p>
          {hasFilter && (
            <button onClick={reset} className="text-xs text-gray-500 hover:text-red-500 flex items-center">
              <X className="w-3 h-3 mr-1" /> Reset filter
            </button>
          )}
        </div>
      )}

      {isLoading && <GridSkeleton count={6} />}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="Destinasi tidak ditemukan"
          description="Coba kata kunci lain atau ubah filter"
          action={{ label: "Reset pencarian", onClick: reset }}
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {data.items.map((dest) => (
            <DestinationCard key={dest.id} destination={dest} onClick={() => router.push(`/destination/${dest.id}`)} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Seg({
  label, options, value, onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              value === o.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<GridSkeleton count={3} />}>
      <SearchContent />
    </Suspense>
  );
}
