"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePublicProfile, useToggleFollow, useUserPosts, useProfile } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { ArrowLeft, User, UserPlus, UserCheck, MapPin, Heart, Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { data: me } = useProfile();
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: posts } = useUserPosts(id);
  const toggleFollow = useToggleFollow();
  const [following, setFollowing] = useState<boolean | null>(null);

  const isFollowing = following ?? profile?.is_following ?? false;

  const onFollow = async () => {
    if (!token) return router.push("/auth/login");
    const next = !isFollowing;
    setFollowing(next);
    try {
      const res = await toggleFollow.mutateAsync(id);
      setFollowing(res.following);
    } catch {
      setFollowing(profile?.is_following ?? false);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-16 min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-on-surface-variant">Profil tidak ditemukan</p>
        <button onClick={() => router.push("/")} className="text-primary font-bold">Kembali ke Beranda</button>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-background text-on-surface min-h-screen">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[14px] font-semibold">Kembali</span>
        </button>

        {/* Header */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary border-4 border-white shadow-md">
              {profile.username[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[24px] font-bold">{profile.username}</h1>
                <span className="bg-primary/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">Level {profile.level}</span>
              </div>
              <p className="text-[12px] text-on-surface-variant mt-0.5">Bergabung {new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
              <div className="flex items-center gap-4 mt-2 text-[12px] text-on-surface-variant">
                <span><b className="text-on-surface">{profile.followers_count}</b> Pengikut</span>
                <span><b className="text-on-surface">{profile.following_count}</b> Mengikuti</span>
                <span><b className="text-on-surface">{profile.posts_count}</b> Postingan</span>
              </div>
            </div>
            {!profile.is_self && (
              <button
                onClick={onFollow}
                disabled={toggleFollow.isPending}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${
                  isFollowing ? "bg-surface-container text-on-surface border border-outline-variant" : "bg-primary text-on-primary"
                }`}
              >
                {isFollowing ? <><UserCheck className="w-4 h-4" /> Mengikuti</> : <><UserPlus className="w-4 h-4" /> Ikuti</>}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/20">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Star className="w-4 h-4" /></div>
            <div><p className="text-[18px] font-bold">{profile.reviews_count}</p><p className="text-[11px] text-on-surface-variant">Review</p></div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/20">
            <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><MapPin className="w-4 h-4" /></div>
            <div><p className="text-[18px] font-bold">{profile.trips_count}</p><p className="text-[11px] text-on-surface-variant">Trip</p></div>
          </div>
        </div>

        {/* Posts */}
        <h2 className="text-[18px] font-bold mt-6 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" /> Postingan
        </h2>
        {posts && posts.items.length > 0 ? (
          <div className="space-y-3">
            {posts.items.map((p: any) => (
              <div key={p.id} onClick={() => router.push(`/feed/${p.id}`)} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 hover:shadow-md transition-all cursor-pointer">
                {p.media?.[0]?.url && (
                  <div className="h-40 rounded-lg overflow-hidden mb-3">
                    {p.media[0].type === "video" ? (
                      <video src={p.media[0].url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={p.media[0].url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <p className="text-[14px] leading-relaxed">{p.content}</p>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-on-surface-variant">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.like_count}</span>
                  <span>{timeAgo(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-on-surface-variant text-[13px]">
            <User className="w-10 h-10 mx-auto mb-2 text-outline/40" />
            Belum ada postingan
          </div>
        )}
      </div>
    </div>
  );
}
