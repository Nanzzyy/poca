"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import nextDynamic from "next/dynamic";
import { useMapMarkers, useSearchDestinations } from "@/lib/queries";
import { useRouter } from "next/navigation";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [bounds, setBounds] = useState<[number, number] | null>(null);
  const [ne, setNe] = useState<[number, number] | null>(null);
  const [q, setQ] = useState("");

  const markers = useMapMarkers(
    bounds ? bounds : [-10, 114],
    ne ? ne : [-7, 116]
  );
  const { data: searchResults } = useSearchDestinations(q);

  const destinations = markers.data?.features?.map((f: any) => ({
    id: f.properties.id,
    name: f.properties.name,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    rating_avg: f.properties.rating_avg,
    price_level: f.properties.price_level,
    images: f.properties.images,
  })) || [];

  const displayMarkers = q && searchResults
    ? searchResults.items.map((d) => ({
        id: d.id,
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        rating_avg: d.rating_avg,
        price_level: d.price_level,
        images: d.images,
      }))
    : destinations;

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search destinations on map..."
          className="w-full px-4 py-2.5 rounded-lg shadow-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <MapView
        markers={displayMarkers}
        onMarkerClick={(id) => router.push(`/destination/${id}`)}
        onBoundsChange={(sw, ne) => {
          setBounds(sw);
          setNe(ne);
        }}
        className="h-full w-full"
      />
    </div>
  );
}
