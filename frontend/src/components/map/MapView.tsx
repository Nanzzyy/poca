"use client";

import { useEffect, useRef, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  onMarkerClick?: (id: string) => void;
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

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Modern (CARTO)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Minimal (Light)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapController center={center} zoom={initialZoom} />
        <FocusController focus={focus} />
        {onBoundsChange && <BoundsListener onChange={(b: any) => onBoundsChange(b.sw, b.ne)} />}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.latitude, m.longitude]}
            icon={getIcon(m.marker_type || m.category_name || "default", getLabel(m.category_name || ""))}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m.id) } : undefined}
          >
            <Popup><PopupContent marker={m} /></Popup>
          </Marker>
        ))}
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
