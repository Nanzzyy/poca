"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Wallet, Clock, MapPin, Bookmark, Check, ArrowDown } from "lucide-react";
import { useSavePlan } from "@/lib/queries";
import type { TripPlan } from "@/types";

const FIT_STYLES: Record<string, string> = {
  hemat: "bg-green-50 text-green-700",
  pas: "bg-blue-50 text-blue-700",
  over: "bg-red-50 text-red-700",
  estimasi: "bg-gray-100 text-gray-600",
};
const FIT_LABEL: Record<string, string> = {
  hemat: "Hemat", pas: "Pas", over: "Over budget", estimasi: "Estimasi",
};
const rupiah = (n: number) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

const BAR_COLORS: Record<string, string> = {
  activities: "bg-blue-500",
  accommodation: "bg-indigo-500",
  transport: "bg-cyan-400",
};

export function PlanCard({ plan }: { plan: TripPlan }) {
  const router = useRouter();
  const save = useSavePlan();
  const [savedId, setSavedId] = useState<string | null>(null);
  const be = plan.budget_estimate;
  const total = be.total || 1;

  const onSave = async () => {
    const id = await save.mutateAsync(plan);
    setSavedId(id);
  };

  return (
    <div className="mt-2 w-full rounded-2xl border border-gray-200 bg-white overflow-hidden text-left">
      {/* header */}
      <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <p className="text-sm font-bold leading-snug">{plan.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-blue-50">
          <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{plan.num_days} hari</span>
          <span className="flex items-center"><Users className="w-3 h-3 mr-1" />{plan.people} orang</span>
          {plan.location && (
            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{plan.location}</span>
          )}
        </div>
      </div>

      {/* budget */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center">
            <Wallet className="w-3 h-3 mr-1" />Total perkiraan
          </span>
          <span className="text-sm font-bold text-gray-900">{rupiah(be.total)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">~{rupiah(be.per_day)}/hari</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${FIT_STYLES[plan.budget_fit] || FIT_STYLES.estimasi}`}>
            {FIT_LABEL[plan.budget_fit] || plan.budget_fit}
            {plan.budget_delta != null && plan.budget_fit !== "estimasi" &&
              ` · ${plan.budget_delta >= 0 ? "+" : ""}${rupiah(plan.budget_delta)}`}
          </span>
        </div>
        {/* breakdown bar */}
        <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-gray-100">
          {["activities", "accommodation", "transport"].map((k) =>
            be.breakdown?.[k] ? (
              <div
                key={k}
                className={BAR_COLORS[k] || "bg-gray-400"}
                style={{ width: `${(be.breakdown[k] / total) * 100}%` }}
                title={`${k}: ${rupiah(be.breakdown[k])}`}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* days */}
      <div className="divide-y divide-gray-100">
        {plan.days.map((day) => (
          <div key={day.day} className="p-3">
            <p className="text-xs font-semibold text-gray-800 mb-2">
              {day.title}
              <span className="text-gray-400 font-normal"> · {day.activities.length} kegiatan</span>
            </p>
            <div className="space-y-1.5">
              {day.activities.map((a, i) => (
                <div key={i}>
                  <div
                    className={`flex items-start gap-2 ${a.destination_id ? "cursor-pointer hover:bg-blue-50 rounded-lg p-1 -m-1 transition-colors" : ""}`}
                    onClick={a.destination_id ? () => router.push(`/destination/${a.destination_id}`) : undefined}
                  >
                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 flex-shrink-0">
                      {a.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {a.name}
                        {a.destination_id && <MapPin className="inline w-2.5 h-2.5 ml-1 text-gray-300" />}
                      </p>
                      <p className="text-[10px] text-gray-400 capitalize">
                        {a.category}{a.location_name ? ` · ${a.location_name}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {a.cost ? rupiah(a.cost) : "gratis"}
                    </span>
                  </div>
                  {a.travel_next && (
                    <div className="flex items-center gap-1 pl-2 py-0.5 text-[10px] text-gray-400">
                      <ArrowDown className="w-2.5 h-2.5" />
                      ~{a.travel_next.minutes} mnt ({a.travel_next.distance_km} km)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* save */}
      <div className="p-3 border-t border-gray-100">
        {savedId ? (
          <button
            onClick={() => router.push(`/trips/${savedId}`)}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Tersimpan · Lihat trip
          </button>
        ) : (
          <button
            onClick={onSave}
            disabled={save.isPending}
            className="w-full flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {save.isPending ? (
              <><Clock className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
            ) : (
              <><Bookmark className="w-3.5 h-3.5" /> Simpan ke Trips</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
