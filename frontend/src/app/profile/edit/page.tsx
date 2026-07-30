"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile, useUpdatePreferences } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { ArrowLeft, Loader } from "lucide-react";

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

  const prefs: Record<string, any> = (user?.preferences as Record<string, any>) || {};
  const [bio, setBio] = useState<string>(prefs.bio || "");
  const [style, setStyle] = useState<string>(prefs.travel_style || "mid");

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
    const merged = { ...prefs, bio: bio.trim(), travel_style: style };
    try {
      await update.mutateAsync(merged);
      addToast("Profil disimpan!", "success");
      router.push("/profile");
    } catch {
      addToast("Gagal menyimpan profil.", "error");
    }
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[16px] font-bold text-on-surface">{user.username}</p>
            <p className="text-[12px] text-on-surface-variant">{user.email}</p>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-medium text-on-surface-variant mb-1 block">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ceritakan sedikit tentang gaya liburanmu..."
            className="w-full p-3 border border-outline-variant/50 rounded-xl text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
