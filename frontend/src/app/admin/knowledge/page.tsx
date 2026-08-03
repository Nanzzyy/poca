"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Plus, Pencil, Trash2, X, Upload, Brain, Eye, Archive, CheckCircle } from "lucide-react";

const STATUS_COLORS = {
  draft: "bg-surface-container-low text-on-surface-variant",
  published: "bg-primary/10 text-primary",
  archived: "bg-error/10 text-error",
};

export default function AdminKnowledgePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "knowledge", statusFilter, search, page],
    queryFn: () =>
      api.get<any>("/admin/knowledge", {
        params: { status: statusFilter || undefined, q: search || undefined, page, size: 20 },
      }),
    staleTime: 30_000,
  });

  const [edit, setEdit] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    topic: "",
    language: "id",
    source_url: "",
    source_name: "",
    trust_level: "official",
  });

  const save = useMutation({
    mutationFn: (body: any) =>
      edit?.id ? api.put(`/admin/knowledge/${edit.id}`, body) : api.post("/admin/knowledge", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      setEdit(null);
      setShowAdd(false);
      resetForm();
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/admin/knowledge/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "knowledge"] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.post(`/admin/knowledge/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "knowledge"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/knowledge/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "knowledge"] }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<any>("/admin/knowledge/upload", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
    },
  });

  const openEdit = async (k: any) => {
    const detail = await api.get<any>(`/admin/knowledge/${k.id}`);
    setEdit(detail);
    setForm({
      title: detail.title || "",
      content: detail.content || "",
      topic: detail.topic || "",
      language: detail.language || "id",
      source_url: detail.source_url || "",
      source_name: detail.source_name || "",
      trust_level: detail.trust_level || "official",
    });
  };

  const openAdd = () => {
    setShowAdd(true);
    setEdit(null);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      title: "",
      content: "",
      topic: "",
      language: "id",
      source_url: "",
      source_name: "",
      trust_level: "official",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" /> AI Knowledge
        </h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface rounded-xl text-[13px] font-bold cursor-pointer hover:bg-surface-container-low/80">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" accept=".txt,.md,.csv,.json,.docx" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Cari knowledge..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-[13px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-[13px]"
        >
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-on-surface-variant">Memuat knowledge...</div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-container-low text-[11px] uppercase text-on-surface-variant">
              <tr>
                <th className="p-3">Judul</th>
                <th className="p-3">Topik</th>
                <th className="p-3">Status</th>
                <th className="p-3">Versi</th>
                <th className="p-3">Sumber</th>
                <th className="p-3 w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {(data?.items || []).map((k: any) => (
                <tr key={k.id} className="hover:bg-surface-container-low/30">
                  <td className="p-3 font-medium">{k.title}</td>
                  <td className="p-3 text-on-surface-variant">{k.topic || "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${STATUS_COLORS[k.status as keyof typeof STATUS_COLORS]}`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="p-3">v{k.version}</td>
                  <td className="p-3 text-on-surface-variant text-[12px]">{k.source_name || k.source_url || "-"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {k.status === "draft" && (
                        <button
                          onClick={() => publish.mutate(k.id)}
                          disabled={publish.isPending}
                          className="p-1.5 rounded hover:bg-primary/10"
                          title="Publish"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-primary" />
                        </button>
                      )}
                      {k.status === "published" && (
                        <button
                          onClick={() => archive.mutate(k.id)}
                          disabled={archive.isPending}
                          className="p-1.5 rounded hover:bg-error/10"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5 text-error" />
                        </button>
                      )}
                      <button onClick={() => openEdit(k)} className="p-1.5 rounded hover:bg-surface-container">
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                      </button>
                      {k.status === "draft" && (
                        <button
                          onClick={() => {
                            if (confirm("Hapus knowledge ini?")) del.mutate(k.id);
                          }}
                          className="p-1.5 rounded hover:bg-error/10"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-error" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.items || data.items.length === 0) && (
            <div className="text-center py-12 text-on-surface-variant text-[13px]">
              Belum ada knowledge. Tambah atau upload file untuk memulai.
            </div>
          )}
        </div>
      )}

      {(edit || showAdd) && (
        <div
          className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            setEdit(null);
            setShowAdd(false);
            resetForm();
          }}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold">{edit?.id ? "Edit" : "Tambah"} Knowledge</h3>
              <button onClick={() => { setEdit(null); setShowAdd(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium block mb-0.5">Judul *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                  placeholder="Judul knowledge"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-0.5">Konten * (Markdown/Text)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] font-mono bg-surface-container-lowest"
                  placeholder="Isi knowledge dalam format Markdown atau plain text..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium block mb-0.5">Topik</label>
                  <input
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                    placeholder="travel, budget, kuliner, dll"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-0.5">Bahasa</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium block mb-0.5">Nama Sumber</label>
                  <input
                    value={form.source_name}
                    onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                    className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                    placeholder="Nama sumber/referensi"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-0.5">URL Sumber</label>
                  <input
                    type="url"
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                    className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-0.5">Trust Level</label>
                <select
                  value={form.trust_level}
                  onChange={(e) => setForm({ ...form, trust_level: e.target.value })}
                  className="w-full p-2 border border-outline-variant/20 rounded-lg text-[13px] bg-surface-container-lowest"
                >
                  <option value="official">Official</option>
                  <option value="verified">Verified</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <button
                onClick={() => save.mutate(form)}
                disabled={save.isPending || !form.title || !form.content}
                className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-[13px] disabled:opacity-50"
              >
                {save.isPending ? "Menyimpan..." : edit?.id ? "Update" : "Simpan sebagai Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
