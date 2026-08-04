"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useDestination, useReviews, useReviewSummary, useNearbyDestinations, useLocalGuide, useCreateReview, useProfile, useFavoriteIds, useToggleFavorite } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { destImage } from "@/lib/utils";
import { Loading } from "@/components/ui";
import { Star, MapPin, Clock, DollarSign, Send, Utensils, Landmark, TreePine, Sparkles, Lightbulb, PenLine, Share2, Bookmark, Rocket, SmilePlus, Frown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import nextDynamic from "next/dynamic";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });
const SectionRenderer = nextDynamic(() => import("@/components/sections/SectionRenderer"), { ssr: false });



export default function DestinationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: dest, isLoading } = useDestination(id);
  const { data: reviews } = useReviews(id);
  const { data: summary } = useReviewSummary(id);
  const { data: nearby } = useNearbyDestinations(id);
  const { data: guide } = useLocalGuide(id);
  const { data: user } = useProfile();
  const createReview = useCreateReview();
  const addToast = useUIStore(s => s.addToast);

  const [tab, setTab] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [rTitle, setRTitle] = useState("");
  const [rContent, setRContent] = useState("");
  const [rTips, setRTips] = useState("");
  const favIds = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const [imgIdx, setImgIdx] = useState(0);

  if (isLoading) return (
    <div className="pt-16 min-h-screen bg-background flex items-center justify-center">
      <Loading variant="profile" />
    </div>
  );
  if (!dest) return <div className="pt-20 text-center py-24 text-on-surface-variant">Destination not found</div>;

  const submitReview = async () => {
    if (!rTitle.trim()) { addToast("Title required", "error"); return; }
    await createReview.mutateAsync({ destId: id, data: { rating, title: rTitle, content: rContent, travel_tips: rTips } });
    setShowForm(false); setRTitle(""); setRContent(""); setRTips("");
    addToast("Review posted!", "success");
  };

  const reviewData = reviews?.items || [];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "reviews", label: `Reviews (${dest.review_count})` },
    { key: "map", label: "Map" },
    { key: "guide", label: "Guide" },
  ];

  const saved = favIds.has(dest.id);
  // Build a working image list (seed uses defunct source.unsplash — destImage fixes that).
  const rawImgs = dest.images?.length ? dest.images : [];
  const imgs = (rawImgs.length ? rawImgs : [null]).map((u) => destImage(u ? [u] : [], dest.name));

  const onShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: dest.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); addToast("Link disalin!", "success"); }
    } catch { /* share cancelled — noop */ }
  };
  const onSave = () => {
    if (!user) return addToast("Masuk untuk menyimpan destinasi.", "info");
    toggleFav.mutate(dest.id);
    addToast(saved ? "Dihapus dari simpanan." : "Disimpan!", saved ? "info" : "success");
  };

  return (
    <div className="pt-16 max-w-[1280px] mx-auto w-full px-4 lg:px-6 py-6">
      <main className="flex-grow">
        {/* ═══════ HERO SECTION ═══════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          {/* Main Large Image */}
          <div className="lg:col-span-8 relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden group shadow-lg">
            <img
              className="w-full h-full object-cover transition-opacity duration-300"
              src={imgs[imgIdx]}
              alt={dest.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {rawImgs.length > 1 && (
              <>
                <button onClick={() => setImgIdx((i) => (i - 1 + rawImgs.length) % rawImgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition-all" aria-label="Sebelumnya">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setImgIdx((i) => (i + 1) % rawImgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition-all" aria-label="Berikutnya">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute top-3 right-3 flex gap-1">
                  {rawImgs.map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-white w-4" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  {dest.category && (
                    <span className="bg-primary px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-on-primary">
                      {dest.category.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg">
                    <Star className="w-[18px] h-[18px] text-yellow-400 fill-current" />
                    <span className="text-[12px] font-bold">{dest.rating_avg} ({dest.review_count} reviews)</span>
                  </div>
                </div>
                <h1 className="text-[36px] lg:text-[48px] font-bold tracking-tight">{dest.name}</h1>
                <p className="text-white/70 text-sm">{dest.city}, {dest.country}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onShare} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all active:scale-95 shadow-lg">
                  <Share2 className="w-5 h-5" />
                </button>
                <button onClick={onSave} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-xl ${saved ? "bg-primary text-white" : "bg-white text-primary hover:bg-surface-container-low"}`}>
                  <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          </div>
          {/* Thumbnail Side Grid — click to switch hero image */}
          <div className="hidden lg:grid lg:col-span-4 grid-rows-2 gap-4">
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => setImgIdx(rawImgs.length > n ? n : 0)}
                className={`rounded-2xl overflow-hidden shadow-md relative group transition-all ${imgIdx === n || (rawImgs.length <= n && imgIdx === 0) ? "ring-2 ring-primary" : ""}`}
              >
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={imgs[n] || imgs[0]} alt="" />
              </button>
            ))}
          </div>
        </section>

        {/* ═══════ SECTION-DRIVEN CONTENT (if sections exist) ═══════ */}
        {(dest as any).sections && (dest as any).sections.length > 0 ? (
          <div className="space-y-0">
            {([...(dest as any).sections]
              .sort((a: any, b: any) => a.order - b.order)
              .filter((s: any) => s.visible && s.section_type !== "hero-gallery" && s.section_type !== "reviews")
            ).map((section: any) => (
              <SectionRenderer key={section.id} section={section} dest={dest} />
            ))}
          </div>
        ) : (
          <>
        {/* ═══════ TAB SYSTEM (legacy fallback) ═══════ */}
        <div className="border-b border-outline-variant/30 mb-6 flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur-sm z-40 py-2">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`pb-3 px-2 text-[14px] leading-[1.5] transition-all whitespace-nowrap ${
                  tab === key
                    ? "text-primary font-bold border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push(`/chat?destination=${dest.id}`)}
            className="bg-primary text-on-primary px-6 py-2 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-md"
          >
            Plan My Visit <Rocket className="w-5 h-5" />
          </button>
        </div>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <h2 className="text-[20px] font-bold text-primary mb-4">About this Sanctuary</h2>
                <p className="text-[16px] leading-relaxed text-on-surface-variant">{dest.description}</p>
                {dest.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    {dest.tags.map((t: string) => (
                      <span key={t} className="px-3 py-1 bg-surface-container-high text-primary rounded-full text-[14px] font-medium">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Open Hours</p>
                    <p className="text-[14px] font-bold">07:00 AM - 07:00 PM</p>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Entrance Fee</p>
                    <p className="text-[14px] font-bold">Rp 50,000 (~$3.50)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar / Nearby */}
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[20px] font-bold">Nearby Places</h3>
              <div className="space-y-4">
                {(nearby && nearby.length > 0 ? nearby : []).slice(0, 3).map((place: any, i: number) => (
                  <div key={i} onClick={() => router.push(`/destination/${place.id}`)} className="group flex gap-4 items-center cursor-pointer">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
                      <img className="w-full h-full object-cover group-hover:scale-110 transition-transform" src={destImage(place.images, place.name)} alt={place.name} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold group-hover:text-primary transition-colors">{place.name}</h4>
                      <p className="text-[12px] text-on-surface-variant">{place.distance || place.city || "Nearby"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ REVIEWS TAB ═══════ */}
        {tab === "reviews" && (
          <div>
            {/* AI Summary Box */}
            {summary?.summary_text && (
              <div className="bg-[#eff6ff] p-6 rounded-2xl border border-primary/10 mb-6 flex flex-col md:flex-row gap-6">
                <div className="shrink-0 flex flex-col items-center justify-center px-4 border-r border-primary/10">
                  <Sparkles className="w-8 h-8 text-primary mb-2" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">AI INSIGHT</span>
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-[14px] font-bold text-primary flex items-center gap-1">
                      <SmilePlus className="w-[18px] h-[18px]" /> Pros
                    </h4>
                    <ul className="text-[12px] text-on-surface-variant mt-2 list-disc pl-4">
                      {(summary.positive_topics?.length ? summary.positive_topics : ["Stunning sunset views", "Kecak dance performance", "Spiritual atmosphere"]).map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-error flex items-center gap-1">
                      <Frown className="w-[18px] h-[18px]" /> Cons
                    </h4>
                    <ul className="text-[12px] text-on-surface-variant mt-2 list-disc pl-4">
                      {(summary.negative_topics?.length ? summary.negative_topics : ["Mischievous monkeys", "Heavy evening crowds", "Uphill walking required"]).map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/50 p-3 rounded-xl border border-white">
                    <h4 className="text-[14px] font-bold text-on-surface">Overall Sentiment</h4>
                    <div className="mt-1 flex items-end gap-2">
                      <span className="text-3xl font-extrabold text-primary">{summary.sentiment_score ? Math.round(summary.sentiment_score * 100) : 92}%</span>
                      <span className="text-[12px] mb-1 text-on-surface-variant">Positive</span>
                    </div>
                    <div className="w-full bg-primary/10 h-2 rounded-full mt-2">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${summary.sentiment_score ? Math.round(summary.sentiment_score * 100) : 92}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Write Review */}
            {user && !showForm && (
              <button onClick={() => setShowForm(true)} className="mb-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-[14px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98]">
                <PenLine className="w-3.5 h-3.5" /> Write Review
              </button>
            )}
            {showForm && (
              <div className="mb-4 p-4 border border-outline-variant/30 rounded-2xl bg-surface-container-low">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(n)}>
                      <Star className={`w-5 h-5 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-outline"}`} />
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Title" className="w-full p-2.5 border border-outline-variant rounded-xl mb-2 text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={rTitle} onChange={e => setRTitle(e.target.value)} />
                <textarea placeholder="Your experience" className="w-full p-2.5 border border-outline-variant rounded-xl mb-2 text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" rows={3} value={rContent} onChange={e => setRContent(e.target.value)} />
                <input type="text" placeholder="Travel tips" className="w-full p-2.5 border border-outline-variant rounded-xl mb-3 text-[14px] bg-surface-container-lowest outline-none focus:ring-2 focus:ring-primary/20" value={rTips} onChange={e => setRTips(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={submitReview} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-[14px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98]">
                    <Send className="w-3.5 h-3.5" /> Submit
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-on-surface-variant text-[14px] hover:text-on-surface">Cancel</button>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviewData.length > 0 ? (
              <div className="space-y-6">
                {reviewData.map((r: any, i: number) => (
                  <div key={r.id || i} className="flex items-start gap-4 border-b border-outline-variant/10 pb-6">
                    <div className="w-12 h-12 rounded-full bg-surface-container shadow-sm flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                      {(r.username || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-[14px] font-bold">{r.username || r.name || "Traveler"}</h5>
                        <span className="text-on-surface-variant text-[10px]">{r.time || new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                      </div>
                      <div className="flex gap-1 text-yellow-400 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < (r.rating || 5) ? "fill-current" : ""}`} />
                        ))}
                      </div>
                      <p className="text-[14px] text-on-surface-variant leading-relaxed">{r.content || r.text}</p>
                      {r.travel_tips && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {r.travel_tips}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-on-surface-variant">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reviews yet</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ MAP TAB ═══════ */}
        {tab === "map" && (
          <div className="rounded-2xl overflow-hidden h-[500px] border border-outline-variant/20 shadow-lg relative">
            <MapView
              center={[dest.latitude, dest.longitude]}
              zoom={14}
              markers={[{
                id: dest.id,
                name: dest.name,
                latitude: dest.latitude,
                longitude: dest.longitude,
                rating_avg: dest.rating_avg,
                category_name: dest.category?.name,
                country: dest.country,
                city: dest.city,
              }]}
            />
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-4 rounded-xl space-y-3 w-56 shadow-lg">
              <h4 className="text-[14px] font-bold text-primary">Map Legend</h4>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[12px]">Main Temple</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-[12px]">Dance Theater</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary" />
                <span className="text-[12px]">Public Restroom</span>
              </div>
              <button className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold text-[12px] mt-2">
                Get Directions
              </button>
            </div>
          </div>
        )}

        {/* ═══════ GUIDE TAB ═══════ */}
        {tab === "guide" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Local Food */}
              <div className="group bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-6">
                  <Utensils className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-bold mb-4 text-on-surface">Local Bites</h3>
                <p className="text-[14px] text-on-surface-variant mb-6">
                  {(guide?.food?.[0] as any)?.desc || guide?.food?.[0]?.toString() || "Try the Sate Lilit sold near the parking area, or head down to Jimbaran for fresh seafood."}
                </p>
                <div className="pt-4 border-t border-outline-variant/20">
                  <span className="text-primary font-bold text-[12px] cursor-pointer hover:underline">Explore 12 nearby restaurants</span>
                </div>
              </div>
              {/* Customs */}
              <div className="group bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-6">
                  <Landmark className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-bold mb-4 text-on-surface">Local Customs</h3>
                <p className="text-[14px] text-on-surface-variant mb-6">
                  {(guide?.customs?.[0] as any)?.desc || "Sarongs are required for both men and women. Keep your shoulders covered and speak softly."}
                </p>
                <div className="pt-4 border-t border-outline-variant/20">
                  <span className="text-primary font-bold text-[12px] cursor-pointer hover:underline">Read Etiquette Guide</span>
                </div>
              </div>
              {/* Hidden Gems */}
              <div className="group bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                  <TreePine className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-bold mb-4 text-on-surface">Hidden Gems</h3>
                <p className="text-[14px] text-on-surface-variant mb-6">
                  {(guide?.hidden_gems?.[0] as any)?.desc || "There's a secret cave under the cliff accessible at low tide. Ask the locals for 'Gua Suluban'."}
                </p>
                <div className="pt-4 border-t border-outline-variant/20">
                  <span className="text-primary font-bold text-[12px] cursor-pointer hover:underline">View on Secret Map</span>
                </div>
              </div>
            </div>

            {/* Thread Itinerary */}
            <div className="mt-8 bg-surface p-6 rounded-2xl border border-outline-variant/30">
              <h3 className="text-[20px] font-bold mb-6">Perfect Afternoon Itinerary</h3>
              <div className="relative pl-6 space-y-6" style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: "16px", top: "0", bottom: "0", width: "2px", borderLeft: "2px dashed #c3c6d7", zIndex: 0 }} />
                {[
                  { time: "04:00 PM", title: "Arrival & Exploration", desc: "Walk along the cliff-top walls and enjoy the ocean view before the heat dies down." },
                  { time: "05:30 PM", title: "Sunset Watching", desc: "Find a spot on the western cliff face for the best unobstructed view." },
                  { time: "06:00 PM", title: "Kecak Fire Dance", desc: "The performance begins as twilight falls, creating a mesmerizing spiritual experience." },
                ].map((item, i) => (
                  <div key={i} className="relative z-10 flex gap-4" style={{ position: "relative", zIndex: 10 }}>
                    <div className={`w-8 h-8 rounded-full ${i === 0 ? "bg-primary" : "bg-surface-container"} border-4 border-white shadow-sm shrink-0`} />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{item.time}</span>
                      <h4 className="text-[14px] font-bold mt-1">{item.title}</h4>
                      <p className="text-[12px] text-on-surface-variant">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
