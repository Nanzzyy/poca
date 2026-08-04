"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Send, MapPin, Share2, Trash2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLikePost, useDeletePost, useComments, useCreateComment } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import { useUIStore } from "@/stores";
import type { Post } from "@/types";
import { timeAgo } from "@/lib/utils";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const like = useLikePost();
  const del = useDeletePost();
  const { data: user } = useProfile();
  const [showComments, setShowComments] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);

  // Slide to a neighboring index; loop at the ends.
  const goMedia = useCallback((dir: number) => {
    if (!post.media.length) return;
    setMediaIdx(i => (i + dir + post.media.length) % post.media.length);
  }, [post.media.length]);

  const onLike = async () => {
    if (!user) return router.push("/auth/login");
    // Optimistic toggle; server is source of truth (toggle endpoint).
    const next = !liked;
    setLiked(next);
    setLikeCount(c => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await like.mutateAsync(post.id);
      setLiked(res.liked);
      setLikeCount(res.like_count);
    } catch {
      setLiked(post.liked_by_me);
      setLikeCount(post.like_count);
    }
  };

  const onDelete = async () => {
    const confirm = useUIStore.getState().confirm;
    if (!await confirm({ title: "Hapus Postingan", message: "Hapus postingan ini? Tindakan tidak bisa dibatalkan.", confirmText: "Hapus" })) return;
    try {
      await del.mutateAsync(post.id);
    } catch { /* toast handled by caller */ }
  };

  const canDelete = user && post.user_id === user.id;
  const multi = post.media.length > 1;
  const hasMedia = post.media.length > 0;

  return (
    <div className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border ${isAiCurated(post) ? "border-secondary/20" : "border-outline-variant/10"} hover:shadow-lg transition-shadow duration-300`}
      style={isAiCurated(post) ? { boxShadow: "inset 0 0 12px rgba(113, 42, 226, 0.1), 0 4px 6px -1px rgba(0,0,0,0.1)" } : {}}
    >
      {/* AI Curated Badge */}
      {isAiCurated(post) && (
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-secondary fill-current" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-tight">AI Curated</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${post.user_id}`)}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(post.username || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-bold leading-tight flex items-center gap-1">
              {post.username || "Traveler"}
              {(post as any).is_verified && <VerifiedBadge className="w-3.5 h-3.5" />}
            </p>
            <p className="text-[10px] text-outline">{timeAgo(post.created_at)}{post.destination_id ? " • " + (post as any).location || "" : ""}</p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-outline hover:text-error transition-colors p-1"
            title="Hapus postingan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Media — slider for multi-photo/video posts */}
      {hasMedia && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: post.media.length === 1 ? "4/5" : post.media.length <= 2 ? "1" : "3/4" }}
          onClick={() => router.push(`/feed/${post.id}`)}>
          <div className="flex h-full transition-transform duration-300" style={{ transform: `translateX(-${mediaIdx * 100}%)` }}>
            {post.media.map((m, i) => (
              <div key={i} className="w-full h-full flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {m.type === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" muted loop controls={multi} />
                ) : (
                  <img className="w-full h-full object-cover" src={m.url} alt="" loading="lazy" />
                )}
              </div>
            ))}
          </div>

          {/* Slider controls */}
          {multi && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goMedia(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition-all z-10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goMedia(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition-all z-10">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {post.media.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === mediaIdx ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <p className="text-[14px] mb-2 leading-relaxed cursor-pointer" onClick={() => router.push(`/feed/${post.id}`)}>
          <span className="font-bold">{post.username || "Traveler"}</span>{" "}
          {post.content}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3 mt-2">
          <div className="flex gap-4">
            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className={`flex items-center gap-1.5 transition-all active:scale-[0.95] ${liked ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}>
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span className="text-[12px] font-bold">{likeCount}{likeCount > 999 ? "k" : ""}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowComments((s) => !s); }} className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[12px] font-bold">{post.comment_count}</span>
            </button>
          </div>
          <button onClick={(e) => { e.stopPropagation(); }} className="text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
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

const isAiCurated = (post: Post) => post.like_count > 1000;

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
              <p className="text-[10px] font-semibold text-on-surface flex items-center gap-1">
                {c.username || "Traveler"}
                {(c as any).is_verified && <VerifiedBadge className="w-3 h-3" />}
              </p>
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
