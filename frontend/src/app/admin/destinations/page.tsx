"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { Plus, Pencil, Trash2, Search, X, Upload, Layers, FileJson, Sparkles, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { destImage } from "@/lib/utils";
import type {
  AdminDestination, AdminDestinationForm, AdminTemplate, AdminPoiItem,
  AdminEnrichResult, AdminEnrichJob, PaginatedResponse,
} from "@/types";

interface AdminDestinationsResponse {
  items: AdminDestination[];
  total: number;
  page: number;
  size: number;
}

export default function AdminDestinationsPage() {
  const qc = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editItem, setEditItem] = useState<AdminDestination | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AdminDestinationForm>({});
  const [enrichJobId, setEnrichJobId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "destinations", page, q],
    queryFn: () => api.get<AdminDestinationsResponse>(`/admin/destinations`, { params: { page, size: 15, q } }),
    staleTime: 30_000,
  });

  const { data: templates } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => api.get<AdminTemplate[]>("/admin/templates"),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (body: AdminDestinationForm) =>
      editItem?.id
        ? api.put(`/admin/destinations/${editItem.id}`, body)
        : api.post("/admin/destinations", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); setEditItem(null); setShowAdd(false); addToast("Destinasi disimpan!", "success"); },
    onError: (e: Error) => addToast(e?.message || "Gagal menyimpan destinasi", "error"),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/destinations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); addToast("Destinasi dihapus.", "info"); },
    onError: (e: Error) => addToast(e?.message || "Gagal menghapus", "error"),
  });

  const bulk = useMutation({
    mutationFn: (items: unknown[]) => api.post<{ imported?: number; skipped?: number; errors?: { index: number; name: string; error: string }[] }>("/admin/destinations/bulk", { items }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "destinations"] });
      const skipped = r.skipped || 0;
      const msg = `Terimpor ${r.imported ?? 0} destinasi${skipped ? `, dilewati ${skipped}` : ""}`;
      addToast(msg, skipped ? "info" : "success");
      if (r.errors?.length) console.warn("Bulk import errors:", r.errors);
    },
    onError: (e: Error) => addToast(e?.message || "Import gagal", "error"),
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

  // ── Free POI enrich & search (Wikidata/Nominatim/Wikipedia) ──
  const [poiQ, setPoiQ] = useState("");
  const [showPoi, setShowPoi] = useState(false);
  const [poiItems, setPoiItems] = useState<AdminPoiItem[]>([]);

  const enrichOne = useMutation({
    mutationFn: (id: string) => api.post<AdminEnrichResult>(`/admin/destinations/${id}/enrich-free`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); addToast(r?.image_added ? `Gambar ditambah (${r.source || "wikidata"})` : "Tidak ada gambar ditemukan", r?.image_added ? "success" : "info"); },
    onError: (e: Error) => addToast(e?.message || "Enrich gagal", "error"),
  });

  const enrichAll = useMutation({
    mutationFn: () => api.post<AdminEnrichJob>("/admin/destinations/enrich-free-all", {}),
    onSuccess: (r) => { setEnrichJobId(r?.job_id || null); addToast("Enrich background dimulai.", "info"); },
    onError: (e: Error) => addToast(e?.message || "Enrich batch gagal", "error"),
  });

  const enrichJob = useQuery({
    queryKey: ["admin", "enrich-job", enrichJobId],
    queryFn: () => api.get<AdminEnrichJob>(`/admin/destinations/enrich-free-all/${enrichJobId}`),
    enabled: !!enrichJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1500;
    },
  });

  useEffect(() => {
    const job = enrichJob.data;
    if (!enrichJobId || !job || !["completed", "failed"].includes(job.status)) return;
    qc.invalidateQueries({ queryKey: ["admin", "destinations"] });
    if (job.status === "completed") {
      addToast(`Enrich selesai: ${job.updated || 0} diperbarui${job.failed ? ` · ${job.failed} gagal` : ""}`, job.updated ? "success" : "info");
    } else {
      addToast(job.error || "Enrich batch gagal", "error");
    }
    setEnrichJobId(null);
  }, [enrichJob.data, enrichJobId, qc, addToast]);

  const poiSearch = useMutation({
    mutationFn: (query: string) => api.get<{ items: AdminPoiItem[] }>("/admin/places/search", { params: { q: query } }),
    onSuccess: (r) => setPoiItems(r?.items || []),
    onError: (e: Error) => addToast(e?.message || "Pencarian POI gagal", "error"),
  });

  const fromPlace = useMutation({
    mutationFn: (p: AdminPoiItem) => api.post<{ id: string }>("/admin/destinations/from-place", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); addToast("Destinasi ditambah dari POI", "success"); },
    onError: (e: Error) => addToast(e?.message || "Gagal menambah POI", "error"),
  });

  const openEdit = (item: AdminDestination) => {
    setEditItem(item);
    setForm({
      name: item.name,
      slug: item.slug,
      category_id: item.category ? "" : "",
      city: item.city,
      country: item.country,
      latitude: item.latitude,
      longitude: item.longitude,
      price_level: item.price_level,
      rating_avg: item.rating_avg,
      description: item.description,
      tags: item.tags,
      is_active: item.is_active,
    });
  };
  const openAdd = () => { setShowAdd(true); setEditItem(null); setForm({ name: "", category_id: "", city: "", country: "Indonesia", latitude: 0, longitude: 0, price_level: "mid", description: "" }); };

  // ── Image manager (max 3 per destination) ──
  const MAX_IMAGES = 3;
  const [imgItem, setImgItem] = useState<AdminDestination | null>(null);
  const [imgList, setImgList] = useState<string[]>([]);

  const openImages = (item: AdminDestination) => { setImgItem(item); setImgList([...(item.images || [])]); };

  const saveImages = useMutation({
    mutationFn: (body: { id: string; images: string[] }) => api.put(`/admin/destinations/${body.id}`, { images: body.images }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "destinations"] }); setImgItem(null); addToast("Gambar disimpan.", "success"); },
    onError: (e: Error) => addToast(e?.message || "Gagal menyimpan gambar", "error"),
  });

  const addImageUrl = (raw: string) => {
    const u = raw.trim();
    if (!u) return;
    if (imgList.length >= MAX_IMAGES) { addToast("Maksimal 3 gambar.", "info"); return; }
    if (imgList.includes(u)) { addToast("URL sudah ada.", "info"); return; }
    setImgList([...imgList, u]);
  };

  const enrichImage = useMutation({
    mutationFn: (id: string) => api.post<AdminEnrichResult>(`/admin/destinations/${id}/enrich-free`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "destinations"] });
      if (r?.image_added && r?.images?.length) setImgList([...r.images]);
      addToast(r?.image_added ? `Gambar ditambah (${r.source || "wikidata"})` : "Tidak ada gambar baru ditemukan", r?.image_added ? "success" : "info");
    },
    onError: (e: Error) => addToast(e?.message || "Enrich gagal", "error"),
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-bold">Destinasi ({total})</h2>
        <div className="flex items-center gap-2">
        <button onClick={() => setShowPoi(true)} className="flex items-center gap-2 px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-[13px] font-bold active:scale-95">
          <Search className="w-4 h-4" /> Cari POI
        </button>
        <button onClick={() => enrichAll.mutate()} disabled={enrichAll.isPending || !!enrichJobId} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl text-[13px] font-bold active:scale-95 disabled:opacity-50">
          <Sparkles className="w-4 h-4" /> {enrichAll.isPending || enrichJobId ? "Enrich berjalan..." : "Enrich Semua"}
        </button>
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
            {items.map((d) => (
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
                  <button onClick={() => openImages(d)} className="relative p-1.5 rounded hover:bg-primary/10" title="Lihat/kelola gambar">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    {!!(d.images?.length) && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{d.images.length}</span>
                    )}
                  </button>
                  <button onClick={() => enrichOne.mutate(d.id)} disabled={enrichOne.isPending} className="p-1.5 rounded hover:bg-secondary/10" title="Enrich gambar/koordinat">
                    <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  </button>
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-surface-container"><Pencil className="w-3.5 h-3.5 text-primary" /></button>
                  <button onClick={async () => { if (await useUIStore.getState().confirm({ title: "Hapus Destinasi", message: `Hapus "${d.name}"?`, confirmText: "Hapus" })) del.mutate(d.id); }} className="p-1.5 rounded hover:bg-error/10"><Trash2 className="w-3.5 h-3.5 text-error" /></button>
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
              {(["name", "city", "country", "slug"] as const).map((f) => (
                <div key={f}><label className="text-[11px] font-medium text-on-surface-variant block mb-0.5">{f}</label>
                  <input value={form[f] as string || ""} onChange={e => setForm({ ...form, [f]: e.target.value })} className="w-full p-2 border border-outline-variant rounded-lg text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
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
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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

      {/* Modal Cari POI (Wikidata/Nominatim gratis) */}
      {showPoi && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPoi(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold">Cari POI (gratis, tanpa API key)</h3>
              <button onClick={() => setShowPoi(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                value={poiQ} onChange={e => setPoiQ(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && poiQ.trim().length >= 2) poiSearch.mutate(poiQ.trim()); }}
                placeholder="cth: Pantai Kuta, Resto Bali..."
                className="flex-1 p-2 border border-outline-variant rounded-lg text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button onClick={() => poiSearch.mutate(poiQ.trim())} disabled={poiSearch.isPending || poiQ.trim().length < 2}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-[13px] font-bold disabled:opacity-50">
                {poiSearch.isPending ? "Mencari..." : "Cari"}
              </button>
            </div>
            <div className="space-y-2">
              {poiItems.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-outline-variant/20 rounded-xl">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-lg object-cover bg-surface-container-low" />
                    : <div className="w-16 h-16 rounded-lg bg-surface-container-low flex items-center justify-center text-outline"><Layers className="w-5 h-5" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate">{p.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{p.address || `${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}`}</p>
                    <p className="text-[10px] text-outline">sumber: {p.source}{p.city ? ` · ${p.city}` : ""}</p>
                  </div>
                  <button
                    onClick={() => fromPlace.mutate({ name: p.name, lat: p.lat, lng: p.lng, address: p.address, city: p.city, image_url: p.image_url, tags: [p.category || "wisata"] })}
                    disabled={fromPlace.isPending}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-[12px] font-bold disabled:opacity-50"
                  >
                    Tambah
                  </button>
                </div>
              ))}
              {poiItems.length === 0 && <p className="text-center py-6 text-on-surface-variant text-[13px]">Cari nama tempat untuk menampilkan kandidat.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Gambar (max 3) */}
      {imgItem && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setImgItem(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[18px] font-bold">Gambar: {imgItem.name}</h3>
              <button onClick={() => setImgItem(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[12px] text-on-surface-variant mb-4">{imgList.length}/{MAX_IMAGES} gambar · sumber bebas (URL / enrich Wikimedia/OSM)</p>

            {imgList.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {imgList.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={destImage([url], imgItem.name)} alt="" className="w-full aspect-square object-cover rounded-lg border border-outline-variant" />
                    <button onClick={() => setImgList(imgList.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-on-surface-variant text-[13px] mb-4">Belum ada gambar. Tambah dari URL atau enrich.</p>
            )}

            {imgList.length < MAX_IMAGES ? (
              <>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => enrichImage.mutate(imgItem.id)}
                    disabled={enrichImage.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-on-secondary rounded-lg text-[12px] font-bold disabled:opacity-50 whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5" /> {enrichImage.isPending ? "Mencari..." : "Enrich Gambar"}
                  </button>
                  <input
                    onKeyDown={e => { if (e.key === "Enter") { addImageUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                    onBlur={e => { addImageUrl(e.target.value); e.target.value = ""; }}
                    placeholder="tempel URL gambar lalu Enter..."
                    className="flex-1 p-2.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </>
            ) : (
              <p className="text-[12px] text-on-surface-variant mb-4">Slot penuh (3/3). Hapus salah satu untuk menambah.</p>
            )}

            <div className="flex gap-2 pt-4 border-t border-outline-variant/20">
              <button
                onClick={() => saveImages.mutate({ id: imgItem.id, images: imgList })}
                disabled={saveImages.isPending}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold disabled:opacity-50">
                {saveImages.isPending ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setImgItem(null)} className="px-4 py-2 text-on-surface-variant text-[13px]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
