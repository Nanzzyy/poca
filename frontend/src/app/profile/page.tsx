"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useProfile, useUserStats, useTrips, useAchievements, useLeaderboard } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { User, Trophy, Star, LogOut, MapPin, Sparkles, Compass, TrendingUp, Edit3, Share2, Search, Bell, Settings, Calendar, Lock, Plane, Medal, Heart } from "lucide-react";
import { useState } from "react";

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

const SAMPLE_TRIPS = [
  { name: "Tropical Seclusion: Maldives", date: "Dec 12 - Dec 19, 2024", status: "COMPLETED", tag: "LUXURY", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuALL37CTVmhltmLC64N3m59p9DggNJGfq2dx5eh1XdJepd2co4FsVgmLNVlLkn3AQQYIpXdFONHIVklcsJqDRPFFLngBSgNtCU2KV6YK8tE_LUkNDJkb3IN8FSVi_y0eI-NyeJSZ9dPvxMVTuwxmt6_4vGrOyoeRasVzvhp5In_qqXaeoUvhLcRn8Art88LEbuExzq3HtuL6oV0zA6FKfmqAiImV269aW693ZUHZcqU7NmPtA9gc-jj", statusColor: "bg-tertiary-container text-tertiary", tagColor: "bg-primary-container text-primary" },
  { name: "Neon Nights: Tokyo", date: "Mar 05 - Mar 14, 2025", status: "UPCOMING", tag: "CULTURE", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcLOAd374W3oSVEdi5T_8pG2HDM_hsCX3pFWZ3QGLuEnN79ZXZjTkmhAWsxUUQWdGrr7UDFdav-fakLHNlJ-anATDlZDh-wUWSQtVgFbdnD6ETagmuDyNpjlVWZ7kqUKPLbZRYD86Pb9wKe2GFFL0O2et75ozH1GfJrX_KFr_7QePQFYdql-LYcOfUY7v-rZ33aQvzzddm2L3tgIrSg__-cHYyYclkDDN5b7_GtE-Su619vKRf9YiI", statusColor: "bg-secondary/10 text-secondary", tagColor: "bg-primary-container text-primary" },
];

const LEADERBOARD = [
  { rank: 1, name: "Sarah J.", initials: "SJ", badges: 48, points: 124500, isYou: false },
  { rank: 14, name: "Alex Rivera (You)", initials: "AR", badges: 15, points: 98210, isYou: true },
  { rank: 15, name: "Marcus T.", initials: "MT", badges: 31, points: 95040, isYou: false },
];

export default function ProfilePage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { data: user } = useProfile();
  const { data: stats } = useUserStats();
  const { data: trips } = useTrips();
  const { data: achievements } = useAchievements();
  const { data: leaderboard } = useLeaderboard();
  const [tab, setTab] = useState("trips");

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
                {user.username[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-secondary text-on-primary p-1 px-2 rounded-lg shadow-md border-2 border-white">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[36px] font-bold text-on-surface">{user.username}</h1>
                <span className="bg-primary/10 px-2 py-[2px] rounded-full text-[11px] font-bold uppercase tracking-wider text-primary">ELITE EXPLORER</span>
              </div>
              <p className="text-[14px] text-on-surface-variant max-w-lg">{user.email} • Curating the world's most hidden gems.</p>
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
                    {(leaderboard && leaderboard.length > 0 ? leaderboard : LEADERBOARD).map((e: any, i) => (
                      <tr key={i} className={e.isYou || e.username === user.username ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-surface-container-low/30 transition-colors"}>
                        <td className={`px-5 py-4 font-bold ${e.rank <= 3 ? "text-secondary" : "text-on-surface-variant"}`}>#{e.rank || e.level}</td>
                        <td className="px-5 py-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {(e.username || e.name || "U")[0].toUpperCase()}
                          </div>
                          <span className={`text-[14px] ${e.isYou || e.username === user.username ? "font-bold text-primary" : "font-semibold"}`}>
                            {e.username}{e.isYou || e.username === user.username ? " (You)" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant">{e.achievements_count || e.badges}</td>
                        <td className="px-5 py-4 text-right font-bold">{e.xp_total || e.points?.toLocaleString()}</td>
                      </tr>
                    ))}
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
                  {(trips && trips.items?.length > 0 ? trips.items.slice(0, 2) : SAMPLE_TRIPS).map((t: any, i) => (
                    <div
                      key={i}
                      className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-3 hover:-translate-y-1 transition-all cursor-pointer group shadow-sm border border-secondary/10"
                      style={{ boxShadow: "inset 0 0 15px rgba(124, 58, 237, 0.05), 0 4px 6px -1px rgba(0,0,0,0.04)" }}
                    >
                      <div className="h-44 rounded-xl overflow-hidden relative">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={t.img || "https://placehold.co/400x300"} alt={t.name} />
                        <span className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2 py-1 rounded-full text-[11px] font-bold text-secondary flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 fill-current" /> Generated by Poca
                        </span>
                      </div>
                      <div className="px-1 pt-1">
                        <h3 className="text-[20px] font-semibold group-hover:text-primary transition-colors">{t.name}</h3>
                        <div className="flex items-center gap-1 text-on-surface-variant mt-1">
                          <Calendar className="w-[18px] h-[18px]" />
                          <span className="text-[12px]">{t.date || t.start_date}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 px-1 pb-1">
                        <span className={`px-2 py-[2px] ${t.statusColor || (t.status === "completed" ? "bg-tertiary-container text-tertiary" : "bg-secondary/10 text-secondary")} rounded-full text-[10px] font-bold`}>
                          {t.status || "COMPLETED"}
                        </span>
                        <span className={`px-2 py-[2px] ${t.tagColor || "bg-primary-container text-primary"} rounded-full text-[10px] font-bold`}>
                          {t.tag || (t.price_level === "luxury" ? "LUXURY" : "CULTURE")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab !== "trips" && (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="text-[14px]">Belum ada data</span>
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
                {(achievements && achievements.length > 0 ? achievements.slice(0, 4) : BADGES).map((a: any, i) => {
                  const locked = a.locked;
                  return (
                    <div key={i} className={`flex flex-col items-center text-center p-3 bg-surface-container-low rounded-xl gap-1 group cursor-default ${locked ? "opacity-50 grayscale" : "hover:bg-primary/5 transition-colors"}`}>
                      <div className={`w-14 h-14 rounded-full ${locked ? "bg-surface-container-highest" : "bg-primary/10"} flex items-center justify-center mb-1 ring-4 ring-white shadow-sm ${!locked && "group-hover:scale-110 transition-transform"}`}>
                        {locked ? <Lock className="w-5 h-5 text-on-surface-variant" /> : <Trophy className="w-6 h-6 text-primary" />}
                      </div>
                      <span className="text-[14px] font-bold">{a.name}</span>
                      <span className="text-[10px] text-on-surface-variant">{a.desc || a.description}</span>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-4 py-3 rounded-xl border border-dashed border-outline text-on-surface-variant text-[12px] hover:bg-surface-container-low hover:text-primary hover:border-primary transition-all">
                View All {(achievements?.length || "15")} Achievements
              </button>
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
