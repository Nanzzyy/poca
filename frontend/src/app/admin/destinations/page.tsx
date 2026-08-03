"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { Plus, Pencil, Trash2, Search, X, Upload, Layers, FileJson } from "lucide-react";
import Link from "next/link";

export default function AdminDestinationsPage() {
  const qc = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "destinations", page, q],
    queryFn: () => api.get<any>(`/admin/destinations`, { params: { page, size: 15, q } }),
    staleTime: 30_000,
  });

  const { data: templates } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => api.get<any[]>("/admin/templates"),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (body: any) =>
      editItem?.id
        ? api.put(`/admin/destinations/${editItem.id}`, body)
        : api.post("/admin/destinations", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); setEditItem(null); setShowAdd(false); addToast("Destinasi disimpan!", "success"); },
    onError: (e: any) => addToast(e?.message || "Gagal menyimpan destinasi", "error"),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/destinations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); addToast("Destinasi dihapus.", "info"); },
    onError: (e: any) => addToast(e?.message || "Gagal menghapus", "error"),
  });

  const bulk = useMutation({
    mutationFn: (items: any[]) => api.post<any>("/admin/destinations/bulk", { items }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "destinations"] });
      const skipped = r.skipped || 0;
      const msg = `Terimpor ${r.imported ?? 0} destinasi${skipped ? `, dilewati ${skipped}` : ""}`;
      addToast(msg, skipped ? "info" : "success");
      if (r.errors?.length) console.warn("Bulk import errors:", r.errors);
    },
    onError: (e: any) => addToast(e?.message || "Import gagal", "error"),
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      const items = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(items) || !items.length) { addToast("JSON harus array atau {items:[...]}", "error"); e.target.value = ""; return; }
      bulk.mutate(items);
    } catch { addToast("File JSON tidak valid", "error"); }
    e.target.value = "";
  };

  const openEdit = (item: any) => { setEditItem(item); setForm({ ...item }); };
  const openAdd = () => { setShowAdd(true); setEditItem(null); setForm({ name: "", category_id: "", city: "", country: "Indonesia", latitude: 0, longitude: 0, price_level: "mid", description: "" }); };

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-bold">Destinasi ({total})</h2>
        <div className="flex items-center gap-2">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold active:scale-95">
          <Plus className="w-4 h-4" /> Tambah
        </button>
        <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl text-[13px] font-bold active:scale-95 cursor-pointer">
          <Upload className="w-4 h-4" /> {bulk.isPending ? "Mengimpor..." : "Import JSON"}
          <input type="file" accept="application/json" className="hidden" onChange={onFile} disabled={bulk.isPending} />
        </label>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
        <input
          value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari destinasi..." className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase">
            <tr>
              <th className="p-3">Nama</th><th className="p-3">Kota</th><th className="p-3">Price</th><th className="p-3">Rating</th><th className="p-3">Aktif</th><th className="p-3 w-20">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {items.map((d: any) => (
              <tr key={d.id} className="hover:bg-surface-container-low/30">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3 text-on-surface-variant">{d.city || "-"}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary">{d.price_level}</span></td>
                <td className="p-3">{d.rating_avg}</td>
                <td className="p-3">{d.is_active ? "✅" : "❌"}</td>
                <td className="p-3 flex gap-1">
                  <Link href={`/admin/destinations/${d.id}/sections`} className="p-1.5 rounded hover:bg-surface-container" title="Sections">
                    <Layers className="w-3.5 h-3.5 text-tertiary" />
                  </Link>
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-surface-container"><Pencil className="w-3.5 h-3.5 text-primary" /></button>
                  <button onClick={() => { if (confirm("Hapus?")) del.mutate(d.id); }} className="p-1.5 rounded hover:bg-error/10"><Trash2 className="w-3.5 h-3.5 text-error" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-center py-8 text-on-surface-variant text-[13px]">Tidak ada data</p>}
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center gap-2 mt-4 justify-center text-[13px]">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-outline-variant disabled:opacity-30">←</button>
          <span className="text-on-surface-variant">Halaman {page} dari {Math.ceil(total / 15)}</span>
          <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-outline-variant disabled:opacity-30">→</button>
        </div>
      )}

      {/* Modal Form */}
      {(editItem || showAdd) && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => { setEditItem(null); setShowAdd(false); }}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold">{editItem?.id ? "Edit" : "Tambah"} Destinasi</h3>
              <button onClick={() => { setEditItem(null); setShowAdd(false); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {["name", "city", "country", "slug"].map(f => (
                <div key={f}><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">{f}</label>
                  <input value={form[f] || ""} onChange={e => setForm({ ...form, [f]: e.target.value })} className="w-full p-2 border border-outline-variant rounded-lg text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Latitude</label><input type="number" step="any" value={form.latitude || 0} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
                <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Longitude</label><input type="number" step="any" value={form.longitude || 0} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Price Level</label>
                  <select value={form.price_level || "mid"} onChange={e => setForm({ ...form, price_level: e.target.value })} className="w-full p-2 border rounded-lg text-[13px]">
                    <option value="budget">Budget</option><option value="mid">Mid</option><option value="luxury">Luxury</option>
                  </select>
                </div>
                <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Rating</label><input type="number" step="0.1" min={0} max={5} value={form.rating_avg || 0} onChange={e => setForm({ ...form, rating_avg: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              </div>
              <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Deskripsi</label><textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2 border rounded-lg text-[13px] h-20" /></div>
              <div><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">Tags (koma)</label><input value={(form.tags || []).join(", ")} onChange={e => setForm({ ...form, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })} className="w-full p-2 border rounded-lg text-[13px]" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })} /><span className="text-[13px]">Aktif</span></div>

              {!editItem && templates && templates.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1 mb-1">
                    <FileJson className="w-3 h-3" /> Template (opsional)
                  </label>
                  <select value={form.template_id || ""} onChange={e => setForm({ ...form, template_id: e.target.value || undefined })}
                    className="w-full p-2 border border-outline-variant rounded-lg text-[13px] bg-surface-container-lowest">
                    <option value="">Tanpa template</option>
                    {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <button
                onClick={() => save.mutate(form)}
                disabled={save.isPending || !form.name}
                className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-[13px] disabled:opacity-50"
              >
                {save.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
