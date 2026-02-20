import { invoke } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import type {
  Keymap,
  Binding,
  Combo,
  Behavior,
  MouseConfig,
} from "../lib/types.ts";
import type { AppStore } from "./index.ts";

const MAX_HISTORY = 50;

export interface KeymapSlice {
  keymap: Keymap | null;
  isDirty: boolean;
  saving: boolean;
  error: string | null;
  undoStack: Keymap[];

  loadKeymap: () => Promise<void>;
  saveKeymap: () => Promise<void>;
  undo: () => void;

  /** Low-level: push current to undo stack, apply updater */
  updateKeymap: (updater: (prev: Keymap) => Keymap) => void;

  // ── Key bindings ──
  setBinding: (layer: number, pos: number, binding: Binding) => void;
  pasteBinding: (layer: number, pos: number) => void;

  // ── Combos ──
  addCombo: () => void;
  updateCombo: (index: number, combo: Combo) => void;
  deleteCombo: (index: number) => void;
  duplicateCombo: (index: number) => void;
  syncPickingPositions: (comboIndex: number, positions: Set<number>) => void;
  commitPickingPositions: (
    comboIndex: number,
    positions: Set<number>,
  ) => void;
  setComboBinding: (comboIndex: number, binding: Binding) => void;

  // ── Layers ──
  addLayer: () => void;
  deleteLayer: (index: number) => void;
  renameLayer: (index: number, name: string) => void;
  duplicateLayer: (index: number) => void;

  // ── Behaviors & Mouse ──
  setBehaviors: (behaviors: Behavior[]) => void;
  setMouseConfig: (config: MouseConfig) => void;
}

export const createKeymapSlice: StateCreator<AppStore, [], [], KeymapSlice> = (
  set,
  get,
) => ({
  keymap: null,
  isDirty: false,
  saving: false,
  error: null,
  undoStack: [],

  loadKeymap: async () => {
    try {
      const keymap = await invoke<Keymap>("load_keymap");
      set({ keymap, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveKeymap: async () => {
    const { keymap } = get();
    if (!keymap) return;
    set({ saving: true });
    try {
      await invoke("save_keymap", { keymap });
      set({ isDirty: false, saving: false });
    } catch (e) {
      set({ error: String(e), saving: false });
    }
  },

  undo: () => {
    const stack = [...get().undoStack];
    if (stack.length === 0) return;
    const prev = stack.pop()!;
    set({ keymap: prev, undoStack: stack, isDirty: true });
  },

  updateKeymap: (updater) => {
    const { keymap, undoStack } = get();
    if (!keymap) return;
    const newStack = [...undoStack, structuredClone(keymap)];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ keymap: updater(keymap), undoStack: newStack, isDirty: true });
  },

  // ── Key bindings ──

  setBinding: (layer, pos, binding) => {
    get().updateKeymap((km) => ({
      ...km,
      layers: km.layers.map((l, li) =>
        li === layer
          ? { ...l, bindings: l.bindings.map((b, bi) => (bi === pos ? binding : b)) }
          : l,
      ),
    }));
  },

  pasteBinding: (layer, pos) => {
    const { clipboard } = get();
    if (!clipboard) return;
    get().setBinding(layer, pos, structuredClone(clipboard));
  },

  // ── Combos ──

  addCombo: () => {
    const { keymap } = get();
    if (!keymap) return;
    const newCombo: Combo = {
      name: `combo_${keymap.combos.length}`,
      positions: [],
      binding: { action: "kp", params: ["A"] },
      timeout_ms: 80,
      layers: [],
      require_prior_idle_ms: null,
      slow_release: false,
    };
    get().updateKeymap((km) => ({ ...km, combos: [...km.combos, newCombo] }));
    set({
      selectedCombo: keymap.combos.length,
      isPickingPositions: true,
      pickingPositions: new Set(),
    });
  },

  updateCombo: (index, combo) => {
    get().updateKeymap((km) => ({
      ...km,
      combos: km.combos.map((c, i) => (i === index ? combo : c)),
    }));
  },

  deleteCombo: (index) => {
    get().updateKeymap((km) => ({
      ...km,
      combos: km.combos.filter((_, i) => i !== index),
    }));
    set({ selectedCombo: null, isPickingPositions: false, pickingPositions: new Set() });
  },

  duplicateCombo: (index) => {
    const { keymap } = get();
    if (!keymap) return;
    const src = keymap.combos[index];
    if (!src) return;
    const dup: Combo = { ...structuredClone(src), name: `${src.name}_copy` };
    get().updateKeymap((km) => ({ ...km, combos: [...km.combos, dup] }));
    set({ selectedCombo: keymap.combos.length });
  },

  syncPickingPositions: (comboIndex, positions) => {
    const { keymap } = get();
    if (!keymap) return;
    const newPositions = Array.from(positions).sort((a, b) => a - b);
    const current = keymap.combos[comboIndex];
    if (!current) return;
    if (
      newPositions.length === current.positions.length &&
      newPositions.every((v, i) => v === current.positions[i])
    )
      return;
    // Direct set without undo — this is a live preview
    set({
      keymap: {
        ...keymap,
        combos: keymap.combos.map((c, i) =>
          i === comboIndex ? { ...c, positions: newPositions } : c,
        ),
      },
      isDirty: true,
    });
  },

  commitPickingPositions: (comboIndex, positions) => {
    get().updateKeymap((km) => ({
      ...km,
      combos: km.combos.map((c, i) =>
        i === comboIndex
          ? { ...c, positions: Array.from(positions).sort((a, b) => a - b) }
          : c,
      ),
    }));
  },

  setComboBinding: (comboIndex, binding) => {
    get().updateKeymap((km) => ({
      ...km,
      combos: km.combos.map((c, i) =>
        i === comboIndex ? { ...c, binding } : c,
      ),
    }));
  },

  // ── Layers ──

  addLayer: () => {
    const { keymap } = get();
    if (!keymap) return;
    const newLayer = {
      name: `LAYER${keymap.layers.length}`,
      index: keymap.layers.length,
      bindings: Array.from({ length: 38 }, () => ({
        action: "trans",
        params: [] as string[],
      })),
    };
    get().updateKeymap((km) => ({ ...km, layers: [...km.layers, newLayer] }));
    set({ activeLayer: keymap.layers.length });
  },

  deleteLayer: (delIdx) => {
    const { keymap } = get();
    if (!keymap || delIdx === 0) return;
    get().updateKeymap((km) => {
      const adjustedLayers = km.layers
        .filter((_, i) => i !== delIdx)
        .map((layer, newIdx) => ({
          ...layer,
          index: newIdx,
          bindings: layer.bindings.map((b) => {
            if (
              ["lt_th", "lt", "tog", "mo", "sl", "to"].includes(b.action)
            ) {
              const ref = parseInt(b.params[0], 10);
              if (isNaN(ref)) return b;
              if (ref === delIdx)
                return { ...b, params: ["0", ...b.params.slice(1)] };
              if (ref > delIdx)
                return {
                  ...b,
                  params: [String(ref - 1), ...b.params.slice(1)],
                };
            }
            return b;
          }),
        }));
      const adjustedCombos = km.combos.map((c) => ({
        ...c,
        layers: c.layers
          .filter((l) => l !== delIdx)
          .map((l) => (l > delIdx ? l - 1 : l)),
      }));
      return { ...km, layers: adjustedLayers, combos: adjustedCombos };
    });
    set((s) => ({
      activeLayer:
        s.activeLayer === delIdx
          ? 0
          : s.activeLayer > delIdx
            ? s.activeLayer - 1
            : s.activeLayer,
    }));
  },

  renameLayer: (index, name) => {
    get().updateKeymap((km) => ({
      ...km,
      layers: km.layers.map((l, i) => (i === index ? { ...l, name } : l)),
    }));
  },

  duplicateLayer: (srcIdx) => {
    const { keymap } = get();
    if (!keymap) return;
    const src = keymap.layers[srcIdx];
    const newLayer = {
      name: `${src.name}_COPY`,
      index: keymap.layers.length,
      bindings: structuredClone(src.bindings),
    };
    get().updateKeymap((km) => ({ ...km, layers: [...km.layers, newLayer] }));
    set({ activeLayer: keymap.layers.length });
  },

  // ── Behaviors & Mouse ──

  setBehaviors: (behaviors) => {
    get().updateKeymap((km) => ({ ...km, behaviors }));
  },

  setMouseConfig: (mouse_config) => {
    get().updateKeymap((km) => ({ ...km, mouse_config }));
  },
});
