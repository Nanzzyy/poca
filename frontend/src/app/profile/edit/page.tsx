"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProfile, useUpdatePreferences, useUploadAvatar, useRemoveAvatar } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { ArrowLeft, Loader, Camera, X } from "lucide-react";

const STYLES = [
  { key: "budget", label: "🎒 Backpacker (Hemat)" },
  { key: "mid", label: "🧳 Mid-range" },
  { key: "luxury", label: "✨ Luxury" },
];

export default function EditProfilePage() {
  const router = useRouter();
  const addToast = useUIStore(s => s.addToast);
  const { data: user } = useProfile();
  const update = useUpdatePreferences();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const prefs: Record<string, unknown> = (user?.preferences as Record<string, unknown>) || {};
  const [bio, setBio] = useState<string>((prefs.bio as string) || "");
  const [style, setStyle] = useState<string>((prefs.travel_style as string) || "mid");
  const [location, setLocation] = useState<string>((prefs.location as string) || "");
  const [website, setWebsite] = useState<string>((prefs.website as string) || "");

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center h-screen">
        <p className="mb-4 text-body-md text-on-surface-variant">Masuk untuk mengedit profil</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold">Masuk</button>
      </div>
    );
  }

  const save = async () => {
    // Merge so we never clobber existing prefs (e.g. favorite_ids).
    const merged = { ...prefs, bio: bio.trim(), travel_style: style, location: location.trim(), website: website.trim() };
    try {
      await update.mutateAsync(merged);
      addToast("Profil disimpan!", "success");
      router.push("/profile");
    } catch {
      addToast("Gagal menyimpan profil.", "error");
    }
  };

  const onPickAvatar = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { addToast("File harus gambar.", "error"); return; }
    if (f.size > 5 * 1024 * 1024) { addToast("Maks 5MB.", "error"); return; }
    uploadAvatar.mutate(f, {
      onSuccess: () => addToast("Foto profil diperbarui!", "success"),
      onError: (e: Error) => addToast(e?.message || "Gagal upload foto.", "error"),
    });
  };

  const onRemoveAvatar = async () => {
    if (!await useUIStore.getState().confirm({ title: "Hapus Foto", message: "Kembali pakai inisial?", confirmText: "Hapus", danger: true })) return;
    removeAvatar.mutate(undefined, {
      onSuccess: () => addToast("Foto dihapus.", "info"),
      onError: (e: Error) => addToast(e?.message || "Gagal hapus foto.", "error"),
    });
  };

  return (
    <div className="pt-20 max-w-xl mx-auto px-5 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/profile")} className="p-2 hover:bg-surface-container-low rounded-lg transition-colors" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] font-bold text-on-surface">Edit Profil</h1>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors active:scale-90 disabled:opacity-50"
              title="Ganti foto"
            >
              {uploadAvatar.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPickAvatar(e.target.files); e.target.value = ""; }} />
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-bold text-on-surface">{user.username}</p>
            <p className="text-[12px] text-on-surface-variant">{user.email}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending} className="text-[12px] font-bold text-primary hover:underline disabled:opacity-50">
                {user.avatar_url ? "Ganti Foto" : "Unggah Foto"}
              </button>
              {user.avatar_url && (
                <button onClick={onRemoveAvatar} disabled={removeAvatar.isPending} className="text-[12px] font-bold text-error hover:underline disabled:opacity-50 flex items-center gap-0.5">
                  <X className="w-3 h-3" /> Hapus
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ceritakan sedikit tentang gaya liburanmu..."
            className="w-full p-3 border border-outline-variant/50 rounded-xl text-[14px] bg-surface-container-lowest outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-[12px] font-medium text-on-surface-variant mb-2 block">Gaya Perjalanan</label>
          <div className="flex flex-col gap-2">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                className={`text-left px-4 py-3 rounded-xl border text-[14px] transition-all ${style === s.key ? "border-primary bg-primary/5 text-primary font-bold" : "border-outline-variant/40 hover:bg-surface-container-low"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">Lokasi / Asal</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="cth: Jakarta, Indonesia"
              className="w-full p-3 border border-outline-variant/50 rounded-xl text-[14px] bg-surface-container-lowest outline-none"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">Website / Sosmed</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="cth: instagram.com/username"
              className="w-full p-3 border border-outline-variant/50 rounded-xl text-[14px] bg-surface-container-lowest outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={update.isPending}
            className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {update.isPending ? <><Loader className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
          </button>
          <button onClick={() => router.push("/profile")} className="px-6 py-3 border border-outline-variant rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
