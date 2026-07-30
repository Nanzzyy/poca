"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Compass, Sparkles, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
  icon: typeof Compass;
}

const SLIDES: Slide[] = [
  {
    id: "1",
    eyebrow: "Poca Journey",
    title: "Bingung mau liburan ke mana?",
    subtitle: "Temukan solusi praktis liburanmu di satu tempat — rekomendasi destinasi, rencana perjalanan, dan budget otomatis.",
    cta: "Mulai Jelajah",
    href: "/search",
    gradient: "from-blue-600 to-indigo-700",
    icon: Compass,
  },
  {
    id: "2",
    eyebrow: "AI Travel Assistant",
    title: "Tanya AI, langsung dapat jawaban",
    subtitle: "Asisten AI siap bantu rekomendasi destinasi, estimasi biaya, sampai tips kuliner lokal.",
    cta: "Ngobrol sama AI",
    href: "/chat",
    gradient: "from-emerald-500 to-teal-600",
    icon: Sparkles,
  },
  {
    id: "3",
    eyebrow: "Interactive Map",
    title: "Jelajahi Indonesia lewat peta",
    subtitle: "Lihat semua destinasi di peta interaktif dengan marker berwarna per kategori.",
    cta: "Buka Peta",
    href: "/map",
    gradient: "from-rose-500 to-pink-600",
    icon: MapPin,
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
  const Icon = slide.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/50" />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero */}
            <div className={`relative h-44 bg-gradient-to-br ${slide.gradient} flex items-center justify-center`}>
              <Icon className="w-16 h-16 text-white/40" />
              <button
                onClick={close}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {slide.eyebrow}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{slide.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{slide.subtitle}</p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
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

                <div className="flex items-center gap-2">
                  {index < SLIDES.length - 1 && (
                    <button onClick={next} className="text-sm text-gray-500 hover:text-gray-700 px-2">
                      Lewati
                    </button>
                  )}
                  <button
                    onClick={() => goTo(slide.href)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    {slide.cta}
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
