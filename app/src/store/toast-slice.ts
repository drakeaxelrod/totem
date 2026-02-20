import type { StateCreator } from "zustand";
import type { AppStore } from "./index.ts";

export interface ToastSlice {
  toast: { message: string; kind: "success" | "error" } | null;
  _toastTimer: ReturnType<typeof setTimeout> | null;
  showToast: (message: string, kind?: "success" | "error") => void;
  clearToast: () => void;
}

export const createToastSlice: StateCreator<AppStore, [], [], ToastSlice> = (
  set,
  get,
) => ({
  toast: null,
  _toastTimer: null,

  showToast: (message, kind = "success") => {
    const prev = get()._toastTimer;
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => set({ toast: null, _toastTimer: null }), 4000);
    set({ toast: { message, kind }, _toastTimer: timer });
  },

  clearToast: () => {
    const prev = get()._toastTimer;
    if (prev) clearTimeout(prev);
    set({ toast: null, _toastTimer: null });
  },
});
