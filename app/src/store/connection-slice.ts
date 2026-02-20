import { invoke } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import type { ConnectionStatus, Layer, PhysicalLayouts } from "../lib/types.ts";
import type { KeyPosition } from "../lib/layout.ts";
import type { AppStore } from "./index.ts";

/** Resolved keymap returned by the get_resolved_keymap Tauri command. */
interface ResolvedKeymap {
  layers: Array<{
    id: number;
    name: string;
    bindings: Array<{ action: string; params: string[] }>;
  }>;
}

export interface ConnectionSlice {
  connectionStatus: ConnectionStatus;
  behaviorsReady: boolean;
  physicalLayout: KeyPosition[] | null;
  /** Live keymap layers from the connected device (null when disconnected). */
  liveKeymap: Layer[] | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setBehaviorsReady: (ready: boolean) => void;
  fetchPhysicalLayout: () => Promise<void>;
  fetchLiveKeymap: () => Promise<void>;
}

export const createConnectionSlice: StateCreator<
  AppStore,
  [],
  [],
  ConnectionSlice
> = (set) => ({
  connectionStatus: { state: "disconnected" },
  behaviorsReady: false,
  physicalLayout: null,
  liveKeymap: null,

  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
    if (status.state !== "connected") {
      set({ physicalLayout: null, liveKeymap: null });
    }
  },
  setBehaviorsReady: (ready) => set({ behaviorsReady: ready }),

  fetchPhysicalLayout: async () => {
    try {
      const result = await invoke<PhysicalLayouts>("get_physical_layouts");
      const layout = result.layouts[result.active_layout_index];
      if (!layout) return;
      const keys: KeyPosition[] = layout.keys.map((k, i) => ({
        index: i,
        x: k.x / 10,
        y: k.y / 10,
        w: k.width / 10,
        h: k.height / 10,
        rot: k.r / 100,
        rx: k.rx / 10,
        ry: k.ry / 10,
      }));
      set({ physicalLayout: keys });
    } catch (e) {
      console.error("Failed to fetch physical layout:", e);
    }
  },

  fetchLiveKeymap: async () => {
    try {
      const resolved = await invoke<ResolvedKeymap>("get_resolved_keymap");
      console.log("fetchLiveKeymap: received", resolved.layers.length, "layers",
        resolved.layers.map(l => `${l.name}(id=${l.id}, bindings=${l.bindings.length})`));
      const layers: Layer[] = resolved.layers.map((l) => ({
        name: l.name,
        index: l.id,
        bindings: l.bindings,
      }));
      set({ liveKeymap: layers });
    } catch (e) {
      console.error("Failed to fetch live keymap:", e);
    }
  },
});
