"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConversation, useCreateConversation, useSendMessage, useRenameConversation, useDeleteConversation } from "@/lib/queries";
import { useUIStore } from "@/stores";

export function useChatMessages(authenticated: boolean) {
  const router = useRouter();
  const createConv = useCreateConversation();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const { data: conv, refetch: refetchConv } = useConversation(activeConv || "");
  const sendMsg = useSendMessage();
  const rename = useRenameConversation();
  const del = useDeleteConversation();
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingImg, setPendingImg] = useState<string | null>(null);
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
    if (!authenticated) return router.push("/auth/login");
    const result = await createConv.mutateAsync();
    setActiveConv(result.id);
    if (initialMsg) {
      await sendMessage(result.id, initialMsg);
    }
    // Don't dismiss the planner until the conversation visibly has messages
    // (prevents the blank flash before the plan card appears).
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

  return { activeConv, setActiveConv, conv, input, setInput, editingId, setEditingId,
    editText, setEditText, pendingImg, setPendingImg, sendMsg, handleSend, startNewChat,
    startRename, saveRename, handleDelete };
}
