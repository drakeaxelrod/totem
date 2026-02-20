import { invoke, Channel } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import type { AppStore } from "./index.ts";

type BuildEvent =
  | { event: "stdout"; data: { line: string } }
  | { event: "stderr"; data: { line: string } }
  | { event: "exit"; data: { code: number } };

export type OutputLine = {
  text: string;
  kind: "stdout" | "stderr" | "status";
};

export interface BuildSlice {
  building: boolean;
  buildExpanded: boolean;
  buildLines: OutputLine[];
  buildExitCode: number | null;
  startBuild: () => Promise<void>;
  setBuildExpanded: (expanded: boolean) => void;
}

export const createBuildSlice: StateCreator<AppStore, [], [], BuildSlice> = (
  set,
  get,
) => ({
  building: false,
  buildExpanded: false,
  buildLines: [],
  buildExitCode: null,

  setBuildExpanded: (expanded) => set({ buildExpanded: expanded }),

  startBuild: async () => {
    set({ building: true, buildExpanded: true, buildLines: [], buildExitCode: null });

    const onEvent = new Channel<BuildEvent>();
    onEvent.onmessage = (event: BuildEvent) => {
      switch (event.event) {
        case "stdout":
          set({ buildLines: [...get().buildLines, { text: event.data.line, kind: "stdout" }] });
          break;
        case "stderr":
          set({ buildLines: [...get().buildLines, { text: event.data.line, kind: "stderr" }] });
          break;
        case "exit": {
          const statusLine: OutputLine = event.data.code === 0
            ? { text: "Build succeeded", kind: "status" }
            : { text: `Build failed (exit code ${event.data.code})`, kind: "status" };
          set({
            buildExitCode: event.data.code,
            building: false,
            buildLines: [...get().buildLines, statusLine],
          });
          break;
        }
      }
    };

    try {
      await invoke("start_build", { onEvent });
    } catch (e) {
      set({
        buildLines: [...get().buildLines, { text: String(e), kind: "stderr" }],
        building: false,
        buildExitCode: -1,
      });
    }
  },
});
