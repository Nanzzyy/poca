"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useTrip, useTripBudget, useProfile } from "@/lib/queries";
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Briefcase, Compass } from "lucide-react";
import nextDynamic from "next/dynamic";
import { motion } from "framer-motion";
import { staggerContainer, item as animItem } from "@/lib/animations";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user } = useProfile();
  const { data: trip, isLoading } = useTrip(id);
  const { data: budget } = useTripBudget(id);

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg">
          <Briefcase className="w-8 h-8 text-on-primary" />
        </div>
        <p className="mb-4 text-body-md text-on-surface-variant">Masuk untuk melihat detail trip</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  if (isLoading) return (
    <div className="pt-20 max-w-4xl mx-auto px-4 py-8">
      <div className="skeleton h-32 rounded-3xl mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    </div>
  );

  if (!trip) return (
    <div className="pt-20 flex flex-col items-center justify-center px-5 text-center">
      <Briefcase className="w-16 h-16 mb-4 text-on-surface-variant opacity-30" />
      <p className="text-headline-sm font-bold text-on-surface">Trip tidak ditemukan</p>
      <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-full text-body-sm font-bold hover:bg-primary/20 transition-colors">
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

  const statusColors: Record<string, string> = {
    planned: "bg-primary/10 text-primary",
    active: "bg-tertiary/10 text-tertiary",
    completed: "bg-surface-container text-on-surface-variant",
    draft: "bg-secondary/10 text-secondary",
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="pt-16 max-w-4xl mx-auto px-4 py-6"
    >
      <button onClick={() => router.back()} className="flex items-center text-on-surface-variant hover:text-primary mb-4 group w-fit">
        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mr-2 group-hover:bg-primary/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-medium text-body-sm">Kembali</span>
      </button>

      {/* Header Card */}
      <motion.div variants={animItem} className="relative bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 mb-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-bl from-primary/5 via-secondary/5 to-transparent rounded-full opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusColors[trip.status] || "bg-surface-container text-on-surface-variant"}`}>
              {trip.status === "planned" ? "Direncanakan" : trip.status}
            </span>
            {trip.is_public && <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold uppercase tracking-wider">Public</span>}
          </div>
          <h1 className="text-display-md font-bold text-on-surface mb-2">{trip.name}</h1>
          {trip.start_date && (
            <div className="flex items-center text-body-sm text-on-surface-variant font-medium flex-wrap gap-1">
              <Calendar className="w-4 h-4 mr-1 text-primary" />
              {new Date(trip.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {trip.end_date && (
                <> — {new Date(trip.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Itinerary */}
        <div className="lg:col-span-7 space-y-6">
          <motion.h2 variants={animItem} className="text-headline-sm font-bold text-on-surface flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary" /> Itinerary Perjalanan
          </motion.h2>

          {!trip.days || trip.days.length === 0 ? (
            <motion.div variants={animItem} className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 text-center shadow-sm">
              <Calendar className="w-12 h-12 text-outline/30 mx-auto mb-3" />
              <p className="text-on-surface font-bold mb-1">Belum ada jadwal</p>
              <p className="text-body-sm text-on-surface-variant">Mulai tambahkan hari dan aktivitas untuk trip ini.</p>
            </motion.div>
          ) : (
            trip.days.map((day) => (
              <motion.div key={day.id} variants={animItem} className="relative pl-6 md:pl-8">
                <div className="absolute left-[11px] md:left-[15px] top-8 bottom-0 w-0.5 bg-outline-variant" />
                <div className="relative mb-4">
                  <div className="absolute -left-6 md:-left-8 top-1.5 w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 border-4 border-surface-container-lowest flex items-center justify-center shadow-sm z-10">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary" />
                  </div>
                  <h3 className="text-body-lg font-bold text-on-surface">
                    Hari ke-{day.day_number}
                    {day.date && <span className="text-body-sm font-medium text-on-surface-variant ml-2">— {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>}
                  </h3>
                </div>
                <div className="space-y-3 mb-8">
                  {day.activities.length === 0 ? (
                    <div className="bg-surface-container rounded-xl p-4 border border-dashed border-outline-variant text-body-sm text-on-surface-variant text-center">
                      Belum ada aktivitas
                    </div>
                  ) : (
                    day.activities.map((a) => (
                      <div key={a.id} className="group bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/30 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-body-md text-on-surface group-hover:text-primary transition-colors truncate">{a.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-caption font-medium text-on-surface-variant">
                              {a.start_time && (
                                <span className="flex items-center bg-surface-container px-2 py-1 rounded-md">
                                  <Clock className="w-3 h-3 mr-1" /> {a.start_time}{a.end_time ? ` - ${a.end_time}` : ""}
                                </span>
                              )}
                              {a.location_name && (
                                <span className="flex items-center truncate">
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" /> <span className="truncate">{a.location_name}</span>
                                </span>
                              )}
                              {a.category && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md capitalize text-[10px] font-bold">{a.category}</span>
                              )}
                            </div>
                            {a.description && <p className="text-body-sm text-on-surface-variant mt-2 leading-relaxed line-clamp-2">{a.description}</p>}
                          </div>
                          {a.estimated_cost ? (
                            <div className="text-right flex-shrink-0">
                              <span className="block text-caption text-on-surface-variant uppercase tracking-wider mb-0.5">Biaya</span>
                              <span className="text-body-sm font-bold text-tertiary bg-tertiary/10 px-2 py-1 rounded-lg whitespace-nowrap">
                                Rp{a.estimated_cost.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right: Map & Budget */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div variants={animItem} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30">
            <h3 className="font-bold text-on-surface mb-3 flex items-center text-body-md">
              <Compass className="w-4 h-4 mr-2 text-primary" /> Peta Rute
            </h3>
            <div className="h-48 sm:h-64 rounded-xl overflow-hidden bg-surface-container border border-outline-variant/20">
              {activityMarkers.length > 0 ? (
                <MapView markers={activityMarkers} />
              ) : (
                <div className="h-full flex items-center justify-center text-body-sm text-on-surface-variant flex-col">
                  <MapPin className="w-8 h-8 mb-2 opacity-30" />
                  Belum ada lokasi
                </div>
              )}
            </div>
          </motion.div>

          {budget && (
            <motion.div variants={animItem} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30">
              <h3 className="font-bold text-on-surface mb-4 flex items-center text-body-md">
                <DollarSign className="w-5 h-5 mr-2 text-tertiary" /> Estimasi Budget
              </h3>

              <div className="flex h-3 rounded-full overflow-hidden bg-surface-container mb-5">
                {[
                  { key: "accommodation", color: "bg-primary" },
                  { key: "food", color: "bg-secondary" },
                  { key: "transportation", color: "bg-tertiary" },
                  { key: "tickets", color: "bg-amber-500" },
                  { key: "parking", color: "bg-gray-400" },
                  { key: "emergency_reserve", color: "bg-error" }
                ].map(({ key, color }) => {
                  const val = (budget as any)[key] || 0;
                  if (val === 0 || !budget.total) return null;
                  return <div key={key} className={color} style={{ width: `${(val / budget.total) * 100}%` }} />;
                })}
              </div>

              <div className="space-y-3 mb-4">
                {[
                  { label: "Akomodasi", value: budget.accommodation ?? 0, color: "bg-primary/10 text-primary" },
                  { label: "Konsumsi", value: budget.food ?? 0, color: "bg-secondary/10 text-secondary" },
                  { label: "Transportasi", value: budget.transportation ?? 0, color: "bg-tertiary/10 text-tertiary" },
                  { label: "Tiket Wisata", value: budget.tickets ?? 0, color: "bg-amber-50 text-amber-700" },
                  { label: "Parkir", value: budget.parking ?? 0, color: "bg-surface-container text-on-surface-variant" },
                  { label: "Dana Darurat", value: budget.emergency_reserve ?? 0, color: "bg-error/10 text-error" },
                ].filter(item => item.value > 0).map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center mr-2.5 ${color} text-xs font-bold`}>
                      {label[0]}
                    </span>
                    <span className="text-body-sm font-medium text-on-surface flex-1">{label}</span>
                    <span className="text-body-sm font-bold text-on-surface">Rp{value.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-outline-variant/20">
                <div className="flex items-center justify-between bg-tertiary/5 p-4 rounded-xl border border-tertiary/10">
                  <div>
                    <span className="block text-caption font-bold text-tertiary uppercase tracking-wider mb-0.5">Total Estimasi</span>
                    <span className="text-display-md font-bold text-tertiary">Rp{(budget.total || 0).toLocaleString('id-ID')}</span>
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
