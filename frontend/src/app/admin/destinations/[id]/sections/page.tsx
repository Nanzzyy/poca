"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { destImage } from "@/lib/utils";
import { SECTION_TYPES, ICON_OPTIONS } from "@/lib/section-types";
import { Plus, Trash2, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, ChevronLeft, ArrowDown, ArrowUp, Image as ImageIcon } from "lucide-react";
import SectionFieldEditor from "@/components/admin/SectionFieldEditor";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Section {
  id: string;
  destination_id: string;
  section_type: string;
  title: string | null;
  order: number;
  visible: boolean;
  data: Record<string, unknown>;
}

interface Destination {
  id: string;
  name: string;
  slug: string;
}

export default function AdminSectionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [showAdd, setShowAdd] = useState(false);
  useScrollLock(!!(editSection || showAdd));

  const { data: dest } = useQuery({
    queryKey: ["admin", "destinations", id],
    queryFn: () => api.get<Destination>(`/destinations/${id}`),
    enabled: !!id,
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin", "sections", id],
    queryFn: () => api.get<Section[]>(`/admin/destinations/${id}/sections`),
    enabled: !!id,
  });

  const createSection = useMutation({
    mutationFn: (body: { section_type: string; order: number }) =>
      api.post(`/admin/destinations/${id}/sections`, { ...body, data: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sections", id] });
      setShowAdd(false);
      addToast("Section ditambahkan!", "success");
    },
    onError: (e: Error) => addToast(e?.message || "Gagal menambah section", "error"),
  });

  const updateSection = useMutation({
    mutationFn: ({ sectionId, body }: { sectionId: string; body: Record<string, unknown> }) =>
      api.put(`/admin/destinations/${id}/sections/${sectionId}`, body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "sections", id] });
      // only close edit panel on full-data saves, not visibility toggles
      if (vars.body && "data" in vars.body) setEditSection(null);
      if (vars.body && "data" in vars.body) addToast("Section disimpan!", "success");
    },
    onError: (e: Error) => addToast(e?.message || "Gagal menyimpan section", "error"),
  });

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) => api.delete(`/admin/destinations/${id}/sections/${sectionId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "sections", id] }); addToast("Section dihapus.", "info"); },
    onError: (e: Error) => addToast(e?.message || "Gagal menghapus section", "error"),
  });

  const reorderSection = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.put(`/admin/destinations/${id}/sections/reorder`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sections", id] }),
    onError: (e: Error) => addToast(e?.message || "Gagal mengubah urutan", "error"),
  });

  const startEdit = (s: Section) => {
    setEditSection(s);
    setSectionData(s.data || {});
  };

  const handleSaveData = () => {
    if (!editSection) return;
    updateSection.mutate({ sectionId: editSection.id, body: { data: sectionData } });
  };

  const moveSection = (s: Section, dir: -1 | 1) => {
    if (!sections) return;
    const sorted = [...sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(x => x.id === s.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const items = sorted.map((item, i) => {
      if (i === idx) return { id: item.id, order: sorted[newIdx].order };
      if (i === newIdx) return { id: item.id, order: sorted[idx].order };
      return { id: item.id, order: item.order };
    });
    reorderSection.mutate(items);
  };

  const toggleVisibility = (s: Section) => {
    updateSection.mutate({ sectionId: s.id, body: { visible: !s.visible } });
  };

  const availableTypes = Object.entries(SECTION_TYPES).filter(
    ([key]) => !sections?.some(s => s.section_type === key) || !SECTION_TYPES[key]?.auto
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/destinations")} className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container-low">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-on-surface">Sections: {dest?.name || id}</h1>
          <p className="text-[12px] text-on-surface-variant">Manage page sections for this destination</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold hover:bg-primary/90 active:scale-[0.98]">
          <Plus className="w-3.5 h-3.5" /> Add Section
        </button>
      </div>

      {/* Section list */}
      {isLoading ? (
        <p className="text-on-surface-variant text-[13px] text-center py-8">Loading...</p>
      ) : sections?.length ? (
        <div className="space-y-3">
          {[...sections].sort((a, b) => a.order - b.order).map(s => {
            const def = SECTION_TYPES[s.section_type];
            return (
              <div key={s.id} className={`flex items-center gap-3 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 ${!s.visible ? "opacity-50" : ""}`}>
                <GripVertical className="w-4 h-4 text-on-surface-variant/40" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold">{def?.name || s.section_type}</span>
                    {def?.auto && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-bold">AUTO</span>}
                    {!s.visible && <span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded">HIDDEN</span>}
                  </div>
                  {s.title && <p className="text-[12px] text-on-surface-variant mt-0.5">{s.title}</p>}
                  <p className="text-[11px] text-on-surface-variant/60 mt-0.5">Order: {s.order}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => moveSection(s, -1)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg" title="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveSection(s, 1)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg" title="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleVisibility(s)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg" title={s.visible ? "Hide" : "Show"}>
                    {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {!def?.auto && (
                    <button onClick={() => startEdit(s)} className="px-3 py-1.5 text-[12px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20">
                      Edit Data
                    </button>
                  )}
                  <button onClick={async () => { if (await useUIStore.getState().confirm({ title: "Hapus Section", message: "Remove this section?", confirmText: "Hapus" })) deleteSection.mutate(s.id); }}
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[14px] text-on-surface-variant">No sections yet</p>
          <p className="text-[12px] text-on-surface-variant/60 mt-1">Add sections to customize this destination page</p>
        </div>
      )}

      {/* Add section modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">Add Section</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-on-surface-variant"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
              {availableTypes.map(([key, def]) => (
                <button key={key} onClick={() => createSection.mutate({ section_type: key, order: sections?.length || 0 })}
                  className="p-3 text-left border border-outline-variant rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-colors">
                  <p className="text-[13px] font-bold">{def.name}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{def.auto ? "Auto-rendered" : `${def.fields.length} fields`}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit section data modal */}
      {editSection && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => setEditSection(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">Edit: {SECTION_TYPES[editSection.section_type]?.name}</h2>
              <button onClick={() => setEditSection(null)} className="p-1 text-on-surface-variant"><X className="w-5 h-5" /></button>
            </div>

            {/* Section title */}
            <div className="mb-4">
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Section Title (optional)</label>
              <input value={editSection.title || ""} onChange={e => setEditSection({ ...editSection, title: e.target.value })}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
            </div>

            {/* Dynamic fields based on section type */}
            <SectionFieldEditor sectionType={editSection.section_type} data={sectionData} onChange={setSectionData} />

            <div className="flex gap-2 mt-5 pt-4 border-t border-outline-variant/20">
              <button onClick={handleSaveData} disabled={updateSection.isPending}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-[13px] font-bold disabled:opacity-50">
                {updateSection.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditSection(null); }} className="px-4 py-2 text-on-surface-variant text-[13px]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


