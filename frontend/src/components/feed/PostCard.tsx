"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Send, MapPin, Share2, MoreHorizontal, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLikePost, useComments, useCreateComment } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import type { Post } from "@/types";
import { timeAgo } from "@/lib/utils";

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const like = useLikePost();
  const [showComments, setShowComments] = useState(false);
  const store = getLikedStore();
  const [liked, setLiked] = useState(post.liked_by_me || store.has(post.id));

  const onLike = () => {
    if (liked) return;
    setLiked(true);
    getLikedStore().add(post.id);
    like.mutate(post.id);
  };

  const hasImage = post.media?.[0]?.type === "image" && post.media[0].url;
  const isAiCurated = post.like_count > 1000;

  return (
    <div className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border ${isAiCurated ? "border-secondary/20" : "border-outline-variant/10"} hover:shadow-lg transition-shadow duration-300`}
      style={isAiCurated ? { boxShadow: "inset 0 0 12px rgba(113, 42, 226, 0.1), 0 4px 6px -1px rgba(0,0,0,0.1)" } : {}}
    >
      {/* AI Curated Badge */}
      {isAiCurated && (
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-secondary fill-current" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-tight">AI Curated</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(post.username || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-bold leading-tight">{post.username || "Traveler"}</p>
            <p className="text-[10px] text-outline">{timeAgo(post.created_at)}{post.destination_id ? " • " + (post as any).location || "" : ""}</p>
          </div>
        </div>
        <button className="text-outline hover:text-on-surface transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      {hasImage ? (
        <div className="w-full overflow-hidden" style={{ aspectRatio: post.media.length === 1 ? "4/5" : post.media.length <= 2 ? "1" : "3/4" }}>
          <img
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            src={post.media[0].url}
            alt=""
            loading="lazy"
          />
        </div>
      ) : post.content ? null : (
        <div className="aspect-[4/5] w-full bg-gradient-to-br from-surface-container to-surface-container-high" />
      )}

      {/* Content */}
      <div className="p-4">
        <p className="text-[14px] mb-2 leading-relaxed">
          <span className="font-bold">{post.username || "Traveler"}</span>{" "}
          {post.content}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3 mt-2">
          <div className="flex gap-4">
            <button onClick={onLike} className={`flex items-center gap-1.5 transition-all active:scale-[0.95] ${liked ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}>
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span className="text-[12px] font-bold">{post.like_count + (liked && !post.liked_by_me ? 1 : 0)}{post.like_count > 999 ? "k" : ""}</span>
            </button>
            <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[12px] font-bold">{post.comment_count}</span>
            </button>
          </div>
          <button className="text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments */}
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
      className="px-4 pb-4 pt-1 border-t border-outline-variant/10 bg-surface-container-low/30"
    >
      <div className="space-y-3 pt-3">
        {isLoading && <p className="text-[10px] text-outline">Memuat komentar...</p>}
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
              {(c.username || "U")[0].toUpperCase()}
            </div>
            <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm px-3 py-2 flex-1">
              <p className="text-[10px] font-semibold text-on-surface">{c.username || "Traveler"}</p>
              <p className="text-[12px] text-on-surface-variant">{c.content}</p>
            </div>
          </div>
        ))}
        {comments && comments.length === 0 && !isLoading && (
          <p className="text-[10px] text-outline text-center py-1">Jadi yang pertama berkomentar</p>
        )}
      </div>

      {user ? (
        <div className="flex gap-2 mt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Tulis komentar..."
            className="flex-1 text-[12px] px-3 py-2 rounded-xl border border-outline-variant outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
          />
          <button onClick={submit} disabled={create.isPending || !text.trim()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-on-primary disabled:opacity-40 active:scale-[0.95]">
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-outline mt-2 text-center">Masuk untuk berkomentar</p>
      )}
    </motion.div>
  );
}

function getLikedStore() {
  if (typeof window === "undefined") return new Set<string>();
  if (!_likedStore) _likedStore = (() => {
    const set = new Set<string>();
    try {
      JSON.parse(localStorage.getItem("poca_liked") || "[]").forEach((id: string) => set.add(id));
    } catch { /* noop */ }
    const origAdd = set.add.bind(set);
    set.add = (v: string) => {
      const r = origAdd(v);
      try { localStorage.setItem("poca_liked", JSON.stringify([...set])); } catch { /* noop */ }
      return r;
    };
    return set;
  })();
  return _likedStore!;
}

let _likedStore: Set<string> | null = null;
