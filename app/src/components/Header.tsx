import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStore } from "../store/index.ts";
import logo from "../assets/logo.svg";

export function Header() {
  const {
    isDirty, saving, undoStack, undo, saveKeymap,
    building, startBuild,
  } = useStore();

  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentWindow().isMaximized().then((v) => { if (!cancelled) setMaximized(v); });
    return () => { cancelled = true; };
  }, []);

  const handleMinimize = useCallback(() => getCurrentWindow().minimize(), []);
  const handleMaximize = useCallback(async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setMaximized(false);
    } else {
      await win.maximize();
      setMaximized(true);
    }
  }, []);
  const handleClose = useCallback(() => getCurrentWindow().close(), []);
  const handleDrag = useCallback((e: React.MouseEvent) => {
    // data-tauri-drag-region doesn't work with CSS transform scaling,
    // so we trigger dragging manually — skip if clicking a button
    if ((e.target as HTMLElement).closest("button")) return;
    getCurrentWindow().startDragging();
  }, []);

  return (
    <div
      onMouseDown={handleDrag}
      className="flex items-center gap-3 px-4 h-10 bg-surface-alt border-b border-overlay/30 shrink-0 select-none"
    >
      <img src={logo} alt="Keysmith" className="h-7 w-auto" draggable={false} />
      <span className="text-sm font-semibold tracking-wide text-text">Keysmith</span>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Unsaved changes" />
        )}
        <button
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            undoStack.length > 0
              ? "text-subtext hover:text-text hover:bg-overlay/30"
              : "text-overlay/40 cursor-default"
          }`}
          onClick={undoStack.length > 0 ? undo : undefined}
          title="Ctrl+Z"
        >
          Undo
        </button>
        <button
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isDirty
              ? "text-primary hover:bg-primary/20"
              : "text-overlay/40 cursor-default"
          }`}
          onClick={isDirty ? saveKeymap : undefined}
          disabled={!isDirty || saving}
        >
          Save
        </button>
        <button
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            building
              ? "text-overlay/40 cursor-not-allowed"
              : "text-[#a6e3a1] hover:bg-[#a6e3a1]/20"
          }`}
          onClick={building ? undefined : startBuild}
          disabled={building}
        >
          {building ? "Building..." : "Build"}
        </button>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-overlay/30" />

      {/* Window controls */}
      <div className="flex items-center">
        <button
          className="w-8 h-8 flex items-center justify-center rounded text-sm text-text/70 hover:text-text hover:bg-overlay/30 transition-colors"
          onClick={handleMinimize}
          title="Minimize"
        >
          &#x2013;
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded text-sm text-text/70 hover:text-text hover:bg-overlay/30 transition-colors"
          onClick={handleMaximize}
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? "\u29C9" : "\u25A1"}
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded text-sm text-text/70 hover:text-[#f38ba8] hover:bg-[#f38ba8]/20 transition-colors"
          onClick={handleClose}
          title="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}
