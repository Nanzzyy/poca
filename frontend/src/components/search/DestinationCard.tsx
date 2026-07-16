"use client";

import { motion } from "framer-motion";
import type { Destination } from "@/types";
import { Star, MapPin } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import { item } from "@/lib/animations";

function getBadge(d: Destination) {
  if (d.rating_avg >= 4.5 && d.review_count > 50) return { label: "Recommended", class: "bg-blue-500 text-white" };
  if (d.rating_avg >= 4.0 && d.review_count > 20) return { label: "Trending", class: "bg-purple-500 text-white" };
  if (d.review_count < 5 && d.rating_avg > 0) return { label: "Hidden Gem", class: "bg-emerald-500 text-white" };
  if (d.review_count > 200) return { label: "Popular", class: "bg-orange-500 text-white" };
  return null;
}

const GRADIENTS = [
  "from-blue-400 to-cyan-500",
  "from-purple-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-red-500",
  "from-indigo-400 to-blue-500",
  "from-rose-400 to-pink-500",
];

export function DestinationCard({ destination: d, onClick }: { destination: Destination; onClick: () => void }) {
  const badge = getBadge(d);
  const gradient = GRADIENTS[d.name.length % GRADIENTS.length];
  const validImage = d.images?.[0] && !d.images[0].includes("source.unsplash");

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className="group bg-white rounded-3xl shadow-sm border border-gray-100/60 cursor-pointer overflow-hidden card-hover"
    >
      <div className={`relative h-56 ${validImage ? "bg-gray-100" : `bg-gradient-to-br ${gradient}`} overflow-hidden`}>
        {validImage ? (
          <img src={d.images[0]} alt={d.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-white/90 drop-shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CategoryIcon name={d.category?.icon} className="w-20 h-20" />
            </motion.div>
          </div>
        )}
        {/* Overlay pattern for gradient only */}
        {!validImage && <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />}

        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-xs font-medium capitalize shadow-sm">
          {d.price_level === "budget" ? "💰 Budget" : d.price_level === "luxury" ? "💎 Luxury" : "💳 Mid"}
        </span>
        {d.category && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-black/30 backdrop-blur rounded-lg text-xs text-white">
            {d.category.name}
          </span>
        )}
        {badge && (
          <div className="absolute bottom-3 left-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badge.class} shadow-sm`}>
              {badge.label}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
          {d.name}
        </h3>
        <p className="text-sm text-gray-500 truncate flex items-center">
          <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0" />
          {d.city ? `${d.city}, ` : ""}{d.country}
        </p>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">{d.rating_avg}</span>
            <span className="text-xs text-gray-400">({d.review_count})</span>
          </div>
          {d.tags && d.tags.length > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              #{d.tags[0]}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
