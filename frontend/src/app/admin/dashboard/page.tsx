"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Users, MapPin, FileText, Eye, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<any>("/admin/dashboard"),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="text-center py-20 text-on-surface-variant">Memuat dashboard...</div>;

  const stats = [
    { label: "Total Users", value: data?.total_users ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Destinasi", value: data?.total_destinations ?? 0, icon: MapPin, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Total Postingan", value: data?.total_posts ?? 0, icon: FileText, color: "text-tertiary", bg: "bg-tertiary/10" },
    { label: "Views Hari Ini", value: data?.total_views_today ?? 0, icon: Eye, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const maxView = Math.max(1, ...(data?.weekly_views || []).map((v: any) => v.count));

  return (
    <div>
      <h2 className="text-[24px] font-bold mb-6">Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-[22px] font-bold">{value}</p>
                <p className="text-[11px] text-on-surface-variant">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Views Chart (CSS bar chart — zero dependencies) */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/20">
          <h3 className="text-[16px] font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Page Views 7 Hari
          </h3>
          {data?.weekly_views?.length ? (
            <div className="flex items-end gap-2 h-40">
              {(data.weekly_views as any[]).map((v: any) => (
                <div key={v.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-on-surface-variant font-medium">{v.count}</span>
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${(v.count / maxView) * 100}%`, minHeight: 4 }}
                  />
                  <span className="text-[9px] text-outline">{v.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-on-surface-variant py-8 text-center">Belum ada data traffic</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/20">
          <h3 className="text-[16px] font-bold mb-4">Top Halaman (7 Hari)</h3>
          {data?.top_pages?.length ? (
            <div className="space-y-2">
              {(data.top_pages as any[]).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-outline-variant/10">
                  <span className="text-[13px] text-on-surface font-medium truncate">{p.path}</span>
                  <span className="text-[12px] text-on-surface-variant font-bold">{p.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-on-surface-variant py-8 text-center">Belum ada data</p>
          )}
          <div className="mt-4 pt-3 border-t border-outline-variant/10">
            <p className="text-[12px] text-on-surface-variant">User baru 7 hari: <b>{data?.new_users_week ?? 0}</b></p>
          </div>
        </div>
      </div>
    </div>
  );
}
