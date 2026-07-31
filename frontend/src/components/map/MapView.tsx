"use client";

import { useEffect, useRef, memo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Locate, Layers } from "lucide-react";

// Fix default marker icons — run once outside component
const defaultIcon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://carto.com/attributions">CARTO</a>';

const MARKER_COLORS: Record<string, string> = {
  recommended: "#2563eb",
  trending: "#7c3aed",
  hidden_gem: "#059669",
  community_favorite: "#d97706",
  crowded: "#dc2626",
};

// Memoized icon factory — cached by marker type
const iconCache = new Map<string, L.DivIcon>();
function getIcon(type: string, label?: string): L.DivIcon {
  const key = `${type}-${label}`;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const color = MARKER_COLORS[type] || "#6b7280";
  const icon = L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;background:${color};border:3px solid white;
      border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:12px;font-weight:bold;cursor:pointer;
    ">${label || "📍"}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -34],
  });
  iconCache.set(key, icon);
  return icon;
}

const ICON_MAP: Record<string, string> = {
  pantai: "🏖", candi: "🏛", gunung: "⛰", kuliner: "🍽",
  budaya: "🎭", alam: "🌲", belanja: "🛍", hiburan: "🎪",
};
function getLabel(name: string) { return ICON_MAP[name.toLowerCase()] || "📍"; }

interface MapMarkerData {
  id: string; name: string; latitude: number; longitude: number;
  rating_avg?: number; price_level?: string;
  category_name?: string; marker_type?: string; country?: string; city?: string;
}

interface MapViewProps {
  center?: [number, number]; zoom?: number;
  markers?: MapMarkerData[];
  onMarkerClick?: (marker: MapMarkerData) => void;
  onBoundsChange?: (sw: [number, number], ne: [number, number]) => void;
  focus?: [number, number] | null;   // fly to a coordinate (e.g. clicked search result)
  className?: string; height?: string;
}

// Optimized map controller — only updates when center/zoom actually change
const MapController = memo(function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef({ center, zoom });
  useEffect(() => {
    const p = prev.current;
    if (center[0] !== p.center[0] || center[1] !== p.center[1] || zoom !== p.zoom) {
      map.setView(center, zoom, { animate: true });
      prev.current = { center, zoom };
    }
  }, [center[0], center[1], zoom, map]);
  return null;
});

// Flies to `focus` whenever it changes (clicking a search result)
const FocusController = memo(function FocusController({ focus }: { focus: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!focus) return;
    if (prev.current && prev.current[0] === focus[0] && prev.current[1] === focus[1]) return;
    map.flyTo(focus, Math.max(map.getZoom(), 13), { duration: 0.8 });
    prev.current = focus;
  }, [focus, map]);
  return null;
});

// Debounced bounds listener — only fires after map stops moving
const BoundsListener = memo(function BoundsListener({ onChange }: { onChange?: (b: { sw: [number, number]; ne: [number, number] }) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useMapEvents({
    moveend: (e) => {
      if (!onChange) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const b = e.target.getBounds();
        onChange({
          sw: [b.getSouthWest().lat, b.getSouthWest().lng],
          ne: [b.getNorthEast().lat, b.getNorthEast().lng],
        });
      }, 300);
    },
  });
  return null;
});

const PopupContent = memo(function PopupContent({ marker }: { marker: MapMarkerData }) {
  return (
    <div className="min-w-[160px]">
      <strong className="text-sm">{marker.name}</strong>
      {marker.rating_avg != null && (
        <p className="text-xs text-yellow-600">
          {"★".repeat(Math.round(marker.rating_avg))} {marker.rating_avg}
        </p>
      )}
      <p className="text-[10px] text-gray-500">
        {marker.city ? `${marker.city}, ` : ""}{marker.country}
      </p>
    </div>
  );
});

// ─── MapControls ───────────────────────────────────────────
// Working +/- zoom, locate, and layers toggle inside the map.
const MapControls = memo(function MapControls({
  onLocate,
  layerOpen,
  onToggleLayers,
}: {
  onLocate?: () => void;
  layerOpen: boolean;
  onToggleLayers: () => void;
}) {
  const map = useMap();

  return (
    <div className="absolute top-5 right-5 flex flex-col gap-2 z-[1000]">
      {/* Zoom controls */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-1 flex flex-col shadow-lg border border-white/30">
        <button
          onClick={() => map.zoomIn()}
          className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="h-px bg-outline-variant/30 mx-2" />
        <button
          onClick={() => map.zoomOut()}
          className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
      {/* Locate */}
      <button
        onClick={onLocate || (() => {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 }),
              () => {},
              { enableHighAccuracy: true, timeout: 8000 }
            );
          }
        })}
        className="bg-white/80 backdrop-blur-md w-12 h-12 rounded-xl shadow-lg border border-white/30 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-95"
        aria-label="Locate me"
      >
        <Locate className="w-5 h-5" />
      </button>
      {/* Layers */}
      <button
        onClick={onToggleLayers}
        className={`bg-white/80 backdrop-blur-md w-12 h-12 rounded-xl shadow-lg border flex items-center justify-center transition-all active:scale-95 ${layerOpen ? "text-primary border-primary/40" : "text-on-surface-variant border-white/30 hover:text-primary"}`}
        aria-label="Toggle layers"
      >
        <Layers className="w-5 h-5" />
      </button>
    </div>
  );
});

// ─── Layer Panel ──────────────────────────────────────────
const LAYER_DEFS = [
  { name: "Street (OSM)", checked: true, url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr: "&copy; CARTO" },
  { name: "Light", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "&copy; CARTO" },
  { name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles &copy; Esri" },
  { name: "Terrain", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "&copy; OpenTopoMap" },
];

const LayerPanel = memo(function LayerPanel({ open, onSelect }: { open: boolean; onSelect?: (layer: string) => void }) {
  const map = useMap();
  const tileRef = useRef<L.TileLayer | null>(null);
  const [active, setActive] = useState("Street (OSM)");

  // Add default tile on mount
  useEffect(() => {
    if (!tileRef.current) {
      tileRef.current = L.tileLayer(LAYER_DEFS[0].url, { attribution: LAYER_DEFS[0].attr }).addTo(map);
    }
  }, [map]);

  if (!open) return null;

  const switchLayer = (def: typeof LAYER_DEFS[0]) => {
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(def.url, { attribution: def.attr }).addTo(map);
    setActive(def.name);
    onSelect?.(def.name);
  };

  return (
    <div className="absolute top-5 right-20 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-outline-variant/30 p-2 min-w-[160px]">
      {LAYER_DEFS.map((def) => (
        <button
          key={def.name}
          onClick={() => switchLayer(def)}
          className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${
            active === def.name ? "bg-primary/10 text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          {def.name}
        </button>
      ))}
    </div>
  );
});

export default function MapView({
  center: initialCenter,
  zoom: initialZoom = 10,
  markers = [],
  onMarkerClick,
  onBoundsChange,
  focus = null,
  className = "",
  height = "100%",
}: MapViewProps) {
  const center = initialCenter || [-2.5, 118.0];
  const [layerOpen, setLayerOpen] = useState(false);

  return (
    <div style={{ height }} className={`${className} relative`}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <ZoomControl position="bottomright" />

        <MapController center={center} zoom={initialZoom} />
        <FocusController focus={focus} />
        {onBoundsChange && <BoundsListener onChange={(b: any) => onBoundsChange(b.sw, b.ne)} />}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.latitude, m.longitude]}
            icon={getIcon(m.marker_type || m.category_name || "default", getLabel(m.category_name || ""))}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m) } : undefined}
          />
        ))}

        {/* Working map controls: +/- zoom, locate, layers */}
        <MapControls layerOpen={layerOpen} onToggleLayers={() => setLayerOpen((o) => !o)} />
        <LayerPanel open={layerOpen} onSelect={() => setLayerOpen(false)} />
      </MapContainer>
      {/* Legend */}
      <div className="absolute bottom-4 left-2 z-[1000] bg-white/90 backdrop-blur rounded-lg p-2 shadow text-[10px] space-y-0.5">
        {Object.entries({ recommended: "Rec", trending: "Trend", hidden_gem: "Hidden", community_favorite: "Fav", crowded: "Busy" }).map(([key, label]) => (
          <div key={key} className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MARKER_COLORS[key] || "#6b7280" }} />
            <span className="text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
