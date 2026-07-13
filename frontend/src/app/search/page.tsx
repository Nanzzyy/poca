"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearchDestinations, useCategories } from "@/lib/queries";
import { Search, MapPin, Star, Filter } from "lucide-react";
import { DestinationCard } from "@/components/search/DestinationCard";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useSearchDestinations(debouncedQ, category ? { category_id: category } : undefined);
  const { data: cats } = useCategories();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search destinations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {cats && (
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory("")}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${!category ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === String(c.id) ? "" : String(c.id))}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${category === String(c.id) ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {isLoading && <div className="text-center py-12 text-gray-500">Loading...</div>}

      {data && data.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No destinations found. Try a different search.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((dest) => (
          <DestinationCard key={dest.id} destination={dest} onClick={() => router.push(`/destination/${dest.id}`)} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
