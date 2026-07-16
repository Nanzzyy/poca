"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Send, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLikePost, useComments, useCreateComment } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import type { Post } from "@/types";

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const like = useLikePost();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_me || likedStore.has(post.id));

  const onLike = () => {
    if (liked) return; // single-tap like (backend increments only)
    setLiked(true);
    likedStore.add(post.id);
    like.mutate(post.id);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
          {(post.username || "U")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{post.username || "Traveler"}</p>
          <p className="text-[10px] text-gray-400">{timeAgo(post.created_at)}</p>
        </div>
        {post.destination_id && (
          <button
            onClick={() => router.push(`/destination/${post.destination_id}`)}
            className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100"
          >
            <MapPin className="w-3 h-3 mr-1" /> Destinasi
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
      )}

      {/* Media */}
      {post.media?.length > 0 && (
        <div className={gridClass(post.media.length)}>
          {post.media.map((m, i) => (
            <div key={i} className="bg-gray-100 overflow-hidden">
              {m.type === "image" ? (
                <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <video src={m.url} controls playsInline className="w-full h-full object-cover bg-black" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3 border-t border-gray-50">
        <button onClick={onLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-rose-500" : "text-gray-500 hover:text-rose-500"}`}>
          <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} />
          {post.like_count + (liked && !post.liked_by_me ? 1 : 0)}
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500">
          <MessageSquare className="w-4 h-4" />
          {post.comment_count}
        </button>
      </div>

      <AnimatePresence>
        {showComments && <Comments postId={post.id} />}
      </AnimatePresence>
    </div>
  );
}

function Comments({ postId }: { postId: string }) {
  const { data: comments, isLoading } = useComments(postId);
  const create = useCreateComment(postId);
  const { data: user } = useProfile();
  const [text, setText] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    await create.mutateAsync(text.trim());
    setText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 pb-4 pt-1 border-t border-gray-50 bg-gray-50/40"
    >
      <div className="space-y-3 pt-3">
        {isLoading && <p className="text-xs text-gray-400">Memuat komentar…</p>}
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(c.username || "U")[0].toUpperCase()}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 flex-1">
              <p className="text-xs font-semibold text-gray-900">{c.username || "Traveler"}</p>
              <p className="text-sm text-gray-700 break-words">{c.content}</p>
            </div>
          </div>
        ))}
        {comments && comments.length === 0 && !isLoading && (
          <p className="text-xs text-gray-400 text-center py-1">Jadi yang pertama berkomentar</p>
        )}
      </div>

      {user ? (
        <div className="flex gap-2 mt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Tulis komentar…"
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={submit} disabled={create.isPending || !text.trim()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-2 text-center">Masuk untuk berkomentar</p>
      )}
    </motion.div>
  );
}

// localStorage keeps liked state per-device (backend like_count is append-only)
const likedStore = new Set<string>();
try {
  JSON.parse(localStorage.getItem("poca_liked") || "[]").forEach((id: string) => likedStore.add(id));
} catch { /* noop */ }
function persistLiked() {
  try { localStorage.setItem("poca_liked", JSON.stringify([...likedStore])); } catch { /* noop */ }
}
const _add = likedStore.add.bind(likedStore);
likedStore.add = (v: string) => { const r = _add(v); persistLiked(); return r; };

function gridClass(n: number) {
  if (n === 1) return "grid grid-cols-1";
  if (n === 2) return "grid grid-cols-2";
  return "grid grid-cols-2 sm:grid-cols-3";
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
