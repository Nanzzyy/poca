"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { SECTION_TYPES, type SectionTypeDef } from "@/lib/section-types";
import { Plus, Pencil, Trash2, Download, Upload, FileJson, X, GripVertical, Eye, EyeOff } from "lucide-react";

interface TemplateSection {
  type: string;
  order: number;
  required?: boolean;
  title?: string;
  defaults?: Record<string, unknown>;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  sections: TemplateSection[];
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

const emptyTemplate: Template = { id: "", name: "", description: "", sections: [], is_default: false };

export default function AdminTemplatesPage() {
  const qc = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Template & { importJson?: string }>({ ...emptyTemplate });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => api.get<Template[]>("/admin/templates"),
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: (body: Partial<Template>) =>
      editItem?.id
        ? api.put(`/admin/templates/${editItem.id}`, body)
        : api.post("/admin/templates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "templates"] });
      setEditItem(null);
      setShowAdd(false);
      addToast("Template disimpan!", "success");
    },
    onError: (e: any) => addToast(e?.message || "Gagal menyimpan template", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "templates"] }); addToast("Template dihapus.", "info"); },
    onError: (e: any) => addToast(e?.message || "Gagal menghapus template", "error"),
  });

  const importJson = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/admin/templates/import", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "templates"] });
      setForm({ ...emptyTemplate });
      setShowAdd(false);
      addToast("Template diimpor!", "success");
    },
    onError: (e: any) => addToast(e?.message || "Import gagal", "error"),
  });

  const startEdit = (t: Template) => {
    setForm({ ...t });
    setEditItem(t);
    setShowAdd(true);
  };

  const startAdd = () => {
    setForm({ ...emptyTemplate });
    setEditItem(null);
    setShowAdd(true);
  };

  const addSection = (type: string) => {
    const def = SECTION_TYPES[type];
    if (!def) return;
    setForm(f => ({
      ...f,
      sections: [...f.sections, { type, order: f.sections.length, defaults: {} }],
    }));
  };

  const removeSection = (idx: number) => {
    setForm(f => ({
      ...f,
      sections: f.sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })),
    }));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= form.sections.length) return;
    const arr = [...form.sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setForm(f => ({ ...f, sections: arr.map((s, i) => ({ ...s, order: i })) }));
  };

  const handleSave = () => {
    if (!form.id || !form.name) return;
    save.mutate({
      id: form.id,
      name: form.name,
      description: form.description,
      sections: form.sections,
      is_default: form.is_default,
    });
  };

  const handleExport = async (id: string) => {
    const data = await api.get<Template>(`/admin/templates/${id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importJson.mutate(data);
      } catch {
        addToast("File JSON tidak valid", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-on-surface">Templates</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">Manage page layout templates for destinations</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>
          <button onClick={startAdd} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98]">
            <Plus className="w-3.5 h-3.5" /> Add Template
          </button>
        </div>
      </div>

      {/* Template list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-on-surface-variant text-[13px] col-span-full text-center py-8">Loading...</p>
        ) : templates?.length ? (
          templates.map(t => (
            <div key={t.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-on-surface">{t.name}</h3>
                    {t.is_default && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">Default</span>
                    )}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-0.5">ID: {t.id}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleExport(t.id)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg transition-colors" title="Export JSON">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(t)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete template?")) remove.mutate(t.id); }} className="p-1.5 text-on-surface-variant hover:text-error rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {t.description && <p className="text-[13px] text-on-surface-variant mb-3 line-clamp-2">{t.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {t.sections.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[11px] rounded-md font-medium">
                    {SECTION_TYPES[s.type]?.name || s.type}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileJson className="w-12 h-12 mx-auto mb-3 text-on-surface-variant/30" />
            <p className="text-[14px] text-on-surface-variant">No templates yet</p>
            <p className="text-[12px] text-on-surface-variant/60 mt-1">Create one or import a JSON file</p>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => { setEditItem(null); setShowAdd(false); }}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-bold">{editItem ? "Edit Template" : "New Template"}</h2>
              <button onClick={() => { setEditItem(null); setShowAdd(false); }} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Template ID</label>
                  <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} disabled={!!editItem}
                    className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" placeholder="e.g. temple, beach" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" placeholder="Template Name" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Description</label>
                <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="accent-primary" />
                <span className="text-[13px]">Set as default template</span>
              </label>

              {/* Sections */}
              <div>
                <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Sections</label>
                <div className="mt-2 space-y-2">
                  {form.sections.map((s, idx) => {
                    const def = SECTION_TYPES[s.type];
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2.5 bg-surface-container-high rounded-xl">
                        <GripVertical className="w-4 h-4 text-on-surface-variant/40" />
                        <span className="flex-1 text-[13px] font-medium">{def?.name || s.type}</span>
                        {def?.auto && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold">AUTO</span>}
                        <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container-lowest disabled:opacity-30">Up</button>
                        <button onClick={() => moveSection(idx, 1)} disabled={idx === form.sections.length - 1} className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container-lowest disabled:opacity-30">Down</button>
                        <button onClick={() => removeSection(idx)} className="p-1 text-error hover:bg-error/10 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(SECTION_TYPES).map(([key, def]) => (
                    <button key={key} onClick={() => addSection(key)}
                      className="px-2.5 py-1 text-[11px] font-medium border border-outline-variant rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                      + {def.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-outline-variant/20">
              <button onClick={handleSave} disabled={save.isPending || !form.id || !form.name}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-bold disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all">
                {save.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditItem(null); setShowAdd(false); }} className="px-4 py-2.5 text-on-surface-variant text-[13px] hover:text-on-surface">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
