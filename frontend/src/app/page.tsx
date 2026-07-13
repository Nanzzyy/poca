"use client";

import { useRouter } from "next/navigation";
import { Search, MapPin, MessageCircle, Compass, Star, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useCategories } from "@/lib/queries";

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: cats } = useCategories();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28">
          <div className="flex items-center space-x-2 mb-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
              AI-Powered Travel Assistant
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Discover <span className="text-yellow-300">Indonesia</span>
            <br />with AI
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-lg">
            Explore destinations, plan trips, estimate budgets, and get local tips — all powered by smart AI.
          </p>

          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Where do you want to go? (e.g., Bali, Yogyakarta...)"
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && q && router.push(`/search?q=${encodeURIComponent(q)}`)}
            />
            {q && (
              <button
                onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Search
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: "Explore Map", desc: "Interactive map view", href: "/map", color: "from-blue-500 to-blue-600" },
            { icon: MessageCircle, label: "AI Chat", desc: "Ask travel questions", href: "/chat", color: "from-green-500 to-emerald-600" },
            { icon: Star, label: "Top Rated", desc: "Best destinations", href: "/search?q=&sort=rating", color: "from-yellow-500 to-orange-600" },
            { icon: Compass, label: "Plan Trip", desc: "Build itinerary", href: "/trips", color: "from-purple-500 to-violet-600" },
          ].map(({ icon: Icon, label, desc, href, color }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className="card-hover bg-white rounded-xl p-4 shadow-sm border text-left"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      {cats && (
        <section className="max-w-5xl mx-auto px-4 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Browse by Category</h2>
            <button onClick={() => router.push("/search")} className="text-sm text-blue-600 hover:underline flex items-center">
              See all <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/search?category=${c.id}`)}
                className="flex-shrink-0 px-5 py-2.5 bg-white rounded-full border shadow-sm text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 card-hover"
              >
                {c.icon && <span className="mr-1.5">{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 mt-10 mb-12">
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { value: "44+", label: "Destinations" },
            { value: "8", label: "Categories" },
            { value: "AI", label: "Powered" },
          ].map(({ value, label }) => (
            <div key={label} className="p-4">
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">Why Poca?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: "AI-Powered", desc: "Smart recommendations based on your preferences, not generic lists." },
              { icon: MapPin, title: "Interactive Map", desc: "Explore destinations visually with categorized markers and rich details." },
              { icon: Star, title: "Community Reviews", desc: "Read and write verified reviews with AI-generated summaries." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm border text-center card-hover">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
