"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminTrafficRow } from "@/types";

interface AdminTrafficResponse {
  items: AdminTrafficRow[];
  total: number;
  page: number;
  size: number;
}

export default function AdminTrafficPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "traffic", page],
    queryFn: () => api.get<AdminTrafficResponse>("/admin/traffic", { params: { page, size: 50 } }),
    staleTime: 15_000,
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div>
      <h2 className="text-[24px] font-bold mb-6">Traffic Log ({total})</h2>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-container-low text-[11px] uppercase text-on-surface-variant">
            <tr><th className="p-3">Path</th><th className="p-3">User</th><th className="p-3">IP</th><th className="p-3">Waktu</th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-surface-container-low/30">
                <td className="p-3 font-mono text-[12px]">{r.path}</td>
                <td className="p-3 text-on-surface-variant">{r.user_id?.slice(0, 8) || "anon"}</td>
                <td className="p-3 text-on-surface-variant">{r.ip || "-"}</td>
                <td className="p-3 text-[11px]">{new Date(r.created_at).toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-center py-8 text-on-surface-variant">Belum ada traffic</p>}
      </div>
      {total > 50 && (
        <div className="flex items-center gap-2 mt-4 justify-center text-[13px]">
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-30">←</button>
          <span className="text-on-surface-variant">Hal {page}/{Math.ceil(total/50)}</span>
          <button disabled={page>=Math.ceil(total/50)} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
