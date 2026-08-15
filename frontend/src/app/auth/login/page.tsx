"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/lib/queries";
import { useAuthStore, useUIStore } from "@/stores";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      setAuthenticated(true);
      // Flush all query caches so user-specific data (profile, favorites,
      // liked posts, notifications) re-fetches with the new auth context.
      qc.clear();
      addToast("Berhasil masuk!", "success");
      router.push("/");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Login gagal", "error");
    }
  };

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Compass className="w-7 h-7 text-on-primary" />
          </div>
          <h1 className="text-headline-sm font-bold text-on-surface">Selamat Datang</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Masuk ke akun Poca</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body-sm font-medium text-on-surface mb-1.5">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 border border-outline-variant bg-surface-container-lowest rounded-xl text-body-md outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <label className="block text-body-sm font-medium text-on-surface mb-1.5">Password</label>
            <input
              type={showPw ? "text" : "password"}
              required
              className="w-full p-3 border border-outline-variant bg-surface-container-lowest rounded-xl text-body-md outline-none pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-[42px] text-on-surface-variant">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {login.isPending ? "Masuk..." : "Masuk"}
          </button>
        </form>
        <p className="text-center text-body-sm text-on-surface-variant mt-5">
          Belum punya akun?{" "}
          <button onClick={() => router.push("/auth/register")} className="text-primary hover:underline font-bold">
            Daftar
          </button>
        </p>
      </div>
    </div>
  );
}
