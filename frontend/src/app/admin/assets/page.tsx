"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { Upload, Trash2, X, Tag, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface AssetItem {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  destination_id: string | null;
  section_id: string | null;
  alt_text: string | null;
  tags: string[];
  created_at?: string;
}

export default function AdminAssetsPage() {
  const qc = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [destFilter, setDestFilter] = useState("");
  const [editAsset, setEditAsset] = useState<AssetItem | null>(null);
  const [altText, setAltText] = useState("");
  const [assetTags, setAssetTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "assets", page, destFilter],
    queryFn: () => api.get<{ items: AssetItem[]; total: number; page: number; size: number }>("/admin/assets", {
      params: { page, size: 30, destination_id: destFilter || undefined },
    }),
    staleTime: 15_000,
  });

  const deleteAsset = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "assets"] }); addToast("Aset dihapus.", "info"); },
    onError: (e: any) => addToast(e?.message || "Gagal menghapus aset", "error"),
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/admin/assets/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "assets"] });
      setEditAsset(null);
      addToast("Aset diperbarui!", "success");
    },
    onError: (e: any) => addToast(e?.message || "Gagal memperbarui aset", "error"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        await api.upload("/admin/assets/upload", fd, { destination_id: destFilter || undefined });
      }
      qc.invalidateQueries({ queryKey: ["admin", "assets"] });
      addToast("Upload selesai!", "success");
    } catch (err: any) {
      addToast(err?.message || "Upload gagal", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startEdit = (a: AssetItem) => {
    setEditAsset(a);
    setAltText(a.alt_text || "");
    setAssetTags(a.tags.join(", "));
  };

  const handleSaveEdit = () => {
    if (!editAsset) return;
    updateAsset.mutate({
      id: editAsset.id,
      body: {
        alt_text: altText || null,
        tags: assetTags.split(",").map(t => t.trim()).filter(Boolean),
      },
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-on-surface">Asset Library</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">{total} assets</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50">
          <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload Files"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={handleUpload} />
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
          <input value={destFilter} onChange={e => { setDestFilter(e.target.value); setPage(1); }}
            placeholder="Filter by destination ID..."
            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <p className="text-on-surface-variant text-[13px] text-center py-12">Loading...</p>
      ) : data?.items.length ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {data.items.map(a => (
            <div key={a.id} className="group relative bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => startEdit(a)}>
              <div className="aspect-square bg-surface-container-high flex items-center justify-center">
                {a.mime_type.startsWith("image/") ? (
                  <img src={a.url} alt={a.alt_text || a.original_name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-on-surface-variant/30" />
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] text-on-surface-variant truncate">{a.original_name}</p>
                <p className="text-[9px] text-on-surface-variant/60">{formatSize(a.size_bytes)}</p>
              </div>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={async e => { e.stopPropagation(); if (await useUIStore.getState().confirm({ title: "Hapus Asset", message: "Delete asset?", confirmText: "Hapus" })) deleteAsset.mutate(a.id); }}
                  className="w-6 h-6 rounded-md bg-error/90 text-white flex items-center justify-center hover:bg-error">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {a.tags.length > 0 && (
                <div className="absolute bottom-8 left-2 flex gap-0.5">
                  {a.tags.slice(0, 2).map(t => (
                    <span key={t} className="px-1 py-0.5 bg-primary/80 text-white text-[8px] rounded font-bold">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-on-surface-variant/20" />
          <p className="text-[14px] text-on-surface-variant">No assets yet</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-2 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface-container-low">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] text-on-surface-variant">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface-container-low">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editAsset && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setEditAsset(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">Edit Asset</h2>
              <button onClick={() => setEditAsset(null)} className="p-1 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 rounded-xl overflow-hidden bg-surface-container-high">
              {editAsset.mime_type.startsWith("image/") ? (
                <img src={editAsset.url} alt="" className="w-full max-h-48 object-contain" />
              ) : (
                <div className="h-32 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-on-surface-variant/30" /></div>
              )}
            </div>

            <p className="text-[12px] text-on-surface-variant mb-4">{editAsset.original_name} &middot; {formatSize(editAsset.size_bytes)}</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Alt Text</label>
                <input value={altText} onChange={e => setAltText(e.target.value)}
                  className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Tags (comma-separated)</label>
                <input value={assetTags} onChange={e => setAssetTags(e.target.value)}
                  className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-outline-variant/20">
              <button onClick={handleSaveEdit} disabled={updateAsset.isPending}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold disabled:opacity-50">
                {updateAsset.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditAsset(null)} className="px-4 py-2 text-on-surface-variant text-[13px]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
