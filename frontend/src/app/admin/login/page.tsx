"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/lib/queries";
import { useAuthStore, useUIStore } from "@/stores";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, LogIn } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useLogin();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login.mutateAsync({ email, password });
      qc.clear();
      // Cek role — redirect admin, reject non-admin
      if (result.role !== "admin") {
        addToast("Akses ditolak. Hanya admin yang bisa masuk.", "error");
        return;
      }
      setAuthenticated(true);
      addToast("Selamat datang, Admin!", "success");
      router.push("/admin/dashboard");
    } catch {
      addToast("Login gagal", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-container-low">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Shield className="w-7 h-7 text-on-primary" />
          </div>
          <h1 className="text-headline-sm font-bold text-on-surface">Admin Poca</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Masuk dengan akun administrator</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="Email admin" className="w-full p-3 border border-outline-variant bg-surface-container-lowest rounded-xl text-body-md outline-none focus:ring-2 focus:ring-primary/20" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full p-3 border border-outline-variant bg-surface-container-lowest rounded-xl text-body-md outline-none focus:ring-2 focus:ring-primary/20" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={login.isPending} className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> {login.isPending ? "Masuk..." : "Masuk Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
