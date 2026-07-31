"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfinitePosts, useCreatePost } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { GridSkeleton, EmptyState, Loading } from "@/components/ui";
import { PostCard } from "@/components/feed/PostCard";
import { Sparkles, Image as ImageIcon, Video, X, ArrowRight } from "lucide-react";
import type { MediaItem } from "@/types";

// ponytail: media stored as base64 in the post payload (dev/demo). Move to real
// upload (S3/static) when scaling — cap keeps payloads small.
const MAX_MEDIA = 4;
const MAX_FILE_BYTES = 3 * 1024 * 1024;

function readFile(f: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => resolve(null);
    r.readAsDataURL(f);
  });
}

export default function FeedPage() {
  const router = useRouter();
  const addToast = useUIStore(s => s.addToast);
  const { data: user } = useProfile();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfinitePosts();
  const observerTarget = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const [postContent, setPostContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);

  const pick = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_MEDIA - media.length;
    const picked = Array.from(files).slice(0, remaining);
    for (const f of picked) {
      if (f.size > MAX_FILE_BYTES) { addToast(`"${f.name}" terlalu besar (maks 3MB).`, "error"); continue; }
      const url = await readFile(f);
      if (!url) continue;
      setMedia((m) => [...m, { type: f.type.startsWith("video/") ? "video" : "image", url }]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!postContent.trim() && media.length === 0) return;
    if (!user) return router.push("/auth/login");
    try {
      await createPost.mutateAsync({ content: postContent.trim(), media });
      setPostContent("");
      setMedia([]);
      addToast("Postingan terkirim!", "success");
    } catch { addToast("Gagal mengirim postingan.", "error"); }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap(p => p.items) || [];

  return (
    <div className="pt-16 bg-background text-on-surface min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        {/* ═══ TOP SECTION: Create Post + AI Insights ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          {/* Create Post */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-bold">
                {(user?.username || "U")[0].toUpperCase()}
              </div>
              <div className="flex-grow">
                <textarea
                  className="w-full border-none focus:ring-0 text-[16px] text-on-surface bg-transparent resize-none h-24 p-0 placeholder:text-outline outline-none"
                  placeholder={user ? `Lagi ngapain, ${user.username}? Bagikan petualanganmu...` : "Share your latest adventure with the Poca community..."}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />
                {media.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {media.map((m, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-container">
                        {m.type === "image" ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={m.url} className="w-full h-full object-cover" muted />
                        )}
                        <button onClick={() => setMedia((arr) => arr.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-outline-variant/20 pt-4">
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={media.length >= MAX_MEDIA} className="flex items-center gap-1 text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-[12px] font-semibold">Photo</span>
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={media.length >= MAX_MEDIA} className="flex items-center gap-1 text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded-lg transition-all active:scale-[0.98] disabled:opacity-40">
                  <Video className="w-4 h-4 text-secondary" />
                  <span className="text-[12px] font-semibold">Video</span>
                </button>
              </div>
              <button
                onClick={submit}
                disabled={createPost.isPending || (!postContent.trim() && media.length === 0)}
                className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold active:scale-[0.98] text-[14px] disabled:opacity-50"
              >
                {createPost.isPending ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-secondary/10" style={{ boxShadow: "inset 0 0 12px rgba(113, 42, 226, 0.1), 0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-secondary font-bold uppercase tracking-widest">Poca AI Insight</span>
                  <div className="bg-secondary/10 px-2 py-0.5 rounded">
                    <span className="text-[10px] text-secondary font-bold">SMART FEED</span>
                  </div>
                </div>
                <h3 className="text-[20px] font-semibold mb-1">Trending in Tokyo</h3>
                <p className="text-[12px] text-on-surface-variant">The cherry blossoms are peaking! Users are currently sharing high-quality photos from Shinjuku Gyoen. Want to see more?</p>
              </div>
              <button onClick={() => router.push("/map")} className="mt-4 text-primary font-bold text-[12px] flex items-center gap-1 hover:underline transition-all">
                Explore Trending Map <ArrowRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ MASONRY FEED ═══ */}
        {isLoading && (
          <div className="flex flex-col items-center py-16">
            <Loading variant="feed" />
          </div>
        )}
        {error && <EmptyState icon={Sparkles} title="Gagal memuat feed" description="Coba lagi nanti" />}

        {!isLoading && !error && posts.length === 0 && (
          <EmptyState icon={Sparkles} title="Belum ada postingan" description="Jadi yang pertama berbagi cerita liburanmu!" />
        )}

        <div className="masonry-grid">
          {posts.map((p) => (
            <div key={p.id} className="masonry-item">
              <PostCard post={p} />
            </div>
          ))}
        </div>

        {/* Infinite Scroll Trigger */}
        <div ref={observerTarget} className="flex flex-col items-center justify-center py-8 mt-4">
          {isFetchingNextPage ? (
            <>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-outline mt-2 font-semibold uppercase tracking-wider">Discovering more stories...</p>
            </>
          ) : hasNextPage ? (
            <p className="text-[12px] text-outline">Scroll untuk lebih banyak cerita</p>
          ) : posts.length > 0 ? (
            <p className="text-[12px] text-outline">Semua cerita sudah dimuat</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
