import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback, useRef } from "preact/hooks";
import { KeyboardSvg } from "./components/KeyboardSvg.tsx";
import { useBuild } from "./components/BuildConsole.tsx";
import { BindingPicker } from "./components/BindingPicker.tsx";
import { ComboOverlay } from "./components/ComboOverlay.tsx";
import { ComboEditor } from "./components/ComboEditor.tsx";
import { BehaviorEditor } from "./components/BehaviorEditor.tsx";
import { StatusBar, type ConnectionStatus } from "./components/StatusBar.tsx";
import type { Binding, Behavior, Combo, Keymap } from "./lib/types.ts";

export function App() {
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Device connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: "disconnected",
  });

  // Sidebar tab
  const [sidebarTab, setSidebarTab] = useState<"combos" | "behaviors">("combos");
  const [showComboOverlay, setShowComboOverlay] = useState(false);

  // Combo editing state
  const [selectedCombo, setSelectedCombo] = useState<number | null>(null);
  const [isPickingPositions, setIsPickingPositions] = useState(false);
  const [pickingPositions, setPickingPositions] = useState<Set<number>>(new Set());
  const [editingComboBinding, setEditingComboBinding] = useState<number | null>(null);

  // Clipboard for copy/paste bindings
  const clipboardRef = useRef<Binding | null>(null);

  // Context menus
  const [keyContextMenu, setKeyContextMenu] = useState<{
    pos: number;
    x: number;
    y: number;
  } | null>(null);

  // Undo history
  const historyRef = useRef<Keymap[]>([]);
  const MAX_HISTORY = 50;

  /** Wrap setKeymap to push current state onto undo stack */
  const updateKeymap = useCallback(
    (updater: (prev: Keymap | null) => Keymap | null) => {
      setKeymap((prev) => {
        if (prev) {
          const stack = historyRef.current;
          stack.push(structuredClone(prev));
          if (stack.length > MAX_HISTORY) stack.shift();
        }
        return updater(prev);
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    const stack = historyRef.current;
    if (stack.length === 0) return;
    const prev = stack.pop()!;
    setKeymap(prev); // Direct set without pushing to history
    setIsDirty(stack.length > 0 || true); // Still dirty since it differs from saved
  }, []);

  // Build state
  const build = useBuild();

  useEffect(() => {
    invoke<Keymap>("load_keymap")
      .then(setKeymap)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Ctrl+Z undo shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  // ── Key layer binding editing ─────────────────────────────────────────

  const handleKeyClick = useCallback(
    (pos: number) => {
      // If picking combo positions, toggle the position
      if (isPickingPositions) {
        setPickingPositions((prev) => {
          const next = new Set(prev);
          if (next.has(pos)) {
            next.delete(pos);
          } else {
            next.add(pos);
          }
          return next;
        });
        return;
      }

      // Normal key editing
      setSelectedKey(pos);
    },
    [isPickingPositions],
  );

  const handleKeyContextMenu = useCallback(
    (pos: number, x: number, y: number) => {
      if (isPickingPositions) return;
      setKeyContextMenu({ pos, x, y });
    },
    [isPickingPositions],
  );

  const handleCopyBinding = useCallback(
    (pos: number) => {
      if (!keymap) return;
      const binding = keymap.layers[activeLayer].bindings[pos];
      if (binding) clipboardRef.current = structuredClone(binding);
    },
    [keymap, activeLayer],
  );

  const handlePasteBinding = useCallback(
    (pos: number) => {
      if (!keymap || !clipboardRef.current) return;
      const pasted = structuredClone(clipboardRef.current);
      updateKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map((layer, li) =>
            li === activeLayer
              ? {
                  ...layer,
                  bindings: layer.bindings.map((b, bi) =>
                    bi === pos ? pasted : b,
                  ),
                }
              : layer,
          ),
        };
      });
      setIsDirty(true);
    },
    [keymap, activeLayer],
  );

  const handleSetKeyBinding = useCallback(
    (pos: number, binding: Binding) => {
      if (!keymap) return;
      updateKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map((layer, li) =>
            li === activeLayer
              ? {
                  ...layer,
                  bindings: layer.bindings.map((b, bi) =>
                    bi === pos ? binding : b,
                  ),
                }
              : layer,
          ),
        };
      });
      setIsDirty(true);
    },
    [keymap, activeLayer],
  );

  const handlePickerSave = useCallback(
    (newBinding: Binding) => {
      if (!keymap) return;

      // If we're editing a combo's binding
      if (editingComboBinding !== null) {
        updateKeymap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            combos: prev.combos.map((c, i) =>
              i === editingComboBinding ? { ...c, binding: newBinding } : c,
            ),
          };
        });
        setIsDirty(true);
        setEditingComboBinding(null);
        return;
      }

      // Normal key binding editing
      if (selectedKey === null) return;
      updateKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map((layer, li) =>
            li === activeLayer
              ? {
                  ...layer,
                  bindings: layer.bindings.map((b, bi) =>
                    bi === selectedKey ? newBinding : b,
                  ),
                }
              : layer,
          ),
        };
      });
      setIsDirty(true);
      setSelectedKey(null);
    },
    [keymap, selectedKey, activeLayer, editingComboBinding],
  );

  const handlePickerClose = useCallback(() => {
    setSelectedKey(null);
    setEditingComboBinding(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!keymap) return;
    setSaving(true);
    try {
      await invoke("save_keymap", { keymap });
      setIsDirty(false);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [keymap]);

  // ── Combo editing ────────────────────────────────────────────────────

  const handleSelectCombo = useCallback(
    (index: number | null) => {
      setSelectedCombo(index);
      setIsPickingPositions(false);
      // When selecting a combo, initialize picking positions from it
      if (index !== null && keymap) {
        const combo = keymap.combos[index];
        if (combo) {
          setPickingPositions(new Set(combo.positions));
        }
      } else {
        setPickingPositions(new Set());
      }
    },
    [keymap],
  );

  const handleUpdateCombo = useCallback(
    (index: number, combo: Combo) => {
      if (!keymap) return;
      updateKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          combos: prev.combos.map((c, i) => (i === index ? combo : c)),
        };
      });
      setIsDirty(true);
    },
    [keymap],
  );

  const handleDeleteCombo = useCallback(
    (index: number) => {
      if (!keymap) return;
      updateKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          combos: prev.combos.filter((_, i) => i !== index),
        };
      });
      setSelectedCombo(null);
      setIsPickingPositions(false);
      setPickingPositions(new Set());
      setIsDirty(true);
    },
    [keymap],
  );

  const handleDuplicateCombo = useCallback(
    (index: number) => {
      if (!keymap) return;
      const src = keymap.combos[index];
      if (!src) return;
      const dup: Combo = {
        ...structuredClone(src),
        name: `${src.name}_copy`,
      };
      updateKeymap((prev) => {
        if (!prev) return prev;
        return { ...prev, combos: [...prev.combos, dup] };
      });
      setSelectedCombo(keymap.combos.length);
      setIsDirty(true);
    },
    [keymap],
  );

  const handleAddCombo = useCallback(() => {
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
    updateKeymap((prev) => {
      if (!prev) return prev;
      return { ...prev, combos: [...prev.combos, newCombo] };
    });
    const newIndex = keymap.combos.length;
    setSelectedCombo(newIndex);
    setIsPickingPositions(true);
    setPickingPositions(new Set());
    setIsDirty(true);
  }, [keymap]);

  const handleStartPickingPositions = useCallback(() => {
    if (selectedCombo === null || !keymap) return;
    const combo = keymap.combos[selectedCombo];
    if (combo) {
      setPickingPositions(new Set(combo.positions));
    }
    setIsPickingPositions((prev) => {
      if (prev) {
        // Finishing picking: commit positions to the combo
        if (selectedCombo !== null && keymap) {
          updateKeymap((prevKm) => {
            if (!prevKm) return prevKm;
            return {
              ...prevKm,
              combos: prevKm.combos.map((c, i) =>
                i === selectedCombo
                  ? { ...c, positions: Array.from(pickingPositions).sort((a, b) => a - b) }
                  : c,
              ),
            };
          });
          setIsDirty(true);
        }
        return false;
      }
      return true;
    });
  }, [selectedCombo, keymap, pickingPositions]);

  // Sync picking positions back to combo when they change during picking mode
  useEffect(() => {
    if (isPickingPositions && selectedCombo !== null && keymap) {
      setKeymap((prev) => {
        if (!prev) return prev;
        const newPositions = Array.from(pickingPositions).sort((a, b) => a - b);
        const current = prev.combos[selectedCombo];
        if (!current) return prev;
        // Only update if actually different
        if (
          newPositions.length === current.positions.length &&
          newPositions.every((v, i) => v === current.positions[i])
        ) {
          return prev;
        }
        return {
          ...prev,
          combos: prev.combos.map((c, i) =>
            i === selectedCombo ? { ...c, positions: newPositions } : c,
          ),
        };
      });
      setIsDirty(true);
    }
  }, [pickingPositions, isPickingPositions, selectedCombo]);

  const handleOpenComboBindingPicker = useCallback(
    (comboIndex: number) => {
      setEditingComboBinding(comboIndex);
    },
    [],
  );

  const handleComboOverlayClick = useCallback(
    (index: number) => {
      setSelectedCombo(index);
      setIsPickingPositions(false);
      if (keymap) {
        const combo = keymap.combos[index];
        if (combo) {
          setPickingPositions(new Set(combo.positions));
        }
      }
    },
    [keymap],
  );

  const handlePositionClick = useCallback(
    (pos: number) => {
      if (!isPickingPositions) return;
      setPickingPositions((prev) => {
        const next = new Set(prev);
        if (next.has(pos)) {
          next.delete(pos);
        } else {
          next.add(pos);
        }
        return next;
      });
    },
    [isPickingPositions],
  );

  // ── Layer management ─────────────────────────────────────────────────

  const [renamingLayer, setRenamingLayer] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [layerContextMenu, setLayerContextMenu] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const handleAddLayer = useCallback(() => {
    if (!keymap) return;
    const newName = `LAYER${keymap.layers.length}`;
    const transBinding: Binding = { action: "trans", params: [] };
    const newLayer = {
      name: newName,
      index: keymap.layers.length,
      bindings: Array.from({ length: 38 }, () => ({ ...transBinding })),
    };
    updateKeymap((prev) => {
      if (!prev) return prev;
      return { ...prev, layers: [...prev.layers, newLayer] };
    });
    setActiveLayer(keymap.layers.length);
    setIsDirty(true);
  }, [keymap]);

  const handleDeleteLayer = useCallback(
    (delIdx: number) => {
      if (!keymap || delIdx === 0) return; // Never delete BASE
      updateKeymap((prev) => {
        if (!prev) return prev;
        // Adjust lt_th/tog binding params across all layers
        const adjustedLayers = prev.layers
          .filter((_, i) => i !== delIdx)
          .map((layer, newIdx) => ({
            ...layer,
            index: newIdx,
            bindings: layer.bindings.map((b) => {
              if (["lt_th", "lt", "tog", "mo", "sl", "to"].includes(b.action)) {
                const ref = parseInt(b.params[0], 10);
                if (isNaN(ref)) return b;
                if (ref === delIdx) {
                  return { ...b, params: ["0", ...b.params.slice(1)] };
                }
                if (ref > delIdx) {
                  return {
                    ...b,
                    params: [String(ref - 1), ...b.params.slice(1)],
                  };
                }
              }
              return b;
            }),
          }));
        // Adjust combo layer references
        const adjustedCombos = prev.combos.map((c) => ({
          ...c,
          layers: c.layers
            .filter((l) => l !== delIdx)
            .map((l) => (l > delIdx ? l - 1 : l)),
        }));
        return { ...prev, layers: adjustedLayers, combos: adjustedCombos };
      });
      setActiveLayer((prev) => {
        if (prev === delIdx) return 0;
        if (prev > delIdx) return prev - 1;
        return prev;
      });
      setIsDirty(true);
    },
    [keymap],
  );

  const handleStartRename = useCallback(
    (index: number) => {
      if (!keymap) return;
      setRenamingLayer(index);
      setRenameValue(keymap.layers[index].name);
    },
    [keymap],
  );

  const handleFinishRename = useCallback(() => {
    if (renamingLayer === null || !keymap) {
      setRenamingLayer(null);
      return;
    }
    const trimmed = renameValue.trim().toUpperCase().replace(/\s+/g, "_");
    if (trimmed.length === 0) {
      setRenamingLayer(null);
      return;
    }
    updateKeymap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map((l, i) =>
          i === renamingLayer ? { ...l, name: trimmed } : l,
        ),
      };
    });
    setIsDirty(true);
    setRenamingLayer(null);
  }, [renamingLayer, renameValue, keymap]);

  const handleDuplicateLayer = useCallback(
    (srcIdx: number) => {
      if (!keymap) return;
      const src = keymap.layers[srcIdx];
      const newLayer = {
        name: `${src.name}_COPY`,
        index: keymap.layers.length,
        bindings: structuredClone(src.bindings),
      };
      updateKeymap((prev) => {
        if (!prev) return prev;
        return { ...prev, layers: [...prev.layers, newLayer] };
      });
      setActiveLayer(keymap.layers.length);
      setIsDirty(true);
    },
    [keymap],
  );

  // ── Behavior editing ─────────────────────────────────────────────────

  const handleBehaviorsChange = useCallback(
    (behaviors: Behavior[]) => {
      if (!keymap) return;
      updateKeymap((prev) => {
        if (!prev) return prev;
        return { ...prev, behaviors };
      });
      setIsDirty(true);
    },
    [keymap],
  );

  // ── Render ───────────────────────────────────────────────────────────

  if (error) return <div class="min-h-screen bg-surface text-red-400 p-8">{error}</div>;
  if (!keymap) return <div class="min-h-screen bg-surface text-text p-8">Loading...</div>;

  // Determine what the BindingPicker should show
  const pickerBinding =
    editingComboBinding !== null
      ? keymap.combos[editingComboBinding]?.binding ?? null
      : selectedKey !== null
        ? keymap.layers[activeLayer].bindings[selectedKey] ?? null
        : null;

  const pickerPosition =
    editingComboBinding !== null ? -1 : selectedKey ?? -1;

  const showPicker =
    (editingComboBinding !== null && pickerBinding !== null) ||
    (selectedKey !== null && pickerBinding !== null);

  // Highlighted keys: selected key + combo positions
  const highlightedKeys = new Set<number>();
  if (selectedKey !== null) {
    highlightedKeys.add(selectedKey);
  }
  if (selectedCombo !== null) {
    const combo = keymap.combos[selectedCombo];
    if (combo) {
      for (const p of combo.positions) {
        highlightedKeys.add(p);
      }
    }
  }

  return (
    <div class="h-screen bg-surface text-text flex flex-col overflow-clip font-sans">
      {/* ── Header ── */}
      <div class="flex items-center gap-3 px-4 h-10 bg-surface-alt border-b border-overlay/30 shrink-0">
        <span class="text-sm font-semibold tracking-wide text-text">TOTEM</span>
        <div class="flex-1" />
        <div class="flex items-center gap-2">
          {isDirty && (
            <span class="w-1.5 h-1.5 rounded-full bg-primary" title="Unsaved changes" />
          )}
          <button
            class={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              historyRef.current.length > 0
                ? "text-subtext hover:text-text hover:bg-overlay/30"
                : "text-overlay/40 cursor-default"
            }`}
            onClick={historyRef.current.length > 0 ? handleUndo : undefined}
            title="Ctrl+Z"
          >
            Undo
          </button>
          <button
            class={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isDirty
                ? "text-primary hover:bg-primary/20"
                : "text-overlay/40 cursor-default"
            }`}
            onClick={isDirty ? handleSave : undefined}
            disabled={!isDirty || saving}
          >
            Save
          </button>
          <button
            class={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              build.building
                ? "text-overlay/40 cursor-not-allowed"
                : "text-[#a6e3a1] hover:bg-[#a6e3a1]/20"
            }`}
            onClick={build.building ? undefined : build.startBuild}
            disabled={build.building}
          >
            {build.building ? "Building..." : "Build"}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div class="flex-1 flex flex-row overflow-clip">
        {/* Keyboard column */}
        <div class="flex-1 min-w-0 flex flex-col overflow-clip">
          {/* Layer tab strip */}
          <div class="flex items-center gap-1 px-3 h-8 bg-surface border-b border-overlay/30 shrink-0">
            {keymap.layers.map((l, i) => (
              <div key={i} class="flex items-center">
                {renamingLayer === i ? (
                  <div class="flex items-center gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onInput={(e) =>
                        setRenameValue((e.target as HTMLInputElement).value)
                      }
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename();
                        if (e.key === "Escape") setRenamingLayer(null);
                      }}
                      class="px-2 py-0.5 rounded text-xs font-medium bg-surface border border-primary
                             text-text outline-none w-20"
                      // biome-ignore lint/a11y/noAutofocus: rename input needs focus
                      autoFocus
                    />
                    {i > 0 && (
                      <button
                        class="p-0.5 rounded text-xs text-[#f38ba8] hover:bg-[#f38ba8]/20
                               transition-colors"
                        onClick={() => {
                          setRenamingLayer(null);
                          handleDeleteLayer(i);
                        }}
                        title={`Delete ${l.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    class={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      i === activeLayer
                        ? "bg-primary/20 text-primary"
                        : "text-subtext hover:text-text hover:bg-overlay/20"
                    }`}
                    onClick={() => setActiveLayer(i)}
                    onDblClick={() => handleStartRename(i)}
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
            <button
              class="px-1.5 py-0.5 rounded text-xs transition-colors
                     text-subtext hover:text-text hover:bg-overlay/20"
              onClick={handleAddLayer}
              title="Add layer"
            >
              +
            </button>

            <div class="flex-1" />

            <button
              class={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                showComboOverlay
                  ? "bg-[#fab387]/20 text-[#fab387]"
                  : "text-subtext hover:text-text hover:bg-overlay/20"
              }`}
              onClick={() => setShowComboOverlay((v) => !v)}
              title="Toggle combo overlay"
            >
              Combos
            </button>
          </div>

          {/* Keyboard SVG area */}
          <div class="flex-1 flex items-center justify-center p-6 min-h-0">
            <div class="relative w-full h-full">
              <KeyboardSvg
                layer={keymap.layers[activeLayer]}
                onKeyClick={handleKeyClick}
                onKeyContextMenu={handleKeyContextMenu}
                highlightedKeys={highlightedKeys.size > 0 ? highlightedKeys : undefined}
              />
              {(showComboOverlay || selectedCombo !== null) && (
                <ComboOverlay
                  combos={keymap.combos}
                  selectedCombo={selectedCombo}
                  onComboClick={handleComboOverlayClick}
                  pickingPositions={isPickingPositions ? pickingPositions : null}
                  onPositionClick={handlePositionClick}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div
          class="shrink-0 flex flex-col border-l border-overlay/30 bg-surface-alt"
          style="width:340px"
        >
          {/* Sidebar tab strip */}
          <div class="flex items-center border-b border-overlay/30 shrink-0">
            {(["combos", "behaviors"] as const).map((tab) => (
              <button
                key={tab}
                class={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  sidebarTab === tab
                    ? "text-text border-b-2 border-primary"
                    : "text-subtext hover:text-text"
                }`}
                onClick={() => setSidebarTab(tab)}
              >
                {tab === "combos"
                  ? `Combos (${keymap.combos.length})`
                  : `Behaviors (${keymap.behaviors.length})`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div class="flex-1 overflow-y-auto">
            {sidebarTab === "combos" && (
              <ComboEditor
                combos={keymap.combos}
                selectedCombo={selectedCombo}
                layerNames={keymap.layers.map((l) => l.name)}
                onSelectCombo={handleSelectCombo}
                onUpdateCombo={handleUpdateCombo}
                onDeleteCombo={handleDeleteCombo}
                onDuplicateCombo={handleDuplicateCombo}
                onAddCombo={handleAddCombo}
                isPickingPositions={isPickingPositions}
                onStartPickingPositions={handleStartPickingPositions}
                onOpenBindingPicker={handleOpenComboBindingPicker}
              />
            )}
            {sidebarTab === "behaviors" && (
              <BehaviorEditor
                behaviors={keymap.behaviors}
                onChange={handleBehaviorsChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar (status + build output) ── */}
      <StatusBar
        status={connectionStatus}
        onStatusChange={setConnectionStatus}
        buildLines={build.lines}
        buildExitCode={build.exitCode}
        buildExpanded={build.expanded}
        setBuildExpanded={build.setExpanded}
        building={build.building}
      />

      {/* ── Binding Picker Modal ── */}
      {showPicker && pickerBinding && (
        <BindingPicker
          binding={pickerBinding}
          position={pickerPosition}
          layerNames={keymap.layers.map((l) => l.name)}
          onSave={handlePickerSave}
          onClose={handlePickerClose}
        />
      )}

      {/* ── Layer context menu ── */}
      {layerContextMenu && (
        <div
          class="fixed inset-0 z-50"
          onClick={() => setLayerContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setLayerContextMenu(null); }}
        >
          <div
            class="absolute bg-surface border border-overlay/40 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={`left:${layerContextMenu.x}px;top:${layerContextMenu.y}px`}
          >
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleStartRename(layerContextMenu.index);
                setLayerContextMenu(null);
              }}
            >
              Rename
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleDuplicateLayer(layerContextMenu.index);
                setLayerContextMenu(null);
              }}
            >
              Duplicate
            </button>
            {layerContextMenu.index > 0 && (
              <button
                class="w-full text-left px-3 py-1.5 text-xs text-[#f38ba8] hover:bg-[#f38ba8]/10 transition-colors"
                onClick={() => {
                  handleDeleteLayer(layerContextMenu.index);
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
          class="fixed inset-0 z-50"
          onClick={() => setKeyContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setKeyContextMenu(null); }}
        >
          <div
            class="absolute bg-surface border border-overlay/40 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={`left:${keyContextMenu.x}px;top:${keyContextMenu.y}px`}
          >
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                setSelectedKey(keyContextMenu.pos);
                setKeyContextMenu(null);
              }}
            >
              Edit
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleCopyBinding(keyContextMenu.pos);
                setKeyContextMenu(null);
              }}
            >
              Copy
            </button>
            <button
              class={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                clipboardRef.current
                  ? "text-text hover:bg-overlay/20"
                  : "text-overlay/40 cursor-default"
              }`}
              onClick={() => {
                if (clipboardRef.current) {
                  handlePasteBinding(keyContextMenu.pos);
                }
                setKeyContextMenu(null);
              }}
            >
              Paste
            </button>
            <div class="h-px bg-overlay/30 my-0.5" />
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleSetKeyBinding(keyContextMenu.pos, { action: "trans", params: [] });
                setKeyContextMenu(null);
              }}
            >
              Set Transparent
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                handleSetKeyBinding(keyContextMenu.pos, { action: "none", params: [] });
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
