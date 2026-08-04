"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUIStore } from "@/stores";
import { SECTION_TYPES, ICON_OPTIONS } from "@/lib/section-types";
import { Plus, Trash2, X, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, ChevronLeft, ArrowDown, ArrowUp, Image as ImageIcon } from "lucide-react";
import AssetPicker from "@/components/admin/AssetPicker";

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
    onError: (e: any) => addToast(e?.message || "Gagal menambah section", "error"),
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
    onError: (e: any) => addToast(e?.message || "Gagal menyimpan section", "error"),
  });

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) => api.delete(`/admin/destinations/${id}/sections/${sectionId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "sections", id] }); addToast("Section dihapus.", "info"); },
    onError: (e: any) => addToast(e?.message || "Gagal menghapus section", "error"),
  });

  const reorderSection = useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.put(`/admin/destinations/${id}/sections/reorder`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sections", id] }),
    onError: (e: any) => addToast(e?.message || "Gagal mengubah urutan", "error"),
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
                  <button onClick={() => { if (confirm("Remove this section?")) deleteSection.mutate(s.id); }}
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
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
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


function SectionFieldEditor({ sectionType, data, onChange }: {
  sectionType: string;
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const def = SECTION_TYPES[sectionType];
  if (!def || def.fields.length === 0) {
    return <p className="text-[13px] text-on-surface-variant">This section type has no editable fields (auto-rendered).</p>;
  }

  const setField = (key: string, value: unknown) => onChange({ ...data, [key]: value });

  // Asset picker state: {key} for top-level field, {arrayKey,idx,itemKey} for asset inside an array item
  const [picker, setPicker] = useState<{ key: string; multiple: boolean } | null>(null);
  const [pickerItem, setPickerItem] = useState<{ arrayKey: string; idx: number; itemKey: string } | null>(null);

  const handlePickerSelect = (url: string) => {
    if (picker) setField(picker.key, url);
    else if (pickerItem) {
      const items = Array.isArray(data[pickerItem.arrayKey]) ? [...(data[pickerItem.arrayKey] as Record<string, unknown>[])] : [];
      if (items[pickerItem.idx]) items[pickerItem.idx] = { ...items[pickerItem.idx], [pickerItem.itemKey]: url };
      setField(pickerItem.arrayKey, items);
    }
  };

  const handlePickerConfirm = (urls: string[]) => {
    if (picker) {
      const existing = Array.isArray(data[picker.key]) ? (data[picker.key] as string[]) : [];
      setField(picker.key, [...new Set([...existing, ...urls])]);
    }
  };

  return (
    <div className="space-y-4">
      {def.fields.map(field => {
        const value = data[field.key];

        if (field.type === "text" || field.type === "url" || field.type === "color") {
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <input type={field.type === "color" ? "color" : "text"} value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <textarea value={String(value || "")} onChange={e => setField(field.key, e.target.value)} rows={4}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          );
        }

        if (field.type === "number") {
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <input type="number" value={Number(value ?? field.default ?? 0)} min={field.min} max={field.max}
                onChange={e => setField(field.key, Number(e.target.value))}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          );
        }

        if (field.type === "boolean") {
          return (
            <label key={field.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(value ?? field.default ?? false)} onChange={e => setField(field.key, e.target.checked)} className="accent-primary" />
              <span className="text-[13px]">{field.label}</span>
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <select value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select...</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        }

        if (field.type === "icon") {
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <select value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select icon...</option>
                {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        }

        if (field.type === "asset") {
          const url = String(value || "");
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              {url && (
                <div className="mt-1 mb-2 relative inline-block">
                  <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-outline-variant" />
                  <button onClick={() => setField(field.key, "")}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setPicker({ key: field.key, multiple: false })}
                  className="px-3 py-2 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                  {url ? "Ganti Gambar" : "Pilih Gambar"}
                </button>
              </div>
              <input value={url} onChange={e => setField(field.key, e.target.value)} placeholder="atau tempel URL..."
                className="w-full p-2.5 mt-2 border border-outline-variant rounded-xl text-[12px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          );
        }

        // asset[] — image gallery (hero-gallery, image-grid). No item_fields, so needs its own branch.
        if (field.type === "asset[]") {
          const imgs = Array.isArray(value) ? (value as string[]) : [];
          const maxItems = field.max || 20;
          const addUrl = (raw: string) => {
            const u = raw.trim();
            if (!u) return;
            setField(field.key, [...new Set([...imgs, u])]);
          };
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label} ({imgs.length})</label>
              {imgs.length > 0 && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {imgs.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg border border-outline-variant" />
                      <button onClick={() => setField(field.key, imgs.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {imgs.length < maxItems && (
                <>
                  <button onClick={() => setPicker({ key: field.key, multiple: true })}
                    className="mt-2 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Tambah Gambar
                  </button>
                  <input
                    onBlur={e => { addUrl(e.target.value); e.target.value = ""; }}
                    onKeyDown={e => { if (e.key === "Enter") { addUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                    placeholder="atau tempel URL gambar (OSM/Wikimedia/dll) lalu Enter..."
                    className="w-full p-2.5 mt-2 border border-outline-variant rounded-xl text-[12px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </>
              )}
            </div>
          );
        }

        // Array types: card[], timeline-item[], guide-card[], asset[]
        if (field.type.endsWith("[]") && field.item_fields) {
          const items = Array.isArray(value) ? value as Record<string, unknown>[] : [];
          const maxItems = field.max || 20;

          const addItem = () => {
            const newItem: Record<string, unknown> = {};
            field.item_fields!.forEach(f => { newItem[f.key] = ""; });
            setField(field.key, [...items, newItem]);
          };

          const updateItem = (idx: number, itemKey: string, itemVal: unknown) => {
            const updated = items.map((item, i) => i === idx ? { ...item, [itemKey]: itemVal } : item);
            setField(field.key, updated);
          };

          const removeItem = (idx: number) => {
            setField(field.key, items.filter((_, i) => i !== idx));
          };

          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              <div className="mt-2 space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-high rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-on-surface-variant">Item {idx + 1}</span>
                      <button onClick={() => removeItem(idx)} className="p-1 text-error hover:bg-error/10 rounded"><X className="w-3 h-3" /></button>
                    </div>
                    {field.item_fields!.map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-on-surface-variant">{f.label}</label>
                        {f.type === "textarea" ? (
                          <textarea value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)} rows={2}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/20" />
                        ) : f.type === "select" ? (
                          <select value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/20">
                            <option value="">Select...</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "icon" ? (
                          <select value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/20">
                            <option value="">Select icon...</option>
                            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "asset" ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            {item[f.key] ? (
                              <img src={String(item[f.key])} alt="" className="w-12 h-12 object-cover rounded border border-outline-variant" />
                            ) : (
                              <div className="w-12 h-12 rounded border border-outline-variant bg-surface-container-high flex items-center justify-center"><ImageIcon className="w-4 h-4 text-on-surface-variant/30" /></div>
                            )}
                            <button onClick={() => setPickerItem({ arrayKey: field.key, idx, itemKey: f.key })}
                              className="px-2.5 py-1.5 text-[11px] font-medium border border-outline-variant rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                              {item[f.key] ? "Ganti" : "Pilih"}
                            </button>
                            {!!item[f.key] && (
                              <button onClick={() => updateItem(idx, f.key, "")} className="p-1 text-error hover:bg-error/10 rounded"><X className="w-3 h-3" /></button>
                            )}
                          </div>
                        ) : (
                          <input value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary/20" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {items.length < maxItems && (
                <button onClick={addItem} className="mt-2 px-3 py-1.5 text-[12px] font-medium border border-outline-variant rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                  + Add Item
                </button>
              )}
            </div>
          );
        }

        return null;
      })}

      <AssetPicker
        open={!!picker || !!pickerItem}
        onClose={() => { setPicker(null); setPickerItem(null); }}
        onSelect={handlePickerSelect}
        onConfirm={handlePickerConfirm}
        multiple={picker?.multiple}
      />
    </div>
  );
}
