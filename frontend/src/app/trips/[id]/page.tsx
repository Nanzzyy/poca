"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useTrip, useTripBudget } from "@/lib/queries";
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock } from "lucide-react";
import nextDynamic from "next/dynamic";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(id);
  const { data: budget } = useTripBudget(id);

  if (isLoading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!trip) return <div className="text-center py-20 text-gray-500">Trip not found</div>;

  const activityMarkers = trip.days?.flatMap((d) =>
    d.activities.filter((a) => a.latitude).map((a) => ({
      id: a.id,
      name: a.name,
      latitude: a.latitude!,
      longitude: a.longitude!,
    }))
  ) || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-blue-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
          <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${
            trip.status === "planned" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
          }`}>{trip.status}</span>
          {trip.start_date && (
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(trip.start_date).toLocaleDateString()} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : ""}
            </span>
          )}
        </div>
      </div>

      {budget && (
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="font-semibold mb-3 flex items-center">
            <DollarSign className="w-5 h-5 text-green-600 mr-1" /> Budget Estimate
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Accommodation", value: budget.accommodation },
              { label: "Food", value: budget.food },
              { label: "Transportation", value: budget.transportation },
              { label: "Tickets", value: budget.tickets },
              { label: "Parking", value: budget.parking },
              { label: "Emergency Reserve", value: budget.emergency_reserve },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">IDR {value?.toLocaleString() || 0}</span>
              </div>
            ))}
            <div className="col-span-2 flex justify-between p-2 bg-blue-50 rounded font-semibold">
              <span>Total</span>
              <span>IDR {budget.total?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Route map */}
      {activityMarkers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-1" /> Route
            </h2>
          </div>
          <div className="h-64">
            <MapView markers={activityMarkers} />
          </div>
        </div>
      )}

      {/* Itinerary */}
      {trip.days?.map((day) => (
        <div key={day.id} className="bg-white rounded-xl shadow-sm border mb-4">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-600" />
              Day {day.day_number} — {day.date ? new Date(day.date).toLocaleDateString() : "TBD"}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {day.activities.length === 0 && (
              <p className="text-sm text-gray-400">No activities planned yet</p>
            )}
            {day.activities.map((a) => (
              <div key={a.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{a.name}</p>
                    {a.estimated_cost && (
                      <span className="text-xs text-green-600">IDR {a.estimated_cost.toLocaleString()}</span>
                    )}
                  </div>
                  {a.description && <p className="text-xs text-gray-500">{a.description}</p>}
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                    {a.start_time && <span className="flex items-center"><Clock className="w-3 h-3 mr-0.5" /> {a.start_time}</span>}
                    {a.location_name && <span>{a.location_name}</span>}
                    {a.category && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{a.category}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
