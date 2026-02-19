import { invoke, Channel } from "@tauri-apps/api/core";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";

type BuildEvent =
  | { event: "stdout"; data: { line: string } }
  | { event: "stderr"; data: { line: string } }
  | { event: "exit"; data: { code: number } };

type OutputLine = {
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

export function BuildOutput({
  lines,
  exitCode,
  expanded,
  setExpanded,
}: {
  lines: OutputLine[];
  exitCode: number | null;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const el = outputRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  if (lines.length === 0) return null;

  const lineColor = (kind: OutputLine["kind"]) => {
    switch (kind) {
      case "stdout":
        return "text-text";
      case "stderr":
        return "text-[#f9e2af]";
      case "status":
        return exitCode === 0 ? "text-[#a6e3a1]" : "text-[#f38ba8]";
    }
  };

  return (
    <div class="flex flex-col border-t border-overlay/40">
      <div class="flex items-center gap-2 px-3 py-1 bg-surface-alt">
        {exitCode !== null && (
          <span
            class={`text-xs font-medium ${exitCode === 0 ? "text-[#a6e3a1]" : "text-[#f38ba8]"}`}
          >
            {exitCode === 0 ? "Succeeded" : `Failed (${exitCode})`}
          </span>
        )}
        <div class="flex-1" />
        <button
          class="text-xs text-subtext hover:text-text transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div
          ref={outputRef}
          class="bg-[#11111b] max-h-64 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed"
        >
          {lines.map((line, i) => (
            <div key={i} class={lineColor(line.kind)}>
              {line.text || "\u00a0"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
