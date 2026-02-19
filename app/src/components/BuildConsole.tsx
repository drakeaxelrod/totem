import { invoke, Channel } from "@tauri-apps/api/core";
import { useState, useCallback } from "preact/hooks";

type BuildEvent =
  | { event: "stdout"; data: { line: string } }
  | { event: "stderr"; data: { line: string } }
  | { event: "exit"; data: { code: number } };

export type OutputLine = {
  text: string;
  kind: "stdout" | "stderr" | "status";
};

export function useBuild() {
  const [building, setBuilding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const startBuild = useCallback(async () => {
    setBuilding(true);
    setExpanded(true);
    setLines([]);
    setExitCode(null);

    const onEvent = new Channel<BuildEvent>();
    onEvent.onmessage = (event: BuildEvent) => {
      switch (event.event) {
        case "stdout":
          setLines((prev) => [
            ...prev,
            { text: event.data.line, kind: "stdout" },
          ]);
          break;
        case "stderr":
          setLines((prev) => [
            ...prev,
            { text: event.data.line, kind: "stderr" },
          ]);
          break;
        case "exit":
          setExitCode(event.data.code);
          setBuilding(false);
          if (event.data.code === 0) {
            setLines((prev) => [
              ...prev,
              { text: "Build succeeded", kind: "status" },
            ]);
          } else {
            setLines((prev) => [
              ...prev,
              {
                text: `Build failed (exit code ${event.data.code})`,
                kind: "status",
              },
            ]);
          }
          break;
      }
    };

    try {
      await invoke("start_build", { onEvent });
    } catch (e) {
      setLines((prev) => [...prev, { text: String(e), kind: "stderr" }]);
      setBuilding(false);
      setExitCode(-1);
    }
  }, []);

  return { building, startBuild, lines, exitCode, expanded, setExpanded };
}
