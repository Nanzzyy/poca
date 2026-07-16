"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useProfile, useUserStats, useTrips, useAchievements, useLeaderboard } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { User, Trophy, Star, Briefcase, LogOut, Medal, Compass, MapPin, Sparkles, TrendingUp } from "lucide-react";

const XP_PER_LEVEL = 500;

export default function ProfilePage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { data: user } = useProfile();
  const { data: stats } = useUserStats();
  const { data: trips } = useTrips();
  const { data: achievements } = useAchievements();
  const { data: leaderboard } = useLeaderboard();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <User className="w-16 h-16 mb-4 text-gray-300" />
        <p className="mb-4">Masuk untuk melihat profilmu</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium">
          Masuk
        </button>
      </div>
    );
  }

  const level = stats?.level || 1;
  const xp = stats?.xp_total || 0;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpPct = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));

  const statCards = [
    { icon: Star, label: "Reviews", value: stats?.reviews_count || 0, color: "text-amber-500", bg: "bg-amber-50" },
    { icon: Briefcase, label: "Trips", value: stats?.trips_count || 0, color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Trophy, label: "Achievements", value: stats?.achievements_count || 0, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header with gradient cover */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-b-3xl" />
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>

        <div className="px-4 -mt-12">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
              {user.username[0].toUpperCase()}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{user.username}</h1>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Level + XP bar */}
          <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                <Medal className="w-4 h-4 text-yellow-500" /> Level {level}
              </span>
              <span className="text-xs text-gray-400">{xpInLevel}/{XP_PER_LEVEL} XP menuju Level {level + 1}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <motion.div
            key={label}
            whileHover={{ y: -3 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <Section icon={Trophy} iconColor="text-yellow-500" title="Achievements">
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((a) => (
                <div key={a.id} className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-yellow-600" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900 leading-tight">{a.name}</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{a.description}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recent trips */}
        <Section icon={Compass} iconColor="text-blue-500" title="Trip Terbaru">
          {trips && trips.items.length > 0 ? (
            <div className="space-y-2">
              {trips.items.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/trips/${t.id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{t.name}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{t.status} · {t.days?.length || 0} hari</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyHint text="Belum ada trip. Mulai rencanakan liburanmu!" cta="Buat trip" onClick={() => router.push("/trips")} />
          )}
        </Section>

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <Section icon={TrendingUp} iconColor="text-emerald-500" title="Papan Peringkat">
            <div className="space-y-1">
              {leaderboard.slice(0, 5).map((e, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded-lg ${e.username === user.username ? "bg-blue-50" : ""}`}
                >
                  <span className={`w-6 text-center font-bold text-sm ${i < 3 ? "text-yellow-500" : "text-gray-400"}`}>
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                    {e.username[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-sm text-gray-900 flex-1 truncate">{e.username}</span>
                  <span className="text-xs text-gray-400">Lvl {e.level}</span>
                  <span className="text-xs font-semibold text-blue-600">{e.xp_total} XP</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  icon: Icon, iconColor, title, children,
}: {
  icon: typeof Trophy; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
        <Icon className={`w-4 h-4 ${iconColor} mr-2`} /> {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyHint({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="text-center py-4">
      <p className="text-xs text-gray-400 mb-2">{text}</p>
      <button onClick={onClick} className="text-xs font-medium text-blue-600 hover:underline">{cta} →</button>
    </div>
  );
}
