"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useConversations, useConversation, useCreateConversation, useSendMessage, useRenameConversation, useDeleteConversation, useProfile } from "@/lib/queries";
import { MessageCircle, Send, Plus, ArrowLeft, Sparkles, Pencil, Trash2, Check, X } from "lucide-react";
import { RecommendationCards } from "@/components/chat/RecommendationCards";
import { PlanCard } from "@/components/chat/PlanCard";
import { FormattedText } from "@/components/chat/FormattedText";

const QUICK_PROMPTS = [
  "Rekomendasi pantai di Bali",
  "Budget 3 hari di Yogyakarta",
  "Kuliner khas Bandung",
  "Candi terbaik di Indonesia",
];

export default function ChatPage() {
  const router = useRouter();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages]);

  const sendMessage = async (convId: string, text: string) => {
    const content = text.trim();
    if (!content) return;
    await sendMsg.mutateAsync({ convId, content });
    // Optimistic user bubble + AI-reply refetch are handled in useSendMessage;
    // invalidate the active conversation's cache too in case it's the one open.
    if (convId === activeConv) refetchConv();
  };

  const handleSend = async (text?: string) => {
    const content = text || input;
    if (!content.trim() || !activeConv) return;
    setInput("");
    await sendMessage(activeConv, content);
  };

  const startNewChat = async (initialMsg?: string) => {
    if (!user) return router.push("/auth/login");
    const result = await createConv.mutateAsync();
    setActiveConv(result.id);
    // Use the freshly-created id directly — reading `activeConv` here would race
    // (state hasn't committed yet) and drop the first message.
    if (initialMsg) {
      await sendMessage(result.id, initialMsg);
    }
  };

  const startRename = (id: string, summary: string | null) => {
    setEditingId(id);
    setEditText(summary || "Percakapan baru");
  };
  const saveRename = async (id: string) => {
    const text = editText.trim();
    setEditingId(null);
    if (text) await rename.mutateAsync({ convId: id, summary: text });
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus percakapan ini?")) return;
    await del.mutateAsync(id);
    if (activeConv === id) setActiveConv(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg"
        >
          <MessageCircle className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-700 mb-1">Ngobrol sama AI</h2>
        <p className="text-sm text-gray-400 mb-5">Masuk dulu untuk mulai chat dengan asisten AI</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Masuk
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] max-w-5xl mx-auto">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r bg-white">
        <div className="p-3 border-b">
          <button
            onClick={() => startNewChat()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" /> <span>Chat Baru</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations?.map((c) => (
            <div
              key={c.id}
              onClick={() => editingId !== c.id && setActiveConv(c.id)}
              className={`group w-full p-3 text-left text-sm border-b hover:bg-gray-50 transition-colors ${
                activeConv === c.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
              }`}
            >
              {editingId === c.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(c.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 min-w-0 text-sm border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={() => saveRename(c.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.summary || "Percakapan baru"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(c.id, c.summary); }}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Ganti judul"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="p-4 text-sm text-gray-400 text-center">Belum ada percakapan</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-500 p-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Asisten Perjalanan AI</h2>
            <p className="text-center max-w-md mb-6 text-gray-500">
              Tanya apa saja soal destinasi, rencana perjalanan, budget, atau tips lokal. AI siap bantu!
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_PROMPTS.map((prompt) => (
                <motion.button
                  key={prompt}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startNewChat(prompt)}
                  className="p-3 bg-white border border-gray-200 rounded-xl text-left text-sm text-gray-700 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => startNewChat()}
              className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
            >
              Mulai chat baru
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center p-3 border-b bg-white">
              <button onClick={() => setActiveConv(null)} className="md:hidden mr-2 p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-2">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm">AI Assistant</span>
              {sendMsg.isPending && (
                <span className="ml-2 flex items-center text-xs text-gray-400">
                  <span className="flex space-x-0.5 mr-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                  Mengetik...
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              <AnimatePresence initial={false}>
                {conv?.messages?.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md"
                        : "bg-white text-gray-800 shadow-sm rounded-bl-md border border-gray-100"
                    }`}>
                      <div className="leading-relaxed"><FormattedText text={m.content} /></div>
                      {m.role === "assistant" && m.msg_metadata?.plan ? (
                        <PlanCard plan={m.msg_metadata.plan} />
                      ) : m.role === "assistant" && m.msg_metadata?.recommendations?.length ? (
                        <RecommendationCards items={m.msg_metadata.recommendations} />
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Tulis pesan..."
                  className="flex-1 p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={sendMsg.isPending}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sendMsg.isPending}
                  className="w-11 h-11 flex items-center justify-center bg-blue-600 text-white rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
