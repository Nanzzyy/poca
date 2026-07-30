"use client";

import { useRouter } from "next/navigation";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import type { RecommendationCard } from "@/types";
import { motion } from "framer-motion";

export function RecommendationCards({ items }: { items: RecommendationCard[] }) {
  const router = useRouter();
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
      {items.map((d, i) => {
        const img = d.image && !d.image.includes("source.unsplash") ? d.image : null;
        return (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={d.id}
            onClick={() => router.push(`/destination/${d.id}`)}
            className="flex-shrink-0 w-64 flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm text-left transition-all hover:shadow-md hover:border-blue-200 overflow-hidden press-scale"
          >
            <div className="w-full h-32 bg-gray-200 relative">
              {img ? (
                <img src={img} alt={d.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <CategoryIcon name={undefined} className="w-8 h-8 text-white/50" />
                </div>
              )}
              {d.category_name && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-semibold rounded-lg text-gray-800">
                  {d.category_name}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900 truncate mb-1">{d.name}</p>
              <p className="text-[11px] text-gray-500 flex items-center truncate mb-2">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{d.city ? `${d.city}, ` : ""}{d.country}</span>
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-yellow-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 mr-1" />
                  {Number(d.rating_avg || 0).toFixed(1)}
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
