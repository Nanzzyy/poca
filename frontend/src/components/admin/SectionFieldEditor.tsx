"use client";
import { FormField } from "./FormField";
import { useState } from "react";
import { SECTION_TYPES, ICON_OPTIONS } from "@/lib/section-types";
import { destImage } from "@/lib/utils";
import { X, Plus, Image as ImageIcon } from "lucide-react";
import AssetPicker from "./AssetPicker";

export default function SectionFieldEditor({ sectionType, data, onChange }: {
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
            <FormField key={field.key} label={field.label}>
              <input type={field.type === "color" ? "color" : "text"} value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
            </FormField>
          );
        }

        if (field.type === "textarea") {
          return (
            <FormField key={field.key} label={field.label}>
              <textarea value={String(value || "")} onChange={e => setField(field.key, e.target.value)} rows={4}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
            </FormField>
          );
        }

        if (field.type === "number") {
          return (
            <FormField key={field.key} label={field.label}>
              <input type="number" value={Number(value ?? field.default ?? 0)} min={field.min} max={field.max}
                onChange={e => setField(field.key, Number(e.target.value))}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
            </FormField>
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
            <FormField key={field.key} label={field.label}>
              <select value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <option value="">Select...</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          );
        }

        if (field.type === "icon") {
          return (
            <FormField key={field.key} label={field.label}>
              <select value={String(value || "")} onChange={e => setField(field.key, e.target.value)}
                className="w-full p-2.5 mt-1 border border-outline-variant rounded-xl text-[13px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <option value="">Select icon...</option>
                {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          );
        }

        if (field.type === "asset") {
          const url = String(value || "");
          return (
            <div key={field.key}>
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">{field.label}</label>
              {url && (
                <div className="mt-1 mb-2 relative inline-block">
                  <img src={destImage([url], "Poca")} alt={`Preview gambar ${field.label}`} className="w-24 h-24 object-cover rounded-lg border border-outline-variant" />
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
                className="w-full p-2.5 mt-2 border border-outline-variant rounded-xl text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
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
                      <img src={destImage([url], "Poca")} alt={`Preview gambar ${field.label} ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-outline-variant" />
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
                    className="w-full p-2.5 mt-2 border border-outline-variant rounded-xl text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
                        ) : f.type === "select" ? (
                          <select value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                            <option value="">Select...</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "icon" ? (
                          <select value={String(item[f.key] || "")} onChange={e => updateItem(idx, f.key, e.target.value)}
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                            <option value="">Select icon...</option>
                            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === "asset" ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            {item[f.key] ? (
                              <img src={String(item[f.key])} alt={`Preview ${f.label}`} className="w-12 h-12 object-cover rounded border border-outline-variant" />
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
                            className="w-full p-2 mt-0.5 border border-outline-variant rounded-lg text-[12px] bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
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
