import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

// Decode the JWT `exp` claim (seconds since epoch). Returns null if missing/invalid.
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof decoded.exp !== "number") return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null, // Always start null to match SSR. Hydrated client-side in layout.
  setToken: (token) => {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("auth_token");
    set({ token: null });
    // Force full reload so all React Query caches, zustand stores,
    // and component state reset — avoids stale authed data sticking around.
    window.location.href = "/";
  },
}));

// Hydrate auth store from localStorage on client startup, dropping expired tokens.
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("auth_token");
  if (stored) {
    if (isTokenExpired(stored)) {
      localStorage.removeItem("auth_token");
    } else {
      useAuthStore.setState({ token: stored });
    }
  }
}

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
