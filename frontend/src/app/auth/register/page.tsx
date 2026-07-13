"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegister } from "@/lib/queries";
import { useAuthStore } from "@/stores";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const setToken = useAuthStore((s) => s.setToken);
  const [form, setForm] = useState({ email: "", username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register.mutateAsync(form);
      setToken(result.access_token);
      router.push("/");
    } catch (err) {
      alert("Registration failed.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="w-full p-2.5 border rounded-lg text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" required className="w-full p-2.5 border rounded-lg text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required className="w-full p-2.5 border rounded-lg text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" disabled={register.isPending} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {register.isPending ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <button onClick={() => router.push("/auth/login")} className="text-blue-600 hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );
}
