import { create } from "zustand";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8008/api/v1";

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  logout: async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // ignore network errors — still clear local state
    }
    set({ isAuthenticated: false });
    // Force full reload so all React Query caches, zustand stores,
    // and component state reset — avoids stale authed data sticking around.
    window.location.href = "/";
  },
}));

interface MapState {
  center: [number, number];
  zoom: number;
  selectedMarkerId: string | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  selectMarker: (id: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [-2.5, 118.0],
  zoom: 5,
  selectedMarkerId: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  selectMarker: (id) => set({ selectedMarkerId: id }),
}));

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  confirmState: {
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    danger: boolean;
    resolve: ((v: boolean) => void) | null;
  };
  confirm: (opts?: Partial<{ title: string; message: string; confirmText: string; cancelText: string; danger: boolean }>) => Promise<boolean>;
  resolveConfirm: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toasts: [],
  addToast: (message, type = "info") => {
    const id = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  confirmState: { open: false, title: "Konfirmasi", message: "", confirmText: "Ya", cancelText: "Batal", danger: false, resolve: null },
  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        confirmState: {
          open: true,
          title: opts?.title || "Konfirmasi",
          message: opts?.message || "Yakin?",
          confirmText: opts?.confirmText || "Ya",
          cancelText: opts?.cancelText || "Batal",
          danger: opts?.danger ?? true,
          resolve,
        },
      });
    }),
  resolveConfirm: (v) => {
    const r = get().confirmState.resolve;
    set((s) => ({ confirmState: { ...s.confirmState, open: false, resolve: null } }));
    r?.(v);
  },
}));
