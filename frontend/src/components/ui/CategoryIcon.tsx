"use client";

import {
  Palmtree, Landmark, Mountain, UtensilsCrossed, Palette,
  Trees, ShoppingBag, Music, MapPin, LucideIcon,
} from "lucide-react";

// Maps the `icon` strings stored on Category (see seed_destinations.py) to lucide icons.
const ICON_MAP: Record<string, LucideIcon> = {
  beach: Palmtree,
  landmark: Landmark,
  mountain: Mountain,
  utensils: UtensilsCrossed,
  palette: Palette,
  tree: Trees,
  "shopping-bag": ShoppingBag,
  music: Music,
};

export function categoryIcon(name?: string): LucideIcon {
  if (!name) return MapPin;
  return ICON_MAP[name.toLowerCase()] || MapPin;
}

export function CategoryIcon({
  name, className = "w-6 h-6",
}: { name?: string; className?: string }) {
  const Icon = categoryIcon(name);
  return <Icon className={className} />;
}
