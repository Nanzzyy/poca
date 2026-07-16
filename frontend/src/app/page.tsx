"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, MapPin, MessageCircle, Compass, Star, Sparkles, ArrowRight, TrendingUp, Heart } from "lucide-react";
import { useState } from "react";
import { useCategories } from "@/lib/queries";
import { CategoryIcon } from "@/components/ui";
import { fadeInUp, staggerContainer, item } from "@/lib/animations";

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: cats } = useCategories();

  return (
    <div>
      {/* Hero with animated gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white animate-gradient">
        {/* Floating decorative blobs */}
        <motion.div
          className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-48 h-48 bg-yellow-300/10 rounded-full blur-3xl"
          animate={{ y: [0, -15, 0], x: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={item} className="flex items-center space-x-2 mb-5">
              <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs font-medium flex items-center">
                <Sparkles className="w-3 h-3 mr-1" /> AI-Powered Travel Companion
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-4xl md:text-6xl font-bold mb-4 leading-[1.1]"
            >
              Bingung mau liburan
              <br />
              <span className="text-yellow-300">ke mana?</span>
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-blue-100 mb-8 max-w-lg leading-relaxed">
              Temukan solusi praktis liburanmu di satu tempat — rekomendasi destinasi, rencana perjalanan, dan budget otomatis dengan AI.
            </motion.p>

            {/* Search */}
            <motion.div variants={item} className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari destinasi... (Bali, Yogyakarta, Raja Ampat)"
                className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white text-gray-900 shadow-2xl focus:outline-none focus:ring-4 focus:ring-yellow-400/50 text-base placeholder:text-gray-400"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/search?q=${encodeURIComponent(q)}`)}
              />
              <button
                onClick={() => q && router.push(`/search?q=${encodeURIComponent(q)}`)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Cari
              </button>
            </motion.div>

            {/* Stats inline */}
            <motion.div variants={item} className="flex items-center space-x-6 mt-8 text-sm">
              <div className="flex items-center">
                <span className="text-2xl font-bold">44+</span>
                <span className="text-blue-200 ml-1.5">Destinasi</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center">
                <span className="text-2xl font-bold">8</span>
                <span className="text-blue-200 ml-1.5">Kategori</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center">
                <span className="text-2xl font-bold">AI</span>
                <span className="text-blue-200 ml-1.5">Assistant</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0]">
          <svg className="block w-full h-[60px] md:h-[80px]" preserveAspectRatio="none" viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 30 1380 25L1440 20V80H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            { icon: MapPin, label: "Jelajah Peta", desc: "Peta interaktif", href: "/map", color: "from-blue-500 to-cyan-600" },
            { icon: MessageCircle, label: "Tanya AI", desc: "Asisten perjalanan", href: "/chat", color: "from-emerald-500 to-teal-600" },
            { icon: Star, label: "Rating Tertinggi", desc: "Destinasi terbaik", href: "/search", color: "from-amber-500 to-orange-600" },
            { icon: Compass, label: "Rencanakan Trip", desc: "Buat itinerary", href: "/trips", color: "from-purple-500 to-fuchsia-600" },
          ].map(({ icon: Icon, label, desc, href, color }) => (
            <motion.button
              key={label}
              variants={item}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(href)}
              className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 text-left"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* Poster announcement banner */}
      <section className="max-w-5xl mx-auto px-4 mt-12">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 p-8 md:p-10 text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-medium mb-3 inline-block">
                ✨ Promo Spesial
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Liburan impian, sekarang lebih mudah
              </h2>
              <p className="text-white/80 max-w-md">
                Rencanakan, budgetkan, dan jelajahi — semua dalam satu platform. Gratis, tanpa ribet.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/chat")}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-pink-600 rounded-xl font-semibold shadow-lg whitespace-nowrap"
            >
              <span>Mulai Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      {cats && cats.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Jelajah per Kategori</h2>
            <button onClick={() => router.push("/search")} className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              Lihat semua <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {cats.map((c) => (
              <motion.button
                key={c.id}
                variants={item}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(`/search?category=${c.id}`)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center hover:border-blue-200 transition-colors"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mb-2 text-blue-600">
                  <CategoryIcon name={c.icon} className="w-6 h-6" />
                </div>
                <p className="font-medium text-gray-900 text-sm">{c.name}</p>
              </motion.button>
            ))}
          </motion.div>
        </section>
      )}

      {/* Features */}
      <section className="bg-gradient-to-b from-transparent to-blue-50/50 py-16 mt-16">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Kenapa Poca?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Platform liburan all-in-one dengan AI yang bikin perencanaan jadi menyenangkan
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { icon: Sparkles, title: "AI-Powered", desc: "Rekomendasi cerdas berdasarkan preferensimu, bukan daftar generik.", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: MapPin, title: "Peta Interaktif", desc: "Jelajahi destinasi secara visual dengan marker berwarna per kategori.", color: "text-purple-600", bg: "bg-purple-50" },
              { icon: Heart, title: "Review Komunitas", desc: "Baca dan tulis review terverifikasi dengan ringkasan AI otomatis.", color: "text-rose-600", bg: "bg-rose-50" },
              { icon: TrendingUp, title: "Budget Otomatis", desc: "Estimasi biaya akurat per kategori — akomodasi, makan, transportasi.", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Compass, title: "Trip Planner", desc: "Susun itinerary harian dengan optimasi rute otomatis.", color: "text-amber-600", bg: "bg-amber-50" },
              { icon: Star, title: "Local Guide", desc: "Tips kuliner, adat istiadat, dan hidden gems dari lokal.", color: "text-cyan-600", bg: "bg-cyan-50" },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <motion.div
                key={title}
                variants={item}
                whileHover={{ y: -6 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-10 md:p-14 text-center text-white"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.3),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap memulai petualangan?</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Gabung sekarang — gratis. Buat trip pertamamu dalam hitungan menit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/auth/register")}
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-semibold shadow-lg"
              >
                Daftar Gratis
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/search")}
                className="px-8 py-3 bg-white/10 backdrop-blur text-white border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Jelajah Dulu
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
