import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("auth_token") : null,
  setToken: (token) => {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("auth_token");
    set({ token: null });
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
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toasts: [],
  addToast: (message, type = "info") => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
