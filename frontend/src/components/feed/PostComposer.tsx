"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, X, Send } from "lucide-react";
import { useCreatePost } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { MediaItem } from "@/types";

const MAX_MEDIA = 4;
// ponytail: base64 cap at ~3MB per file — fine for dev/demo. Upgrade to real upload (S3/static) when scaling.
const MAX_FILE_BYTES = 3 * 1024 * 1024;

export function PostComposer() {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const create = useCreatePost();
  const { data: user } = useProfile();
  const addToast = useUIStore(s => s.addToast);

  const pick = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_MEDIA - media.length;
    const picked = Array.from(files).slice(0, remaining);
    for (const f of picked) {
      if (f.size > MAX_FILE_BYTES) {
        addToast(`"${f.name}" terlalu besar (maks 3MB).`, "error");
        continue;
      }
      const url = await readFile(f);
      if (!url) continue;
      setMedia((m) => [...m, { type: f.type.startsWith("video/") ? "video" : "image", url }]);
    }
  };

  const submit = async () => {
    if (!content.trim() && media.length === 0) return;
    await create.mutateAsync({ content: content.trim(), media });
    setContent("");
    setMedia([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!user) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
            {user.username[0].toUpperCase()}
          </div>
          {(user as any).is_verified && <VerifiedBadge className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background" />}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Lagi ngapain, ${user.username}? Bagikan perjalananmu…`}
            rows={2}
            className="w-full resize-none text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none bg-transparent"
          />

          <AnimatePresence>
            {media.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2"
              >
                {media.map((m, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    {m.type === "image" ? (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={m.url} className="w-full h-full object-cover" muted />
                    )}
                    <button
                      onClick={() => setMedia((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/20">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={media.length >= MAX_MEDIA}
              className="flex items-center gap-1.5 text-body-sm text-primary font-medium hover:bg-primary/10 px-2.5 py-1.5 rounded-lg disabled:opacity-40"
            >
              <ImagePlus className="w-4 h-4" />
              Foto/Video
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => pick(e.target.files)}
            />
            <button
              onClick={submit}
              disabled={create.isPending || (!content.trim() && media.length === 0)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {create.isPending ? "Mengirim…" : "Posting"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function readFile(f: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}
