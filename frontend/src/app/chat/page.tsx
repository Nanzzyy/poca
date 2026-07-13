"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations, useConversation, useCreateConversation, useSendMessage, useProfile } from "@/lib/queries";
import { MessageCircle, Send, Plus, ArrowLeft } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const { data: user } = useProfile();
  const { data: conversations } = useConversations();
  const createConv = useCreateConversation();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const { data: conv, refetch: refetchConv } = useConversation(activeConv || "");
  const sendMsg = useSendMessage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const msg = input;
    setInput("");
    await sendMsg.mutateAsync({ convId: activeConv, content: msg });
    refetchConv();
  };

  const startNewChat = async () => {
    if (!user) return router.push("/auth/login");
    const result = await createConv.mutateAsync();
    setActiveConv(result.id);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
        <p className="mb-4">Sign in to chat with AI</p>
        <button onClick={() => router.push("/auth/login")} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Conversations sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r bg-white">
        <div className="p-3 border-b">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> <span>New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations?.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConv(c.id)}
              className={`w-full p-3 text-left text-sm border-b hover:bg-gray-50 ${activeConv === c.id ? "bg-blue-50" : ""}`}
            >
              <p className="font-medium truncate">{c.summary || "New conversation"}</p>
              <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="p-4 text-sm text-gray-400 text-center">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-500 p-6">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">AI Travel Assistant</h2>
            <p className="text-center max-w-md">
              Ask me for destination recommendations, trip planning, budgeting, or local tips!
            </p>
            <button
              onClick={startNewChat}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center p-3 border-b bg-white">
              <button onClick={() => setActiveConv(null)} className="md:hidden mr-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <MessageCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-sm">AI Assistant</span>
              {sendMsg.isPending && <span className="ml-2 text-xs text-gray-400">Typing...</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conv?.messages?.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ask about destinations, trips, or tips..."
                  className="flex-1 p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMsg.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
