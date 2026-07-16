"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { usePosts } from "@/lib/feed-queries";
import { useProfile } from "@/lib/queries";
import { GridSkeleton } from "@/components/ui";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { PenSquare } from "lucide-react";

export default function FeedPage() {
  const router = useRouter();
  const { data: user } = useProfile();
  const { data, isLoading, error } = usePosts(1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feed Komunitas</h1>
        <p className="text-gray-500 text-sm mt-1">Cerita perjalanan dari traveler lain — bagikan momenmu</p>
      </div>

      {/* Composer — only for logged-in users */}
      {user ? (
        <PostComposer />
      ) : (
        <button
          onClick={() => router.push("/auth/login")}
          className="w-full bg-white border border-gray-100 rounded-3xl p-4 shadow-sm mb-6 flex items-center gap-3 hover:border-blue-200"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <PenSquare className="w-5 h-5" />
          </div>
          <span className="text-sm text-gray-500">Masuk untuk membagikan perjalananmu…</span>
        </button>
      )}

      {isLoading && <GridSkeleton count={3} />}

      {error && (
        <div className="text-center py-20 text-gray-500">
          <p>Belum bisa memuat feed. Coba lagi nanti.</p>
        </div>
      )}

      <div className="space-y-5">
        {data?.items.map((p) => <PostCard key={p.id} post={p} />)}
      </div>

      {data && data.items.length === 0 && !isLoading && (
        <div className="text-center py-20 text-gray-500">
          <p className="font-medium">Belum ada postingan</p>
          <p className="text-sm mt-1">Jadi yang pertama berbagi cerita liburanmu!</p>
        </div>
      )}
    </div>
  );
}
