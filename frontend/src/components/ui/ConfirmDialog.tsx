"use client";

import { AlertTriangle } from "lucide-react";
import { useUIStore } from "@/stores";

export function ConfirmDialog() {
  const { confirmState, resolveConfirm } = useUIStore();
  if (!confirmState.open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
      onClick={() => resolveConfirm(false)}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmState.danger ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-on-surface">{confirmState.title}</h3>
            <p className="text-[13px] text-on-surface-variant mt-1">{confirmState.message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => resolveConfirm(false)}
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {confirmState.cancelText}
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-colors ${confirmState.danger ? "bg-error hover:bg-error/90" : "bg-primary hover:bg-primary/90"}`}
          >
            {confirmState.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
