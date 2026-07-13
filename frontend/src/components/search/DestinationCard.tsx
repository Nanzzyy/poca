import type { Destination } from "@/types";
import { Star, MapPin } from "lucide-react";

function getBadge(d: Destination) {
  if (d.rating_avg >= 4.5 && d.review_count > 50) return { label: "Recommended", class: "bg-blue-500 text-white" };
  if (d.rating_avg >= 4.0 && d.review_count > 20) return { label: "Trending", class: "bg-purple-500 text-white" };
  if (d.review_count < 5 && d.rating_avg > 0) return { label: "Hidden Gem", class: "bg-emerald-500 text-white" };
  if (d.review_count > 200) return { label: "Popular", class: "bg-orange-500 text-white" };
  return null;
}

const PLACEHOLDER_EMOJIS = ["🏝️", "🏛️", "🌋", "🏯", "🌊", "⛰️", "🦁", "🐘", "🌸", "🏖️"];

export function DestinationCard({ destination: d, onClick }: { destination: Destination; onClick: () => void }) {
  const badge = getBadge(d);
  const emoji = PLACEHOLDER_EMOJIS[d.name.length % PLACEHOLDER_EMOJIS.length];

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden card-hover"
    >
      {/* Image area */}
      <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300">
          {emoji}
        </div>
        {/* Price level badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-xs font-medium capitalize shadow">
          {d.price_level === "budget" ? "💰 Budget" : d.price_level === "luxury" ? "💎 Luxury" : "💳 Mid"}
        </span>
        {/* Category */}
        {d.category && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-black/40 backdrop-blur rounded-lg text-xs text-white">
            {d.category.name}
          </span>
        )}
        {/* Badge */}
        {badge && (
          <div className="absolute bottom-3 left-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badge.class}`}>
              {badge.label}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
          {d.name}
        </h3>
        <p className="text-sm text-gray-500 truncate flex items-center">
          <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0" />
          {d.city || d.country}, {d.country}
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
    </div>
  );
}
