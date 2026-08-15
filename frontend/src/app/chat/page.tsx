"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConversations, useConversation, useCreateConversation, useSendMessage, useRenameConversation, useDeleteConversation, useProfile, useDestination } from "@/lib/queries";
import { useUIStore } from "@/stores";
import { MessageCircle, Send, Plus, Sparkles, Pencil, Trash2, Check, X, ChevronLeft, Menu, History, Paperclip, Bookmark, Share2, Printer, Edit, Hotel, Lightbulb, ChevronRight, Maximize2, Compass, RefreshCw, Sliders, Wand2 } from "lucide-react";
import { RecommendationCards } from "@/components/chat/RecommendationCards";
import { PlanCard } from "@/components/chat/PlanCard";
import { FormattedText } from "@/components/chat/FormattedText";
import { PlanInputForm } from "@/components/chat/PlanInputForm";
import { Loading } from "@/components/ui";
import type { PlanFormData } from "@/components/chat/PlanInputForm";

const QUICK_PROMPTS = [
  "Rencana 2 hari di Bali budget 2 juta",
  "3 hari di Jogja untuk 2 orang",
  "Backpacker ke Bandung 500rb",
  "Kuliner + wisata sejarah Jogja",
];

const REFINEMENT_PROMPTS = [
  { icon: RefreshCw, label: "Ubah budget", prompt: "Ubah budget" },
  { icon: Sliders, label: "Tambah hari", prompt: "Tambah hari" },
  { icon: Wand2, label: "Ganti minat", prompt: "Ganti minat" },
  { icon: Compass, label: "Ganti lokasi", prompt: "Ganti lokasi" },
];

const PLACEHOLDER_PLANS = [
  { name: "Tegalalang Rice Terrace", img: null },
  { name: "Pura Tirta Empul", img: null },
];

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useProfile();
  const { data: conversations } = useConversations();
  const createConv = useCreateConversation();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const { data: conv, refetch: refetchConv } = useConversation(activeConv || "");
  const sendMsg = useSendMessage();
  const rename = useRenameConversation();
  const del = useDeleteConversation();
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = conv?.messages || (activeConv ? [] : []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-dismiss planner form once the conversation has real messages
  // (the plan card or AI response appeared).
  useEffect(() => {
    if (messages.length > 0 && showPlanner) {
      setShowPlanner(false);
    }
  }, [messages, showPlanner]);

  const prevConvRef = useRef<string | null>(activeConv);
  useEffect(() => {
    if (showSidebar && prevConvRef.current !== activeConv) setShowSidebar(false);
    prevConvRef.current = activeConv;
  }, [activeConv, showSidebar]);

  // ?example=1 (from home "Lihat Contoh Plan") → tampilkan form planner,
  // jangan auto-generate. User isi sendiri budget/hari/orang sebelum plan dibuat.
  const exampleStarted = useRef(false);
  useEffect(() => {
    if (exampleStarted.current) return;
    if (searchParams.get("example") && user && !activeConv) {
      exampleStarted.current = true;
      setShowPlanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, activeConv]);

  // ?destination=<id> (from destination detail "Plan My Visit") → tampilkan
  // form planner (pre-fill lokasi), jangan auto-kirim pesan template.
  const planVisitStarted = useRef(false);
  const destId = searchParams.get("destination");
  const { data: planDest } = useDestination(destId || "");
  useEffect(() => {
    if (planVisitStarted.current) return;
    if (destId && planDest && user && !activeConv) {
      planVisitStarted.current = true;
      setShowPlanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destId, planDest, user, activeConv]);

  const pickImage = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    if (f.size > 3 * 1024 * 1024) return;
    const r = new FileReader();
    r.onload = () => setPendingImg(r.result as string);
    r.readAsDataURL(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sendMessage = async (convId: string, text: string, attachment?: string | null) => {
    const content = text.trim();
    if (!content && !attachment) return;
    await sendMsg.mutateAsync({ convId, content: content || "(gambar)", attachment: attachment || undefined });
    if (convId === activeConv) refetchConv();
  };

  const handleSend = async (text?: string) => {
    const content = text || input;
    if (!content.trim() && !pendingImg) return;
    if (!activeConv) return;
    const img = pendingImg;
    setInput("");
    setPendingImg(null);
    await sendMessage(activeConv, content, img);
  };

  const startNewChat = async (initialMsg?: string) => {
    if (!user) return router.push("/auth/login");
    const result = await createConv.mutateAsync();
    setActiveConv(result.id);
    if (initialMsg) {
      await sendMessage(result.id, initialMsg);
    }
    // Don't dismiss the planner until the conversation visibly has messages
    // (prevents the blank flash before the plan card appears).
  };

  // Handle plan generation from PlanInputForm
  const handlePlanGenerate = async (data: PlanFormData) => {
    setPlanLoading(true);
    let prompt = `Buatkan rencana perjalanan ${data.days} hari`;
    if (data.location) prompt += ` di ${data.location}`;
    prompt += ` untuk ${data.people} orang`;
    if (data.budget > 0) prompt += ` dengan budget Rp${data.budget.toLocaleString("id-ID")}`;
    if (data.interest) prompt += `, minat: ${data.interest}`;
    prompt += `. Berikan detail aktivitas per hari, estimasi biaya, dan rekomendasi tempat.`;
    await startNewChat(prompt);
    setPlanLoading(false);
    // Stay in planner mode until the plan card appears — prevents
    // the blank-screen gap between sending and rendering the plan.
    // Dismissed by the sendMsg.isPending→!isPending transition
    // (the typing indicator + plan card handle the visual).
  };

  // Handle refinement clicks
  const handleRefinement = async (prompt: string) => {
    if (!activeConv) return;
    // Let the user provide the value; do not submit a hardcoded edit.
    setInput(prompt);
  };

  // Edit plan → tell AI to modify the current plan; it will ask what changed
  // (ambiguous) or apply the concrete change directly.
  const handleEditPlan = (aiMsgId: string) => {
    if (!activeConv) return;
    setInput("Ubah rencana ini");
    setTimeout(() => handleSend("Ubah rencana ini"), 100);
  };

  const handleCancelPlan = () => {
    if (!activeConv) return;
    void handleSend("Batalkan rencana ini");
  };

  const startRename = (id: string, summary?: string | null) => {
    setEditingId(id);
    setEditText(summary || "Percakapan baru");
  };
  const saveRename = async (id: string) => {
    const text = editText.trim();
    setEditingId(null);
    if (text) await rename.mutateAsync({ convId: id, summary: text });
  };
  const handleDelete = async (id: string) => {
    if (!await useUIStore.getState().confirm({ title: "Hapus Percakapan", message: "Hapus percakapan ini? Tindakan tidak bisa dibatalkan.", confirmText: "Hapus" })) return;
    await del.mutateAsync(id);
    if (activeConv === id) setActiveConv(null);
  };

  // Check if latest AI message has a plan
  const lastAiMsg = [...messages].reverse().find(m => m.role === "assistant");
  const hasPlan = lastAiMsg?.msg_metadata?.plan;

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center px-5 text-center h-screen">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg">
          <MessageCircle className="w-8 h-8 text-on-primary" />
        </div>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-1">Ngobrol sama AI</h2>
        <p className="text-body-md text-on-surface-variant mb-5 max-w-xs">Masuk dulu untuk mulai chat dengan asisten AI perjalanan</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  return (
    <main className="flex flex-1 pt-16 h-[calc(100dvh-var(--bottom-nav-h))] md:h-screen overflow-hidden bg-background">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="hidden lg:flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/30">
        <div className="p-4 flex flex-col gap-4">
          <button onClick={() => { setActiveConv(null); setShowPlanner(true); setShowSidebar(false); }} className="w-full bg-primary text-on-primary py-3 px-4 rounded-xl text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm">
            <Sparkles className="w-5 h-5" />
            Buat Rencana
          </button>
          <button onClick={() => startNewChat()} className="w-full border border-dashed border-outline-variant text-on-surface-variant py-3 px-4 rounded-xl text-[14px] flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all active:scale-[0.98]">
            <Plus className="w-5 h-5" />
            Chat Baru
          </button>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2 px-2">Recent Explorations</h3>
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-380px)]">
              {conversations && conversations.length > 0 ? (
                conversations.map((c) => {
                  const active = activeConv === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { if (editingId !== c.id) setActiveConv(c.id); setShowPlanner(false); }}
                      className={`px-4 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-highest"}`}
                    >
                      <History className="w-5 h-5 flex-shrink-0" />
                      <span className="text-[14px] truncate">{c.summary || "Percakapan baru"}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-on-surface-variant px-2">Belum ada percakapan</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-auto p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-lowest/50">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-primary">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface">AI Companion</p>
              <p className="text-[10px] text-on-surface-variant">Your Informed Explorer</p>
            </div>
          </div>
        </div>
      </aside>

      {showSidebar && <div className="fixed inset-0 z-30 bg-black/15 lg:hidden" onClick={() => setShowSidebar(false)} />}

      {/* ═══ MIDDLE: CHAT STREAM ═══ */}
      <section className="flex-1 flex flex-col bg-surface-container-lowest relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
          {/* Plan Input Form (shown when no active conv or planner mode) */}
          {(!activeConv || showPlanner) && (
            <div className="max-w-xl mx-auto w-full pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-headline-sm font-bold text-on-surface mb-1">AI Trip Planner</h2>
                <p className="text-body-md text-on-surface-variant mb-2 max-w-sm">Pilih template cepat atau buat rencana custom — AI akan menyusun itinerary lengkap untukmu!</p>
              </div>
              <PlanInputForm onGenerate={handlePlanGenerate} loading={planLoading || sendMsg.isPending} />
            </div>
          )}

          {/* Quick prompts when no active conv and not showing planner */}
          {!activeConv && !showPlanner && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-headline-sm font-bold text-on-surface mb-1">Asisten Perjalanan AI</h2>
              <p className="text-body-md text-on-surface-variant mb-6 max-w-sm">Tanya soal destinasi, budget, atau tips lokal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} onClick={() => startNewChat(prompt)}
                    className="p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left text-body-md text-on-surface hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]">
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowSidebar(true)} className="md:hidden px-4 py-2 border border-outline-variant text-on-surface-variant rounded-xl text-body-sm font-medium hover:bg-surface-container-low flex items-center gap-1.5 active:scale-[0.98]">
                  <Menu className="w-4 h-4" /> Riwayat
                </button>
                <button onClick={() => setShowPlanner(true)} className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Buat Rencana
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {activeConv && messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" && (
                <div className="flex flex-col items-end gap-1 max-w-2xl ml-auto mb-6">
                  <div className="bg-surface-container-high text-on-surface p-2 rounded-2xl rounded-tr-none">
                    {m.msg_metadata?.attachment && (
                      <img src={m.msg_metadata.attachment} alt="lampiran" className="rounded-xl max-h-60 w-auto mb-1" />
                    )}
                    {m.content && m.content !== "(gambar)" && (
                      <p className="text-[14px] leading-relaxed px-2 py-1">{m.content}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-outline">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
              {m.role === "assistant" && (
                <div className="flex gap-4 max-w-4xl mb-6">
                  <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex-shrink-0 flex items-center justify-center mt-1">
                    <Sparkles className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="text-[14px] leading-relaxed text-on-surface"><FormattedText text={m.content} /></div>
                    {m.msg_metadata?.plan && <PlanCard plan={m.msg_metadata.plan} onEdit={() => handleEditPlan(m.id)} onCancel={handleCancelPlan} />}
                    {(m.msg_metadata?.recommendations?.length ?? 0) > 0 && <RecommendationCards items={m.msg_metadata!.recommendations!} />}

                    {/* Refinement actions — show after plan */}
                    {m.msg_metadata?.plan && (
                      <div className="flex flex-wrap gap-2 pt-1 pb-2">
                        <span className="text-[11px] text-on-surface-variant font-medium self-center mr-1">Sempurnakan:</span>
                        {REFINEMENT_PROMPTS.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleRefinement(r.prompt)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-full text-[11px] font-medium hover:bg-primary/10 hover:text-primary transition-all active:scale-[0.95]"
                          >
                            <r.icon className="w-3.5 h-3.5" />
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* AI typing indicator — interactive loading while waiting for response */}
          {sendMsg.isPending && (
            <div className="flex gap-4 max-w-4xl mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex-shrink-0 flex items-center justify-center mt-1">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col gap-3 w-full pt-1">
                <div className="bg-surface-container-low rounded-2xl rounded-tl-none px-4 py-3">
                  <Loading variant="chat" className="py-2" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area — in-flow (no dead gap below) */}
        <div className="p-4 bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant/30">
          <div className="max-w-4xl mx-auto relative flex items-center gap-3">
            <div className="flex-1 relative">
              {pendingImg && (
                <div className="mb-2 inline-block relative">
                  <img src={pendingImg} alt="" className="h-20 w-20 object-cover rounded-xl border border-outline-variant" />
                  <button onClick={() => setPendingImg(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              )}
              <input
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl py-4 pl-6 pr-14 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-[14px] text-on-surface"
                placeholder="Tanyakan apa saja tentang perjalananmu..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && activeConv) handleSend();
                  if (e.key === "Enter" && !activeConv && input.trim()) startNewChat(input.trim());
                }}
                disabled={sendMsg.isPending}
              />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files)} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <button onClick={() => fileRef.current?.click()} title="Lampirkan gambar" className="text-on-surface-variant cursor-pointer hover:text-primary transition-colors"><Paperclip className="w-5 h-5" /></button>
              </div>
            </div>
            <button
              onClick={() => { if (activeConv) handleSend(); else if (input.trim() || pendingImg) startNewChat(input.trim()); }}
              disabled={(!input.trim() && !pendingImg) || sendMsg.isPending}
              className="bg-primary text-on-primary p-4 rounded-2xl shadow-md hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-40 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ RIGHT INSPECTOR PANEL ═══ */}
      {activeConv && (
        <aside className="hidden xl:flex flex-col w-80 bg-surface-container-low border-l border-outline-variant/30 overflow-y-auto">
          <div className="p-5 space-y-6">
            {hasPlan ? (
              <>
                <div>
                  <h3 className="text-headline-sm font-semibold mb-3 text-on-surface">Preview Rencana</h3>
                  <div className="rounded-2xl overflow-hidden shadow-sm relative h-48 group bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    {lastAiMsg?.msg_metadata?.plan?.cover_image ? (
                      <img src={lastAiMsg.msg_metadata.plan.cover_image} alt={lastAiMsg?.msg_metadata?.plan?.location || "Destinasi"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Compass className="w-16 h-16 text-outline/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <p className="text-white font-bold text-[12px] drop-shadow">{lastAiMsg?.msg_metadata?.plan?.location || "Destinasi"}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Share2, label: "Bagikan" },
                      { icon: Bookmark, label: "Simpan" },
                      { icon: Edit, label: "Ubah" },
                      { icon: Hotel, label: "Cari Hotel" },
                    ].map(({ icon: Icon, label }) => (
                      <button key={label} className="flex flex-col items-center gap-2 p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl hover:border-primary/50 transition-all active:scale-[0.98]">
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-bold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20">
                  <div className="flex items-center gap-2 mb-2 text-secondary">
                    <Lightbulb className="w-4 h-4 fill-current" />
                    <h4 className="text-[12px] font-bold">Poca Tip</h4>
                  </div>
                  <p className="text-[12px] text-on-surface-variant italic">Kamu bisa refine rencana ini dengan klik tombol sempurnakan di chat.</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Lightbulb className="w-12 h-12 text-outline/30 mb-3" />
                <p className="text-[14px] text-on-surface-variant">Belum ada rencana aktif</p>
                <p className="text-[12px] text-outline mt-1">Minta AI untuk membuat rencana perjalanan</p>
              </div>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}

export default function ChatPage() {
  // useSearchParams must be inside a Suspense boundary for static prerender.
  return (
    <Suspense fallback={<div className="pt-16 min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <ChatPageInner />
    </Suspense>
  );
}
