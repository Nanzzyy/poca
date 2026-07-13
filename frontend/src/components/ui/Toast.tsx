"use client";

import { useUIStore } from "@/stores";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-slide-in ${
            t.type === "success" ? "bg-green-600" :
            t.type === "error" ? "bg-red-600" : "bg-blue-600"
          }`}
        >
          {t.type === "success" ? <CheckCircle className="w-4 h-4" /> :
           t.type === "error" ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
