"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useTrip, useTripBudget } from "@/lib/queries";
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, CheckCircle2, ChevronRight, Briefcase } from "lucide-react";
import nextDynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, item as animItem } from "@/lib/animations";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(id);
  const { data: budget } = useTripBudget(id);

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="skeleton h-32 rounded-3xl mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    </div>
  );

  if (!trip) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
      <Briefcase className="w-16 h-16 mb-4 text-gray-300" />
      <p className="text-lg font-medium">Trip tidak ditemukan</p>
      <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors">
        Kembali
      </button>
    </div>
  );

  const activityMarkers = trip.days?.flatMap((d) =>
    d.activities.filter((a) => a.latitude && a.longitude).map((a) => ({
      id: a.id,
      name: a.name,
      latitude: a.latitude!,
      longitude: a.longitude!,
      marker_type: "recommended",
      category_name: a.category || "default"
    }))
  ) || [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="max-w-4xl mx-auto px-4 py-6"
    >
      <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-blue-600 mb-6 group w-fit">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm">Kembali</span>
      </button>

      {/* Header Card */}
      <motion.div variants={animItem} className="relative bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 via-purple-50 to-transparent rounded-full opacity-50 -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              trip.status === "planned" ? "bg-blue-100 text-blue-700" :
              trip.status === "active" ? "bg-emerald-100 text-emerald-700" :
              trip.status === "completed" ? "bg-gray-100 text-gray-600" :
              "bg-amber-100 text-amber-700"
            }`}>
              {trip.status === "planned" ? "Direncanakan" : trip.status}
            </span>
            {trip.is_public && <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold uppercase tracking-wider">Public</span>}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{trip.name}</h1>

          {trip.start_date && (
            <div className="flex items-center text-sm text-gray-600 font-medium">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              {new Date(trip.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {trip.end_date && (
                <>
                  <ArrowLeft className="w-3 h-3 mx-2 rotate-180 text-gray-400" />
                  {new Date(trip.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Itinerary */}
        <div className="lg:col-span-7 space-y-6">
          <motion.h2 variants={animItem} className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" /> Itinerary Perjalanan
          </motion.h2>

          {!trip.days || trip.days.length === 0 ? (
            <motion.div variants={animItem} className="bg-white rounded-3xl p-8 border border-gray-100 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-gray-900 font-medium mb-1">Belum ada jadwal</p>
              <p className="text-sm text-gray-500">Mulai tambahkan hari dan aktivitas untuk trip ini.</p>
            </motion.div>
          ) : (
            trip.days.map((day, dayIdx) => (
              <motion.div key={day.id} variants={animItem} className="relative pl-6 md:pl-8">
                {/* Timeline line */}
                <div className="absolute left-[11px] md:left-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />

                {/* Day Header */}
                <div className="relative mb-4">
                  <div className="absolute -left-6 md:-left-8 top-1.5 w-6 h-6 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shadow-sm z-10">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Hari ke-{day.day_number}
                    {day.date && <span className="text-sm font-medium text-gray-500 ml-2 font-normal">— {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>}
                  </h3>
                </div>

                {/* Activities */}
                <div className="space-y-3 mb-8">
                  {day.activities.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200 text-sm text-gray-500 text-center">
                      Belum ada aktivitas di hari ini
                    </div>
                  ) : (
                    day.activities.map((a, idx) => (
                      <div key={a.id} className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 flex items-center group-hover:text-blue-600 transition-colors">
                              {a.name}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs font-medium text-gray-500">
                              {a.start_time && (
                                <span className="flex items-center bg-gray-100 px-2 py-1 rounded-md text-gray-700">
                                  <Clock className="w-3 h-3 mr-1" /> {a.start_time} {a.end_time && `- ${a.end_time}`}
                                </span>
                              )}
                              {a.location_name && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" /> {a.location_name}
                                </span>
                              )}
                              {a.category && (
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md capitalize">
                                  {a.category}
                                </span>
                              )}
                            </div>

                            {a.description && (
                              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                                {a.description}
                              </p>
                            )}
                          </div>

                          {a.estimated_cost && (
                            <div className="ml-4 text-right flex-shrink-0">
                              <span className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Est. Biaya</span>
                              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                Rp{(a.estimated_cost).toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right Column: Map & Budget */}
        <div className="lg:col-span-5 space-y-6">
          {/* Map Preview */}
          <motion.div variants={animItem} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3 px-2 flex items-center">
              <Compass className="w-4 h-4 mr-2 text-blue-600" /> Peta Rute
            </h3>
            <div className="h-64 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
              {activityMarkers.length > 0 ? (
                <MapView markers={activityMarkers} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 flex-col">
                  <MapPin className="w-8 h-8 mb-2 opacity-30" />
                  Belum ada lokasi di peta
                </div>
              )}
            </div>
          </motion.div>

          {/* Budget Estimate */}
          {budget && (
            <motion.div variants={animItem} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-500" /> Estimasi Budget
              </h3>

              <div className="space-y-3 mb-6">
                {[
                  { label: "Akomodasi", value: budget.accommodation, icon: "🏨", color: "bg-blue-50 text-blue-700" },
                  { label: "Konsumsi", value: budget.food, icon: "🍽️", color: "bg-orange-50 text-orange-700" },
                  { label: "Transportasi", value: budget.transportation, icon: "🚗", color: "bg-purple-50 text-purple-700" },
                  { label: "Tiket Wisata", value: budget.tickets, icon: "🎟️", color: "bg-pink-50 text-pink-700" },
                  { label: "Parkir & Lainnya", value: budget.parking, icon: "🅿️", color: "bg-gray-100 text-gray-700" },
                  { label: "Dana Darurat", value: budget.emergency_reserve, icon: "🚑", color: "bg-red-50 text-red-700" },
                ].map(({ label, value, icon, color }) => value > 0 && (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${color} text-sm`}>
                        {icon}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      Rp{value.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
                  <div>
                    <span className="block text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Estimasi</span>
                    <span className="text-2xl font-bold text-emerald-700">Rp{(budget.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
