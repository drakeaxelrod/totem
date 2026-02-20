import type { StateCreator } from "zustand";
import type { Binding } from "../lib/types.ts";
import type { AppStore } from "./index.ts";

export interface UiSlice {
  activeLayer: number;
  selectedKey: number | null;
  sidebarTab: "combos" | "behaviors" | "mouse";
  showComboOverlay: boolean;
  selectedCombo: number | null;
  isPickingPositions: boolean;
  pickingPositions: Set<number>;
  editingComboBinding: number | null;
  clipboard: Binding | null;
  renamingLayer: number | null;
  renameValue: string;
  keyContextMenu: { pos: number; x: number; y: number } | null;
  layerContextMenu: { index: number; x: number; y: number } | null;

  setActiveLayer: (layer: number) => void;
  selectKey: (pos: number | null) => void;
  setSidebarTab: (tab: "combos" | "behaviors" | "mouse") => void;
  toggleComboOverlay: () => void;
  selectCombo: (index: number | null) => void;
  setIsPickingPositions: (picking: boolean) => void;
  setPickingPositions: (positions: Set<number>) => void;
  togglePosition: (pos: number) => void;
  setEditingComboBinding: (index: number | null) => void;
  copyBinding: (binding: Binding) => void;
  setRenamingLayer: (index: number | null) => void;
  setRenameValue: (value: string) => void;
  setKeyContextMenu: (
    menu: { pos: number; x: number; y: number } | null,
  ) => void;
  setLayerContextMenu: (
    menu: { index: number; x: number; y: number } | null,
  ) => void;
}

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (
  set,
  get,
) => ({
  activeLayer: 0,
  selectedKey: null,
  sidebarTab: "combos",
  showComboOverlay: false,
  selectedCombo: null,
  isPickingPositions: false,
  pickingPositions: new Set(),
  editingComboBinding: null,
  clipboard: null,
  renamingLayer: null,
  renameValue: "",
  keyContextMenu: null,
  layerContextMenu: null,

  setActiveLayer: (layer) => set({ activeLayer: layer }),
  selectKey: (pos) => set({ selectedKey: pos }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleComboOverlay: () =>
    set({ showComboOverlay: !get().showComboOverlay }),
  selectCombo: (index) => {
    const keymap = get().keymap;
    if (index !== null && keymap) {
      const combo = keymap.combos[index];
      set({
        selectedCombo: index,
        isPickingPositions: false,
        pickingPositions: combo ? new Set(combo.positions) : new Set(),
      });
    } else {
      set({
        selectedCombo: index,
        isPickingPositions: false,
        pickingPositions: new Set(),
      });
    }
  },
  setIsPickingPositions: (picking) => set({ isPickingPositions: picking }),
  setPickingPositions: (positions) => set({ pickingPositions: positions }),
  togglePosition: (pos) => {
    const next = new Set(get().pickingPositions);
    if (next.has(pos)) next.delete(pos);
    else next.add(pos);
    set({ pickingPositions: next });
  },
  setEditingComboBinding: (index) => set({ editingComboBinding: index }),
  copyBinding: (binding) =>
    set({ clipboard: structuredClone(binding) }),
  setRenamingLayer: (index) => set({ renamingLayer: index }),
  setRenameValue: (value) => set({ renameValue: value }),
  setKeyContextMenu: (menu) => set({ keyContextMenu: menu }),
  setLayerContextMenu: (menu) => set({ layerContextMenu: menu }),
});
