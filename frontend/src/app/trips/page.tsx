"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useTrips, useProfile } from "@/lib/queries";
import { Briefcase, Plus } from "lucide-react";

export default function TripsPage() {
  const router = useRouter();
  const { data: user } = useProfile();
  const { data } = useTrips();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Briefcase className="w-16 h-16 mb-4 text-gray-300" />
        <p className="mb-4">Sign in to view your trips</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <button
          onClick={() => router.push("/search")}
          className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> <span>New Trip</span>
        </button>
      </div>

      {!data || data.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase className="w-12 h-12 mx-auto mb-3" />
          <p>No trips yet. Start planning!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((trip) => (
            <div
              key={trip.id}
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{trip.name}</h3>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                    <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${
                      trip.status === "planned" ? "bg-blue-50 text-blue-600" :
                      trip.status === "active" ? "bg-green-50 text-green-600" :
                      trip.status === "completed" ? "bg-gray-100 text-gray-600" :
                      "bg-yellow-50 text-yellow-600"
                    }`}>
                      {trip.status}
                    </span>
                    {trip.start_date && (
                      <span>{new Date(trip.start_date).toLocaleDateString()} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : ""}</span>
                    )}
                    <span>{trip.days?.length || 0} days</span>
                  </div>
                </div>
                {trip.total_budget && (
                  <span className="text-sm font-medium text-green-600">
                    IDR {trip.total_budget.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
