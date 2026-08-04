"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useUIStore } from "@/stores";

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => api.get<any[]>("/admin/categories"),
    staleTime: 60_000,
  });

  const [edit, setEdit] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", icon: "" });

  const save = useMutation({
    mutationFn: (body: any) =>
      edit?.id ? api.put(`/admin/categories/${edit.id}`, body) : api.post("/admin/categories", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); setEdit(null); setShowAdd(false); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });

  const openEdit = (c: any) => { setEdit(c); setForm(c); };
  const openAdd = () => { setShowAdd(true); setEdit(null); setForm({ name: "", slug: "", icon: "" }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-bold">Kategori</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold active:scale-95">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-container-low text-[11px] uppercase text-on-surface-variant">
            <tr><th className="p-3">Nama</th><th className="p-3">Slug</th><th className="p-3">Icon</th><th className="p-3 w-20">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {(data || []).map((c: any) => (
              <tr key={c.id} className="hover:bg-surface-container-low/30">
                <td className="p-3 font-medium">{c.name}</td><td className="p-3 text-on-surface-variant">{c.slug}</td><td className="p-3">{c.icon || "-"}</td>
                <td className="p-3 flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-surface-container"><Pencil className="w-3.5 h-3.5 text-primary" /></button>
                  <button onClick={async () => { if (await useUIStore.getState().confirm({ title: "Hapus Kategori", message: "Hapus kategori ini?", confirmText: "Hapus" })) del.mutate(c.id); }} className="p-1.5 rounded hover:bg-error/10"><Trash2 className="w-3.5 h-3.5 text-error" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(edit || showAdd) && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => { setEdit(null); setShowAdd(false); }}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold">{edit?.id ? "Edit" : "Tambah"} Kategori</h3>
              <button onClick={() => { setEdit(null); setShowAdd(false); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-medium block mb-0.5">Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              <div><label className="text-[11px] font-medium block mb-0.5">Slug</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              <div><label className="text-[11px] font-medium block mb-0.5">Icon</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              <button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name} className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-[13px] disabled:opacity-50">
                {save.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
