"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useDestination, useReviews, useReviewSummary, useNearbyDestinations, useLocalGuide, useCreateReview, useProfile } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { Star, MapPin, Clock, DollarSign, ArrowLeft, Send, Utensils, Landmark, TreePine } from "lucide-react";
import { useState } from "react";
import nextDynamic from "next/dynamic";

const MapView = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });
const EMOJIS = ["🏝️", "🏛️", "🌋", "🏯", "🌊", "⛰️", "🦁", "🐘", "🌸"];

export default function DestinationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: dest, isLoading } = useDestination(id);
  const { data: reviews, refetch } = useReviews(id);
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

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-20">
    <div className="skeleton h-64 rounded-2xl mb-6" />
    <div className="skeleton h-8 w-2/3 mb-4" />
    <div className="skeleton h-32 rounded-xl" />
  </div>;
  if (!dest) return <div className="text-center py-24 text-gray-500 text-lg">Destination not found</div>;

  const emoji = EMOJIS[dest.name.length % EMOJIS.length];

  const submitReview = async () => {
    if (!rTitle.trim()) { addToast("Title required", "error"); return; }
    await createReview.mutateAsync({ destId: id, data: { rating, title: rTitle, content: rContent, travel_tips: rTips } });
    setShowForm(false); setRTitle(""); setRContent(""); setRTips("");
    addToast("Review posted! 🎉", "success");
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-blue-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-5 h-64 md:h-72 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
        <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-40">{emoji}</div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60">
          <div className="flex items-center space-x-2 mb-1">
            {dest.category && <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-xs text-white">{dest.category.name}</span>}
            <span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${dest.price_level === "budget" ? "bg-green-500" : dest.price_level === "luxury" ? "bg-purple-500" : "bg-blue-500"}`}>{dest.price_level}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{dest.name}</h1>
          <p className="text-white/70 text-sm">{dest.city}, {dest.country}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-5 flex items-center justify-around">
        {[
          { icon: Star, label: "Rating", value: dest.rating_avg.toString(), color: "text-yellow-500" },
          { icon: MapPin, label: "Location", value: `${dest.latitude.toFixed(2)}, ${dest.longitude.toFixed(2)}`, color: "text-blue-500" },
          { icon: Clock, label: "Best Time", value: dest.seasonal_info?.best_months || "All year", color: "text-emerald-500" },
          { icon: DollarSign, label: "Price", value: dest.price_level, color: "text-purple-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="text-center">
            <Icon className={`w-4 h-4 mx-auto ${color}`} />
            <p className="text-xs font-semibold mt-0.5">{value}</p>
            <p className="text-[9px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Content */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: MapPin },
            { key: "reviews", label: `Reviews (${dest.review_count})`, icon: Star },
            { key: "map", label: "Map", icon: MapPin },
            { key: "guide", label: "Guide", icon: Utensils },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center space-x-1 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
              }`}>
              <Icon className="w-4 h-4" /><span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "overview" && (
            <div className="space-y-5">
              <p className="text-gray-700 leading-relaxed">{dest.description}</p>
              {dest.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {dest.tags.map((t: string) => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">#{t}</span>)}
                </div>
              )}
              {summary?.summary_text && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium mb-1">✨ AI Summary</p>
                  <p className="text-sm text-blue-700">{summary.summary_text}</p>
                </div>
              )}
              {nearby && nearby.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">📍 Nearby</h3>
                  <div className="flex space-x-2 overflow-x-auto">
                    {nearby.map(n => (
                      <button key={n.id} onClick={() => router.push(`/destination/${n.id}`)}
                        className="flex-shrink-0 p-3 bg-white border rounded-xl text-left min-w-[130px] hover:shadow-md">
                        <p className="font-medium text-sm">{n.name}</p>
                        <p className="text-xs text-gray-500">⭐ {n.rating_avg}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div>
              {user && !showForm && <button onClick={() => setShowForm(true)} className="mb-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">✍️ Write Review</button>}
              {showForm && (
                <div className="mb-4 p-4 border rounded-xl bg-gray-50">
                  <div className="flex space-x-1 mb-2">
                    {[1,2,3,4,5].map(n => <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-yellow-400" : "text-gray-200"}`}>★</button>)}
                  </div>
                  <input type="text" placeholder="Title" className="w-full p-2 border rounded mb-2 text-sm bg-white" value={rTitle} onChange={e => setRTitle(e.target.value)} />
                  <textarea placeholder="Your experience" className="w-full p-2 border rounded mb-2 text-sm bg-white" rows={3} value={rContent} onChange={e => setRContent(e.target.value)} />
                  <input type="text" placeholder="Travel tips" className="w-full p-2 border rounded mb-3 text-sm bg-white" value={rTips} onChange={e => setRTips(e.target.value)} />
                  <div className="flex space-x-2">
                    <button onClick={submitReview} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center"><Send className="w-3 h-3 mr-1" /> Submit</button>
                    <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-gray-500 text-sm">Cancel</button>
                  </div>
                </div>
              )}
              {(!reviews || !reviews.items.length) ? (
                <div className="text-center py-12 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.items.map(r => (
                    <div key={r.id} className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs text-white">{r.username?.[0] || "U"}</div>
                          <p className="text-sm font-medium">{r.username || "Anonymous"}</p>
                        </div>
                        <div className="flex">{Array.from({length: 5}).map((_, i) => <span key={i} className={`text-sm ${i < r.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>)}</div>
                      </div>
                      {r.title && <p className="font-semibold text-sm">{r.title}</p>}
                      {r.content && <p className="text-sm text-gray-600 mt-1">{r.content}</p>}
                      {r.travel_tips && <p className="mt-1 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">💡 {r.travel_tips}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "map" && (
            <div className="h-[350px] rounded-xl overflow-hidden border">
              <MapView center={[dest.latitude, dest.longitude]} zoom={14}
                markers={[{ id: dest.id, name: dest.name, latitude: dest.latitude, longitude: dest.longitude, rating_avg: dest.rating_avg, category_name: dest.category?.name, country: dest.country, city: dest.city }]} />
            </div>
          )}

          {tab === "guide" && (
            <div className="space-y-5">
              {[
                { items: guide?.food, title: "Local Food", icon: Utensils, color: "orange" },
                { items: guide?.customs, title: "Customs", icon: Landmark, color: "purple" },
                { items: guide?.hidden_gems, title: "Hidden Gems", icon: TreePine, color: "emerald" },
              ].map(({ items, title, icon: Icon, color }) => items && items.length > 0 ? (
                <div key={title}>
                  <h3 className="font-semibold flex items-center mb-2"><Icon className={`w-4 h-4 mr-1.5 text-${color}-500`} />{title}</h3>
                  <div className="grid gap-2">
                    {items?.map((item: any, i: number) => (
                      <div key={i} className={`p-3 bg-${color}-50 rounded-xl border border-${color}-100`}>
                        <p className="font-medium text-sm">{item.name || item.title}</p>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null)}
              {(!guide?.food?.length && !guide?.customs?.length && !guide?.hidden_gems?.length) && (
                <div className="text-center py-12 text-gray-400"><Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No local guide info yet</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
