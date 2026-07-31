"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useNotifications, useMarkAllRead, useProfile } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { Bell, Bot, UserPlus, Heart, MessageSquare, Trophy, Calendar, Sparkles, CheckCheck } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

const TYPE_ICON: Record<string, { icon: any; bg: string }> = {
  follow: { icon: UserPlus, bg: "bg-primary/10" },
  like: { icon: Heart, bg: "bg-primary/10" },
  comment: { icon: MessageSquare, bg: "bg-secondary/10" },
  achievement: { icon: Trophy, bg: "bg-tertiary/10" },
  trip: { icon: Calendar, bg: "bg-primary/10" },
  ai: { icon: Bot, bg: "bg-secondary-container" },
};

const routeFor = (n: AppNotification) => {
  if (n.type === "like" || n.type === "comment") return `/feed/${n.meta?.post_id || ""}`;
  if (n.type === "follow") return n.meta?.follower_id ? `/profile/${n.meta.follower_id}` : "/feed";
  if (n.type === "trip") return n.meta?.trip_id ? `/trips/${n.meta.trip_id}` : "/trips";
  if (n.type === "achievement") return "/profile";
  return "/notifications";
};

export default function NotificationsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { data: user } = useProfile();
  const { data: notifications } = useNotifications();
  const markRead = useMarkAllRead();

  if (!token) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center h-screen">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg">
          <Bell className="w-8 h-8 text-on-primary" />
        </div>
        <p className="mb-4 text-body-md text-on-surface-variant">Masuk untuk melihat notifikasi</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  const items = notifications || [];

  return (
    <div className="pt-16 bg-background text-on-surface min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-bold text-on-surface">Notifications</h1>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              {user ? `Halo ${user.username}, ${items.filter(n => !n.is_read).length} notifikasi belum dibaca` : "Aktivitas terbarumu"}
            </p>
          </div>
          <button
            onClick={() => markRead.mutate()}
            className="flex items-center gap-1.5 text-primary font-bold text-[13px] hover:underline active:scale-95 transition-all"
          >
            <CheckCheck className="w-4 h-4" /> Tandai dibaca
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            <Bell className="w-12 h-12 mx-auto mb-3 text-outline/40" />
            <p className="font-bold text-on-surface text-[16px]">Belum ada notifikasi</p>
            <p className="text-[13px] mt-1">Suka, komentar, dan follow akan muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const conf = TYPE_ICON[n.type] || { icon: Sparkles, bg: "bg-surface-container" };
              const Icon = conf.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => router.push(routeFor(n))}
                  className={`p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${n.is_read ? "bg-surface-container-lowest/60 border-outline-variant/20 opacity-80" : "bg-surface-container-lowest border-outline-variant/30"}`}
                >
                  <div className="flex gap-4">
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-full ${conf.bg} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {!n.is_read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[14px] leading-snug">
                          <span className="font-bold">{n.actor_username || "Poca"}</span>{" "}
                          <span className="text-on-surface-variant">{n.title.replace(n.actor_username || "", "").trim()}</span>
                        </p>
                        <span className="text-[10px] text-outline font-medium flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.subtitle && <p className="text-[12px] text-on-surface-variant mt-1 line-clamp-1">{n.subtitle}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
