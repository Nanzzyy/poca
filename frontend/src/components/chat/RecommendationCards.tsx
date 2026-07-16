"use client";

import { useRouter } from "next/navigation";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import type { RecommendationCard } from "@/types";

export function RecommendationCards({ items }: { items: RecommendationCard[] }) {
  const router = useRouter();
  if (!items?.length) return null;
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
      {items.map((d) => {
        const img = d.image && !d.image.includes("source.unsplash") ? d.image : null;
        return (
          <button
            key={d.id}
            onClick={() => router.push(`/destination/${d.id}`)}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 text-left transition-colors"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
              {img ? (
                <img src={img} alt={d.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <CategoryIcon name={undefined} className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{d.name}</p>
              <p className="text-[10px] text-gray-500 flex items-center truncate">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {d.city ? `${d.city}, ` : ""}{d.country}
              </p>
              <div className="flex items-center text-[10px] text-yellow-600 font-semibold">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 mr-0.5" />
                {Number(d.rating_avg || 0).toFixed(1)}
                {d.category_name && <span className="text-gray-400 ml-1.5 font-normal">· {d.category_name}</span>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
