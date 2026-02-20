import { useStore } from "../store/index.ts";
import { KeyboardSvg } from "./KeyboardSvg.tsx";
import { ComboOverlay } from "./ComboOverlay.tsx";

export function KeyboardView() {
  const {
    keymap, activeLayer, selectedKey, selectedCombo,
    isPickingPositions, pickingPositions, showComboOverlay,
    renamingLayer, renameValue,
    keyContextMenu, layerContextMenu,
    physicalLayout, liveKeymap,
    setActiveLayer, selectKey,
    selectCombo, togglePosition,
    setRenamingLayer, setRenameValue,
    setKeyContextMenu, setLayerContextMenu,
    deleteLayer, renameLayer: storeRenameLayer, duplicateLayer,
    setBinding, pasteBinding, copyBinding, clipboard,
  } = useStore();

  if (!keymap) return null;

  // Only use the device's physical layout — no fallback
  const layout = physicalLayout;

  // Only show content when device data is available
  const displayLayers = liveKeymap;
  const connected = layout !== null && displayLayers !== null;
  const safeActiveLayer = connected ? Math.min(activeLayer, displayLayers.length - 1) : 0;

  // ── Handlers ──

  const handleKeyClick = (pos: number) => {
    if (isPickingPositions) {
      togglePosition(pos);
      return;
    }
    selectKey(pos);
  };

  const handleKeyContextMenu = (pos: number, x: number, y: number) => {
    if (isPickingPositions) return;
    setKeyContextMenu({ pos, x, y });
  };

  const handleStartRename = (index: number) => {
    if (!displayLayers) return;
    setRenamingLayer(index);
    setRenameValue(displayLayers[index].name);
  };

  const handleFinishRename = () => {
    if (renamingLayer === null) return;
    const trimmed = renameValue.trim().toUpperCase().replace(/\s+/g, "_");
    if (trimmed.length > 0) {
      storeRenameLayer(renamingLayer, trimmed);
    }
    setRenamingLayer(null);
  };

  // Highlighted keys: selected key + combo positions
  const highlightedKeys = new Set<number>();
  if (selectedKey !== null) highlightedKeys.add(selectedKey);
  if (selectedCombo !== null) {
    const combo = keymap.combos[selectedCombo];
    if (combo) for (const p of combo.positions) highlightedKeys.add(p);
  }

  if (!connected) {
    return (
      <div style={{ flex: "1 1 0%" }} className="min-w-0 min-h-0 flex flex-col items-center justify-center overflow-hidden">
        <span className="text-subtext text-sm">Connect a device to get started</span>
      </div>
    );
  }

  return (
    <div style={{ flex: "1 1 0%" }} className="min-w-0 min-h-0 flex flex-col overflow-hidden">
      {/* Layer tab strip */}
      <div className="flex items-center gap-1 px-3 h-8 bg-surface border-b border-overlay/30 shrink-0">
        {displayLayers.map((l, i) => (
          <div key={i} className="flex items-center">
            {renamingLayer === i ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFinishRename();
                    if (e.key === "Escape") setRenamingLayer(null);
                  }}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-surface border border-primary
                         text-text outline-none w-20"
                  // biome-ignore lint/a11y/noAutofocus: rename input needs focus
                  autoFocus
                />
                {i > 0 && (
                  <button
                    className="p-0.5 rounded text-xs text-[#f38ba8] hover:bg-[#f38ba8]/20
                           transition-colors"
                    onClick={() => {
                      setRenamingLayer(null);
                      deleteLayer(i);
                    }}
                    title={`Delete ${l.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <button
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  i === activeLayer
                    ? "bg-primary/20 text-primary"
                    : "text-subtext hover:text-text hover:bg-overlay/20"
                }`}
                onClick={() => setActiveLayer(i)}
                onDoubleClick={() => handleStartRename(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setLayerContextMenu({ index: i, x: e.clientX, y: e.clientY });
                }}
              >
                {l.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Keyboard SVG area */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div className="relative w-full h-full">
          <KeyboardSvg
            layer={displayLayers[safeActiveLayer]}
            layout={layout}
            onKeyClick={handleKeyClick}
            onKeyContextMenu={handleKeyContextMenu}
            highlightedKeys={highlightedKeys.size > 0 ? highlightedKeys : undefined}
          />
          {(showComboOverlay || selectedCombo !== null) && (
            <ComboOverlay
              combos={keymap.combos}
              selectedCombo={selectedCombo}
              onComboClick={(index) => selectCombo(index)}
              pickingPositions={isPickingPositions ? pickingPositions : null}
              onPositionClick={(pos) => { if (isPickingPositions) togglePosition(pos); }}
              layout={layout}
            />
          )}
        </div>
      </div>

      {/* ── Layer context menu ── */}
      {layerContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setLayerContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setLayerContextMenu(null); }}
        >
          <div
            className="absolute bg-surface border border-overlay/40 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: layerContextMenu.x, top: layerContextMenu.y }}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleStartRename(layerContextMenu.index);
                setLayerContextMenu(null);
              }}
            >
              Rename
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                duplicateLayer(layerContextMenu.index);
                setLayerContextMenu(null);
              }}
            >
              Duplicate
            </button>
            {layerContextMenu.index > 0 && (
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[#f38ba8] hover:bg-[#f38ba8]/10 transition-colors"
                onClick={() => {
                  deleteLayer(layerContextMenu.index);
                  setLayerContextMenu(null);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Key context menu ── */}
      {keyContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setKeyContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setKeyContextMenu(null); }}
        >
          <div
            className="absolute bg-surface border border-overlay/40 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: keyContextMenu.x, top: keyContextMenu.y }}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                selectKey(keyContextMenu.pos);
                setKeyContextMenu(null);
              }}
            >
              Edit
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                const binding = displayLayers[safeActiveLayer].bindings[keyContextMenu.pos];
                if (binding) copyBinding(binding);
                setKeyContextMenu(null);
              }}
            >
              Copy
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                clipboard
                  ? "text-text hover:bg-overlay/20"
                  : "text-overlay/40 cursor-default"
              }`}
              onClick={() => {
                if (clipboard) pasteBinding(activeLayer, keyContextMenu.pos);
                setKeyContextMenu(null);
              }}
            >
              Paste
            </button>
            <div className="h-px bg-overlay/30 my-0.5" />
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                setBinding(activeLayer, keyContextMenu.pos, { action: "trans", params: [] });
                setKeyContextMenu(null);
              }}
            >
              Set Transparent
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                setBinding(activeLayer, keyContextMenu.pos, { action: "none", params: [] });
                setKeyContextMenu(null);
              }}
            >
              Set None
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
