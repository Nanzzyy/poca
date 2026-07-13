"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/lib/queries";
import { useAuthStore } from "@/stores";
import { Compass } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("demo@poca.app");
  const [password, setPassword] = useState("demo123");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login.mutateAsync({ email, password });
      setToken(result.access_token);
      router.push("/");
    } catch (err) {
      alert("Login failed. Check your credentials.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Compass className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to Poca</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {login.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{" "}
          <button onClick={() => router.push("/auth/register")} className="text-blue-600 hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
