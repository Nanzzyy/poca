"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useTrips, useProfile } from "@/lib/queries";
import { Briefcase, Plus, Calendar, MapPin, Sparkles, Compass } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function TripsPage() {
  const router = useRouter();
  const { data: user } = useProfile();
  const { data } = useTrips();

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg">
          <Briefcase className="w-8 h-8 text-on-primary" />
        </div>
        <p className="mb-4 text-body-md text-on-surface-variant">Masuk untuk melihat trip kamu</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  return (
    <div className="pt-20 max-w-2xl mx-auto px-5 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display-md font-bold text-on-surface">Trip Saya</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Rencana perjalanan Anda</p>
        </div>
        <button
          onClick={() => router.push("/chat")}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-body-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Trip Baru
        </button>
      </div>

      {!data || data.items.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Compass className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-on-surface text-[16px]">Belum ada trip</p>
          <p className="text-body-md mt-1">Mulai rencanakan liburanmu lewat AI Chat!</p>
          <button onClick={() => router.push("/chat")} className="mt-4 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-body-sm hover:bg-primary/90 transition-all">
            Buat Trip Via AI
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((trip) => (
            <div
              key={trip.id}
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 hover:shadow-md cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-body-md font-bold text-on-surface truncate">{trip.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-body-sm text-on-surface-variant">
                    <span className={`capitalize px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      trip.status === "planned" ? "bg-primary/10 text-primary" :
                      trip.status === "active" ? "bg-tertiary/10 text-tertiary" :
                      trip.status === "completed" ? "bg-surface-container text-on-surface-variant" :
                      "bg-secondary/10 text-secondary"
                    }`}>
                      {trip.status}
                    </span>
                    {trip.start_date && (
                      <span className="flex items-center gap-1 text-caption">
                        <Calendar className="w-3 h-3" />
                        {new Date(trip.start_date).toLocaleDateString("id-ID")}
                      </span>
                    )}
                    <span className="text-caption">{trip.days?.length || 0} hari</span>
                    <span className="text-caption flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {trip.destination_id ? "Ada destinasi" : "Belum ditentukan"}
                    </span>
                  </div>
                </div>
                {trip.total_budget ? (
                  <span className="text-body-sm font-bold text-tertiary whitespace-nowrap">
                    {formatCurrency(trip.total_budget)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
