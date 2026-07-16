"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
  emoji: string;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    eyebrow: "Poca Journey",
    title: "Bingung mau liburan ke mana?",
    subtitle: "Temukan solusi praktis liburanmu di satu tempat — rekomendasi destinasi, rencana perjalanan, dan budget otomatis.",
    cta: "Mulai Jelajah",
    href: "/search",
    gradient: "from-blue-600 via-indigo-600 to-purple-700",
    emoji: "🌴",
  },
  {
    id: "2",
    eyebrow: "AI Travel Assistant",
    title: "Tanya AI, langsung dapat jawaban",
    subtitle: "Asisten AI siap bantu rekomendasi destinasi, estimasi biaya, sampai tips kuliner lokal — gratis, tanpa ribet.",
    cta: "Ngobrol sama AI",
    href: "/chat",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    emoji: "✨",
  },
  {
    id: "3",
    eyebrow: "Interactive Map",
    title: "Jelajahi Indonesia lewat peta",
    subtitle: "Lihat semua destinasi di peta interaktif dengan marker berwarna per kategori. Klik, lihat, pilih.",
    cta: "Buka Peta",
    href: "/map",
    gradient: "from-rose-500 via-pink-600 to-fuchsia-700",
    emoji: "🗺️",
  },
];

const STORAGE_KEY = "poca_announcement_seen";

export function AnnouncementModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  const next = () => setIndex((i) => (i + 1) % SLIDES.length);
  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  const slide = SLIDES[index];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient hero */}
            <div className={`relative h-48 bg-gradient-to-br ${slide.gradient} animate-gradient overflow-hidden`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl float-anim drop-shadow-2xl">{slide.emoji}</span>
              </div>
              <button
                onClick={close}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" /> {slide.eyebrow}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{slide.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{slide.subtitle}</p>

              <div className="flex items-center justify-between">
                {/* Dots */}
                <div className="flex space-x-1.5">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-6 bg-blue-600" : "w-1.5 bg-gray-300"
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  {index < SLIDES.length - 1 && (
                    <button onClick={next} className="text-sm text-gray-500 hover:text-gray-700 px-2">
                      Lewati
                    </button>
                  )}
                  <button
                    onClick={() => goTo(slide.href)}
                    className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <span>{slide.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
