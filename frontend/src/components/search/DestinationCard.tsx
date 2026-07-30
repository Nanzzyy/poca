"use client";

import { motion } from "framer-motion";
import type { Destination } from "@/types";
import { Star, MapPin, Heart } from "lucide-react";
import { CategoryIcon } from "@/components/ui";
import { item } from "@/lib/animations";

function getBadge(d: Destination) {
  if (d.rating_avg >= 4.5 && d.review_count > 50) return { label: "RECOMMENDED", class: "bg-emerald-500/90" };
  if (d.rating_avg >= 4.0 && d.review_count > 20) return { label: "TRENDING", class: "bg-secondary/90" };
  if (d.review_count < 5 && d.rating_avg > 0) return { label: "HIDDEN GEM", class: "bg-primary/90" };
  if (d.review_count > 200) return { label: "POPULAR", class: "bg-amber-500/90" };
  return null;
}

const GRADIENTS = [
  "from-surface-container-high to-surface-container",
  "from-surface-container to-surface-container-high",
  "from-surface-container-highest to-surface-container",
  "from-surface-dim to-surface-container",
];

export function DestinationCard({ destination: d, onClick }: { destination: Destination; onClick: () => void }) {
  const badge = getBadge(d);
  const gradient = GRADIENTS[d.name.length % GRADIENTS.length];
  const validImage = d.images?.[0] && !d.images[0].includes("source.unsplash");

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
    >
      <div className={`relative h-48 sm:h-52 ${validImage ? "bg-surface-container-low" : `bg-gradient-to-br ${gradient}`} overflow-hidden`}>
        {validImage ? (
          <img src={d.images[0]} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryIcon name={d.category?.icon} className="w-14 h-14 text-outline/30" />
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/50 backdrop-blur-sm text-on-surface flex items-center justify-center hover:bg-surface-container-lowest transition-colors"
        >
          <Heart className="w-[18px] h-[18px]" />
        </button>

        {/* Price level badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
          {d.price_level === "budget" ? "Budget" : d.price_level === "luxury" ? "Luxury" : "Mid"}
        </span>

        {/* Dynamic badge */}
        {badge && (
          <div className={`absolute bottom-3 left-3 px-2 py-1 ${badge.class} text-white text-[10px] font-bold rounded`}>
            {badge.label}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
            {d.name}
          </h3>
          <div className="flex items-center text-on-surface text-body-sm font-bold">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
            {d.rating_avg}
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          {d.city ? `${d.city}, ` : ""}{d.country}
        </p>
        {d.tags && d.tags.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            {d.tags.slice(0, 3).map((t) => (
              <span key={t} className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] rounded">{t}</span>
            ))}
            <span className="text-[10px] text-on-surface-variant">({d.review_count})</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
