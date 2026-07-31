"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePost, useComments, useCreateComment, useLikePost } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";
import { Heart, MessageSquare, Send, ArrowLeft, Share2, MoreHorizontal } from "lucide-react";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: post, isLoading } = usePost(id);
  const { data: comments } = useComments(id, !!id);
  const like = useLikePost();
  const create = useCreateComment(id);
  const { data: user } = useProfile();
  const [text, setText] = useState("");

  const [liked, setLiked] = useState(false);
  const onLike = () => {
    if (liked) return;
    setLiked(true);
    like.mutate(id);
  };

  const submit = async () => {
    if (!text.trim()) return;
    await create.mutateAsync(text.trim());
    setText("");
  };

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-16 min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-on-surface-variant">Postingan tidak ditemukan</p>
        <button onClick={() => router.push("/feed")} className="text-primary font-bold">Kembali ke Feed</button>
      </div>
    );
  }

  const hasImage = post.media?.[0]?.type === "image" && post.media[0].url;

  return (
    <div className="pt-16 min-h-screen bg-background">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        {/* Back Button */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-semibold">Kembali</span>
        </button>

        {/* Post Card — Full Detail */}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(post.username || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-bold leading-tight">{post.username || "Traveler"}</p>
                <p className="text-[10px] text-outline">{timeAgo(post.created_at)}</p>
              </div>
            </div>
            <button className="text-outline hover:text-on-surface transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Media */}
          {hasImage && (
            <div className="w-full" style={{ aspectRatio: post.media.length === 1 ? "16/9" : "1" }}>
              <img className="w-full h-full object-cover" src={post.media[0].url} alt="" />
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <p className="text-[14px] mb-4 leading-relaxed">
              <span className="font-bold">{post.username || "Traveler"}</span>{" "}
              {post.content}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-[12px] text-on-surface-variant pb-3 border-b border-outline-variant/10">
              <span>{post.like_count + (liked && !post.liked_by_me ? 1 : 0)} menyukai ini</span>
              <span>{post.comment_count} komentar</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex gap-4">
                <button onClick={onLike} className={`flex items-center gap-1.5 transition-all active:scale-[0.95] ${liked ? "text-primary" : "text-on-surface-variant hover:text-primary"}`}>
                  <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                  <span className="text-[12px] font-bold">Suka</span>
                </button>
                <button className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[12px] font-bold">Komentar</span>
                </button>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors active:scale-[0.95]">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-4 pb-4 border-t border-outline-variant/10 bg-surface-container-low/30">
            <div className="space-y-3 pt-4">
              {comments?.length === 0 && (
                <p className="text-[12px] text-outline text-center py-2">Belum ada komentar. Jadi yang pertama!</p>
              )}
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
            </div>

            {user ? (
              <div className="flex gap-2 mt-4">
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
              <p className="text-[12px] text-outline mt-3 text-center">Masuk untuk berkomentar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
