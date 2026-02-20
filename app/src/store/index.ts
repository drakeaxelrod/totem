import { create } from "zustand";
import { createKeymapSlice, type KeymapSlice } from "./keymap-slice.ts";
import { createUiSlice, type UiSlice } from "./ui-slice.ts";
import {
  createConnectionSlice,
  type ConnectionSlice,
} from "./connection-slice.ts";
import { createBuildSlice, type BuildSlice } from "./build-slice.ts";
import { createToastSlice, type ToastSlice } from "./toast-slice.ts";

export type AppStore = KeymapSlice &
  UiSlice &
  ConnectionSlice &
  BuildSlice &
  ToastSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createKeymapSlice(...a),
  ...createUiSlice(...a),
  ...createConnectionSlice(...a),
  ...createBuildSlice(...a),
  ...createToastSlice(...a),
}));
