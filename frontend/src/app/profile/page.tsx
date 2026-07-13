"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useProfile, useUserStats, useTrips, useAchievements, useLeaderboard } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { User, Trophy, Star, Briefcase, LogOut, Medal, Compass } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <User className="w-16 h-16 mb-4 text-gray-300" />
        <p className="mb-4">Sign in to view your profile</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.username}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center space-x-1 mt-1">
              <Medal className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Level {stats?.level || 1}</span>
              <span className="text-xs text-gray-400">• {stats?.xp_total || 0} XP</span>
            </div>
          </div>
          <button onClick={() => { logout(); router.push("/"); }} className="ml-auto p-2 text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Star, label: "Reviews", value: stats?.reviews_count || 0 },
          { icon: Briefcase, label: "Trips", value: stats?.trips_count || 0 },
          { icon: Trophy, label: "Achievements", value: stats?.achievements_count || 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border text-center">
            <Icon className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-3 flex items-center">
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" /> Achievements
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{a.name}</p>
                <p className="text-xs text-gray-500">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trips */}
      {trips && trips.items.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-3 flex items-center">
            <Briefcase className="w-5 h-5 text-blue-600 mr-2" /> Recent Trips
          </h2>
          <div className="space-y-2">
            {trips.items.slice(0, 5).map((t) => (
              <div key={t.id} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => router.push(`/trips/${t.id}`)}>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.status} • {t.days?.length || 0} days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold mb-3">🏆 Leaderboard</h2>
          <div className="space-y-1">
            {leaderboard.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-2 text-sm">
                <span className="text-gray-400 w-6">{i + 1}.</span>
                <span className="font-medium flex-1">{e.username}</span>
                <span className="text-gray-500">Lvl {e.level}</span>
                <span className="text-blue-600 ml-2">{e.xp_total} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
