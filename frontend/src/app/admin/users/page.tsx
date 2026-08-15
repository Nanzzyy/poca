"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Search } from "lucide-react";
import type { AdminUser } from "@/types";

interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
}

interface AdminUserPatch {
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, q],
    queryFn: () => api.get<AdminUsersResponse>("/admin/users", { params: { page, size: 15, q } }),
    staleTime: 30_000,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUserPatch }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div>
      <h2 className="text-[24px] font-bold mb-6">Users ({total})</h2>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Cari user..." className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-container-low text-[11px] uppercase text-on-surface-variant">
            <tr><th className="p-3">Username</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Aktif</th><th className="p-3">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-surface-container-low/30">
                <td className="p-3 font-medium">{u.username}</td><td className="p-3 text-on-surface-variant">{u.email}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === "admin" ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface-variant"}`}>{u.role}</span></td>
                <td className="p-3">{u.is_active ? "✅" : "❌"}</td>
                <td className="p-3 flex gap-1">
                  <button onClick={() => updateUser.mutate({ id: u.id, body: { role: u.role === "admin" ? "user" : "admin" } })} className="px-2 py-1 rounded text-[11px] bg-primary/10 text-primary font-bold hover:bg-primary/20">
                    {u.role === "admin" ? "→ User" : "→ Admin"}
                  </button>
                  <button onClick={() => updateUser.mutate({ id: u.id, body: { is_active: !u.is_active } })} className={`px-2 py-1 rounded text-[11px] font-bold ${u.is_active ? "bg-error/10 text-error" : "bg-green-50 text-green-700"}`}>
                    {u.is_active ? "Ban" : "Unban"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 15 && (
        <div className="flex items-center gap-2 mt-4 justify-center text-[13px]">
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-30">←</button>
          <span className="text-on-surface-variant">Hal {page}/{Math.ceil(total/15)}</span>
          <button disabled={page>=Math.ceil(total/15)} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
