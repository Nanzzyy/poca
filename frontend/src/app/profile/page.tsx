"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useProfile, useUserStats, useTrips, useAchievements, useLeaderboard, useMyFavorites, useMyReviews, useMyAchievements } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { User, Trophy, Star, LogOut, MapPin, Sparkles, Compass, TrendingUp, Edit3, Share2, Search, Bell, Settings, Calendar, Lock, Plane, Medal, Heart, MapIcon } from "lucide-react";
import { useState } from "react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { destImage } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardFallbackRow } from "@/types";

const BADGES = [
  { icon: Plane, label: "First Flight", desc: "Completed 1st Trip", color: "primary", locked: false },
  { icon: Sparkles, label: "AI Native", desc: "5 AI Plans Used", color: "secondary", locked: false },
  { icon: Star, label: "Gourmet", desc: "10 Foodie Reviews", color: "tertiary", locked: false },
  { icon: Lock, label: "World Citizen", desc: "Visit 5 Continents", color: "on-surface-variant", locked: true },
];

const ACTIVITY_LOG = [
  { icon: Star, label: "Reviewed", target: "The Ritz-Carlton, Kyoto", time: "2 hours ago", color: "bg-primary" },
  { icon: Sparkles, label: "Earned", target: '"AI Native" Badge', time: "Yesterday", color: "bg-secondary" },
  { icon: Heart, label: "Saved", target: '"Nordic Lights Expedition"', time: "3 days ago", color: "bg-tertiary" },
];

const LEADERBOARD: LeaderboardFallbackRow[] = [
  { rank: 1, name: "Sarah J.", badges: 48, points: 124500, isYou: false },
  { rank: 14, name: "Alex Rivera (You)", badges: 15, points: 98210, isYou: true },
  { rank: 15, name: "Marcus T.", badges: 31, points: 95040, isYou: false },
];

export default function ProfilePage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { data: user } = useProfile();
  const { data: stats } = useUserStats();
  const { data: trips } = useTrips();
  const { data: achievements } = useAchievements();
  const { data: leaderboard } = useLeaderboard();
  const { data: savedDests } = useMyFavorites();
  const { data: myReviews } = useMyReviews();
  const { data: myAchievements } = useMyAchievements();
  const [tab, setTab] = useState("trips");
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Map achievement code -> unlocked_at
  const earnedMap = new Map<string, string>();
  myAchievements?.forEach((ua) => {
    if (ua.achievement?.code) earnedMap.set(ua.achievement.code, ua.unlocked_at);
  });

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center h-screen">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg">
          <User className="w-8 h-8 text-on-primary" />
        </div>
        <p className="mb-4 text-body-md text-on-surface-variant">Masuk untuk melihat profilmu</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  const level = stats?.level || 1;
  const xp = stats?.xp_total || 0;
  const xpPct = Math.min(100, Math.round(((xp % 500) / 500) * 100));

  return (
    <div className="pt-16 bg-background text-on-surface min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-8">
        {/* ═══ HEADER ═══ */}
        <header className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-8 flex items-center gap-6">
            <div className="relative">
              <div className="h-32 w-32 rounded-3xl overflow-hidden shadow-md border-4 border-white bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-secondary text-on-primary p-1 px-2 rounded-lg shadow-md border-2 border-white">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[36px] font-bold text-on-surface flex items-center gap-1.5">
                  {user.username}
                  {user.is_verified && <VerifiedBadge className="w-5 h-5" />}
                </h1>
                <span className="bg-primary/10 px-2 py-[2px] rounded-full text-[11px] font-bold uppercase tracking-wider text-primary">ELITE EXPLORER</span>
              </div>
              <div className="text-[14px] text-on-surface-variant max-w-lg space-y-1">
                {(() => {
                  const p = (user.preferences ?? {}) as { bio?: string; location?: string; website?: string };
                  const bits = [p.bio, [p.location, p.website].filter(Boolean).join(" · ")].filter(Boolean);
                  return bits.length ? bits.map((b, i) => <p key={i}>{b}</p>) : <p>{user.email}</p>;
                })()}
              </div>
              <div className="mt-3 w-full max-w-md">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] font-bold uppercase text-on-surface-variant">XP LEVEL {level}</span>
                  <span className="text-[11px] font-bold text-primary">{(xp % 500)} / 500 XP</span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-4 flex justify-end gap-3 pb-1">
            <button
              onClick={() => router.push("/profile/edit")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-all active:scale-95 shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-[14px] font-semibold">Edit Profile</span>
            </button>
            <button
              onClick={() => { if (navigator.share) navigator.share({ title: 'Poca Profile', url: window.location.href }); else navigator.clipboard.writeText(window.location.href); }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary hover:brightness-110 transition-all active:scale-95 shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-[14px] font-semibold">Share</span>
            </button>
            <button
              onClick={() => { void logout(); }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-error/30 bg-surface-container-lowest text-error hover:bg-error/5 transition-all active:scale-95 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[14px] font-semibold">Keluar</span>
            </button>
          </div>
        </header>

        {/* ═══ STATISTICS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Star, label: "Reviews Written", value: stats?.reviews_count || 128, color: "primary", bgColor: "bg-primary/10", iconColor: "text-primary" },
            { icon: Compass, label: "Trips Planned", value: stats?.trips_count || 42, color: "secondary", bgColor: "bg-secondary/10", iconColor: "text-secondary" },
            { icon: Trophy, label: "Achievements", value: stats?.achievements_count || 15, color: "tertiary", bgColor: "bg-tertiary/10", iconColor: "text-tertiary" },
          ].map(({ icon: Icon, label, value, bgColor, iconColor }) => (
            <div key={label} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant flex flex-col items-center text-center gap-2">
              <div className={`${bgColor} p-4 rounded-xl mb-1`}>
                <Icon className={`w-7 h-7 ${iconColor}`} />
              </div>
              <span className="text-[28px] font-bold">{value}</span>
              <span className="text-[12px] text-on-surface-variant font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* ═══ MAIN CONTENT: 8/4 COL ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COL (8) */}
          <div className="md:col-span-8 flex flex-col gap-6">
            {/* Leaderboard */}
            <section className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center">
                <h2 className="text-[20px] font-semibold">Global Explorer Leaderboard</h2>
                <span className="text-primary text-[12px] font-bold cursor-pointer hover:underline">View All</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-container-low text-[11px] font-bold uppercase text-on-surface-variant text-left">
                    <tr>
                      <th className="px-5 py-4">Rank</th>
                      <th className="px-5 py-4">Explorer</th>
                      <th className="px-5 py-4">Badges</th>
                      <th className="px-5 py-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {(leaderboard && leaderboard.length > 0 ? leaderboard : LEADERBOARD).map((e, i) => {
                      const fb = e as LeaderboardFallbackRow;
                      const entry = e as LeaderboardEntry;
                      const name = fb.name ?? entry.username ?? "";
                      const rank = fb.rank ?? entry.level ?? 0;
                      const badges = fb.badges ?? entry.achievements_count ?? 0;
                      const points = fb.points ?? entry.xp_total ?? 0;
                      const isYou = fb.isYou ?? entry.username === user.username;
                      return (
                      <tr key={i} className={isYou ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-surface-container-low/30 transition-colors"}>
                        <td className={`px-5 py-4 font-bold ${rank <= 3 ? "text-secondary" : "text-on-surface-variant"}`}>#{rank}</td>
                        <td className="px-5 py-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {(name || "U")[0].toUpperCase()}
                          </div>
                          <span className={`text-[14px] ${isYou ? "font-bold text-primary" : "font-semibold"}`}>
                            {name}{isYou ? " (You)" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant">{badges}</td>
                        <td className="px-5 py-4 text-right font-bold">{points.toLocaleString()}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Tabs & Trips */}
            <div className="flex flex-col gap-4">
              <div className="flex border-b border-outline-variant gap-6">
                {["trips", "saved", "reviews"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`pb-3 text-[14px] capitalize transition-all ${
                      tab === t ? "text-primary font-bold border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {t === "trips" ? "My Trips" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {tab === "trips" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(trips && trips.items?.length > 0 ? trips.items : []).length === 0 && (
                    <div className="col-span-full text-center py-10 text-on-surface-variant text-[13px]">
                      <Plane className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Belum ada trip. Setujui rencana dari AI Assistant untuk menyimpan.
                    </div>
                  )}
                  {(trips && trips.items?.length > 0 ? trips.items : []).map((t, i) => {
                    const STATUS_LABEL: Record<string, string> = { draft: "Draf", planned: "Direncanakan", active: "Berjalan", completed: "Selesai" };
                    const STATUS_COLOR: Record<string, string> = { draft: "bg-surface-container-high text-on-surface-variant", planned: "bg-secondary/10 text-secondary", active: "bg-tertiary/10 text-tertiary", completed: "bg-tertiary-container text-tertiary" };
                    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
                    const dateRange = fmtDate(t.start_date) ? (fmtDate(t.end_date) && fmtDate(t.start_date) !== fmtDate(t.end_date) ? `${fmtDate(t.start_date)} – ${fmtDate(t.end_date)}` : fmtDate(t.start_date)) : "Belum dijadwalkan";
                    const dayCount = t.days?.length || 0;
                    return (
                      <div
                        key={t.id || i}
                        onClick={() => router.push(`/trips/${t.id}`)}
                        className="bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all cursor-pointer group shadow-sm border border-secondary/10"
                      >
                        <div className="h-32 relative bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <Plane className="w-10 h-10 text-white/40 group-hover:scale-110 transition-transform" />
                          <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_COLOR[t.status] || STATUS_COLOR.planned}`}>
                            {STATUS_LABEL[t.status] || t.status}
                          </span>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                          <h3 className="text-[18px] font-semibold group-hover:text-primary transition-colors line-clamp-2">{t.name}</h3>
                          <div className="flex items-center gap-1 text-on-surface-variant">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[12px]">{dateRange}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-on-surface-variant">
                            {dayCount > 0 && <span className="flex items-center gap-1"><Compass className="w-4 h-4" />{dayCount} hari</span>}
                            {t.total_budget ? <span className="flex items-center gap-1"><Trophy className="w-4 h-4" />Rp{(t.total_budget).toLocaleString("id-ID")}</span> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "saved" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedDests && savedDests.length > 0 ? savedDests.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => router.push(`/destination/${d.id}`)}
                      className="bg-surface-container-lowest rounded-2xl overflow-hidden hover:-translate-y-1 transition-all cursor-pointer group shadow-sm border border-outline-variant/20"
                    >
                      <div className="h-36 overflow-hidden">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={destImage(d.images, d.name)} alt={d.name} />
                      </div>
                      <div className="p-4">
                        <h3 className="text-[16px] font-semibold group-hover:text-primary transition-colors">{d.name}</h3>
                        <p className="text-[12px] text-on-surface-variant">{d.city}{d.city && d.country ? ", " : ""}{d.country}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[12px] text-yellow-600">★ {d.rating_avg.toFixed(1)}</span>
                          <span className="text-[10px] text-outline">({d.review_count} reviews)</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-12 text-on-surface-variant">
                      <Heart className="w-10 h-10 mx-auto mb-3 text-outline/40" />
                      <p className="text-[14px]">Belum ada destinasi tersimpan</p>
                      <button onClick={() => router.push("/search")} className="mt-2 text-primary text-[12px] font-bold hover:underline">Jelajahi destinasi</button>
                    </div>
                  )}
                </div>
              )}

              {tab === "reviews" && (
                <div className="space-y-4">
                  {myReviews && myReviews.items?.length > 0 ? myReviews.items.map((r) => (
                    <div
                      key={r.id}
                      className="bg-surface-container-lowest rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow border border-outline-variant/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] text-yellow-600">
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                          </span>
                          <span className="text-[10px] text-outline">{r.rating}/5</span>
                        </div>
                        {r.destination_name && (
                          <p className="text-[10px] text-primary font-bold mb-1">{r.destination_name}</p>
                        )}
                        {r.title && <h4 className="text-[16px] font-semibold mb-1">{r.title}</h4>}
                        {r.content && <p className="text-[12px] text-on-surface-variant line-clamp-2">{r.content}</p>}
                        <p className="text-[10px] text-outline mt-2">{new Date(r.created_at).toLocaleDateString("id-ID")}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-on-surface-variant">
                      <Star className="w-10 h-10 mx-auto mb-3 text-outline/40" />
                      <p className="text-[14px]">Belum ada review</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COL (4) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            {/* Badges & Achievements */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant">
              <h2 className="text-[20px] font-semibold mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-secondary fill-current" />
                Badges & Achievements
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(achievements && achievements.length > 0
                  ? (showAllAchievements ? achievements : achievements.slice(0, 4))
                  : BADGES
                ).map((a, i) => {
                  const achievement = a as { code?: string; name?: string; description?: string; label?: string; desc?: string };
                  const code = achievement.code ?? "";
                  const unlocked = earnedMap.has(code);
                  const name = achievement.name ?? achievement.label ?? "";
                  const description = achievement.description ?? achievement.desc ?? "";
                  return (
                    <div
                      key={code || i}
                      className={`flex flex-col items-center text-center p-3 bg-surface-container-low rounded-xl gap-1 group cursor-default ${unlocked ? "" : "opacity-50 grayscale"}`}
                    >
                      <div className={`w-14 h-14 rounded-full ${unlocked ? "bg-primary/10" : "bg-surface-container-highest"} flex items-center justify-center mb-1 ring-4 ring-white shadow-sm ${unlocked && "group-hover:scale-110 transition-transform"}`}>
                        {unlocked ? <Trophy className="w-6 h-6 text-primary" /> : <Lock className="w-5 h-5 text-on-surface-variant" />}
                      </div>
                      <span className="text-[14px] font-bold">{name}</span>
                      <span className="text-[10px] text-on-surface-variant">{description}</span>
                      {unlocked && <span className="text-[8px] text-primary font-bold">✓ Diperoleh</span>}
                    </div>
                  );
                })}
              </div>
              {achievements && achievements.length > 4 && (
                <button
                  onClick={() => setShowAllAchievements(!showAllAchievements)}
                  className="w-full mt-4 py-3 rounded-xl border border-dashed border-outline text-on-surface-variant text-[12px] hover:bg-surface-container-low hover:text-primary hover:border-primary transition-all"
                >
                  {showAllAchievements ? "Tampilkan lebih sedikit" : `View All ${achievements.length} Achievements`}
                </button>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant">
              <h2 className="text-[20px] font-semibold mb-4">Recent Activity</h2>
              <div className="relative flex flex-col gap-4" style={{ position: "relative" }}>
                <div className="absolute left-[18px] top-[40px] bottom-0 w-[2px] bg-[repeating-linear-gradient(to_bottom,#c3c6d7_0,#c3c6d7_4px,transparent_4px,transparent_8px)]" style={{ zIndex: 0 }} />
                {ACTIVITY_LOG.map((item, i) => (
                  <div key={i} className="relative pl-10 z-10">
                    <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full ${item.color} ring-4 ring-white shadow-sm`} />
                    <p className="text-[14px]"><span className="font-bold">{item.label}</span> {item.target}</p>
                    <span className="text-[10px] text-on-surface-variant">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
