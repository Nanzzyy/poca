"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Upload, X, Check, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface AssetItem {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  tags: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** single mode: fired immediately on click */
  onSelect?: (url: string) => void;
  /** multiple mode: fired on "Done" with all selected urls */
  onConfirm?: (urls: string[]) => void;
  multiple?: boolean;
  /** pre-selected urls (multiple mode highlight) */
  selected?: string[];
  destinationId?: string;
}

export default function AssetPicker({ open, onClose, onSelect, onConfirm, multiple, selected = [], destinationId }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "assets", "picker", page, destinationId],
    queryFn: () => api.get<{ items: AssetItem[]; total: number; page: number; size: number }>("/admin/assets", {
      params: { page, size: 30, destination_id: destinationId || undefined },
    }),
    enabled: open,
    staleTime: 10_000,
  });

  if (!open) return null;

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        await api.upload("/admin/assets/upload", fd, { destination_id: destinationId || undefined });
      }
      qc.invalidateQueries({ queryKey: ["admin", "assets"] });
    } catch {
      // ponytail: caller toast surface lives in asset library; picker is transient
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clickAsset = (url: string) => {
    if (multiple) {
      setPicked(prev => {
        const next = new Set(prev);
        next.has(url) ? next.delete(url) : next.add(url);
        return next;
      });
    } else {
      onSelect?.(url);
      onClose();
    }
  };

  const confirmMultiple = () => {
    onConfirm?.(Array.from(picked));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-on-surface">{multiple ? "Pilih Gambar" : "Pilih Gambar"}</h2>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-3">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-[12px] font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Mengunggah..." : "Upload"}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={handleUpload} />
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {isLoading ? (
            <p className="text-on-surface-variant text-[13px] text-center py-12">Memuat...</p>
          ) : items.length ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {items.map(a => {
                const isPicked = picked.has(a.url);
                return (
                  <button key={a.id} onClick={() => clickAsset(a.url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isPicked ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-outline-variant"}`}>
                    {a.mime_type.startsWith("image/") ? (
                      <img src={a.url} alt={a.alt_text || a.original_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-container-high flex items-center justify-center"><ImageIcon className="w-6 h-6 text-on-surface-variant/30" /></div>
                    )}
                    {isPicked && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center"><Check className="w-3 h-3" /></div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 text-on-surface-variant/20" />
              <p className="text-[13px] text-on-surface-variant">Belum ada aset. Upload dulu.</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface-container-low"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[12px] text-on-surface-variant">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface-container-low"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        {multiple && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-outline-variant/20">
            <button onClick={onClose} className="px-4 py-2 text-on-surface-variant text-[13px]">Batal</button>
            <button onClick={confirmMultiple} className="px-5 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold">
              Pilih {picked.size > 0 ? `(${picked.size})` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
