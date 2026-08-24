import { create } from "zustand";

export type ViewKey = "dashboard" | "pos" | "inventory" | "sales" | "customers" | "cash" | "suppliers" | "users" | "audit" | "reports" | "settings";

interface NavState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  params: Record<string, string>;
  navigate: (v: ViewKey, params?: Record<string, string>) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  setView: (view) => set({ view }),
  params: {},
  navigate: (view, params = {}) => set({ view, params }),
}));
