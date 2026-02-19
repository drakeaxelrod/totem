import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { KeyboardSvg } from "./components/KeyboardSvg.tsx";
import { useBuild, BuildOutput } from "./components/BuildConsole.tsx";
import { BindingPicker } from "./components/BindingPicker.tsx";
import { ComboOverlay } from "./components/ComboOverlay.tsx";
import { ComboEditor } from "./components/ComboEditor.tsx";
import { BehaviorEditor } from "./components/BehaviorEditor.tsx";
import { Dialog } from "./components/Dialog.tsx";
import type { Binding, Behavior, Combo, Keymap } from "./lib/types.ts";

export function App() {
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combo editing state
  const [comboMode, setComboMode] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<number | null>(null);
  const [isPickingPositions, setIsPickingPositions] = useState(false);
  const [pickingPositions, setPickingPositions] = useState<Set<number>>(new Set());
  // When editing an existing combo's binding via BindingPicker
  const [editingComboBinding, setEditingComboBinding] = useState<number | null>(null);

  // Behavior editing state
  const [behaviorMode, setBehaviorMode] = useState(false);

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
      // If we're in combo position-picking mode, toggle the position
      if (comboMode && isPickingPositions) {
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

      // Normal key editing (only when not in combo mode)
      if (!comboMode) {
        setSelectedKey(pos);
      }
    },
    [comboMode, isPickingPositions],
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

  const handleToggleComboMode = useCallback(() => {
    setComboMode((prev) => {
      if (prev) {
        // Exiting combo mode: clean up
        setSelectedCombo(null);
        setIsPickingPositions(false);
        setPickingPositions(new Set());
        setEditingComboBinding(null);
      } else {
        // Entering combo mode: exit behavior mode
        setBehaviorMode(false);
      }
      return !prev;
    });
  }, []);

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

  const handleAddCombo = useCallback(() => {
    if (!keymap) return;
    const newCombo: Combo = {
      name: `combo_${keymap.combos.length}`,
      positions: [],
      binding: { action: "kp", params: ["A"] },
      timeout_ms: 80,
      layers: [],
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
              if (b.action === "lt_th" || b.action === "tog") {
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

  // ── Behavior editing ─────────────────────────────────────────────────

  const handleToggleBehaviorMode = useCallback(() => {
    setBehaviorMode((prev) => {
      if (!prev) {
        // Entering behavior mode: exit combo mode
        setComboMode(false);
        setSelectedCombo(null);
        setIsPickingPositions(false);
        setPickingPositions(new Set());
        setEditingComboBinding(null);
      }
      return !prev;
    });
  }, []);

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
    (selectedKey !== null && pickerBinding !== null && !comboMode);

  // Highlighted keys: selected key + combo positions when a combo is selected
  const highlightedKeys = new Set<number>();
  if (!comboMode && selectedKey !== null) {
    highlightedKeys.add(selectedKey);
  }
  if (comboMode && selectedCombo !== null) {
    const combo = keymap.combos[selectedCombo];
    if (combo) {
      for (const p of combo.positions) {
        highlightedKeys.add(p);
      }
    }
  }

  return (
    <div class="h-screen bg-surface text-text flex flex-col overflow-clip">
      {/* Header: mode toggles + save */}
      <div class="flex items-center gap-3 px-5 py-3 bg-surface-alt">
        {/* Layers mode toggle */}
        <button
          class={`px-5 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            !comboMode && !behaviorMode
              ? "bg-primary text-surface"
              : "text-text/70 hover:text-text hover:bg-overlay/30"
          }`}
          onClick={() => {
            setComboMode(false);
            setBehaviorMode(false);
            setSelectedCombo(null);
            setIsPickingPositions(false);
            setPickingPositions(new Set());
            setEditingComboBinding(null);
          }}
        >
          Layers
        </button>

        {/* Combo mode toggle */}
        <button
          class={`px-5 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            comboMode
              ? "bg-[#fab387] text-surface"
              : "text-text/70 hover:text-text hover:bg-overlay/30"
          }`}
          onClick={handleToggleComboMode}
        >
          Combos
        </button>

        {/* Behavior mode toggle */}
        <button
          class={`px-5 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            behaviorMode
              ? "bg-[#89b4fa] text-surface"
              : "text-text/70 hover:text-text hover:bg-overlay/30"
          }`}
          onClick={handleToggleBehaviorMode}
        >
          Behaviors
        </button>

        <div class="flex-1" />
        {/* Undo button */}
        <button
          class={`px-5 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            historyRef.current.length > 0
              ? "text-text/70 hover:text-text hover:bg-overlay/30"
              : "text-subtext/30 cursor-default"
          }`}
          onClick={historyRef.current.length > 0 ? handleUndo : undefined}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        {isDirty && (
          <span class="text-base text-primary/80 mr-2">Unsaved changes</span>
        )}
        <button
          class={`px-6 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            isDirty
              ? "bg-primary text-surface hover:brightness-110"
              : "bg-overlay/30 text-subtext cursor-default"
          }`}
          onClick={isDirty ? handleSave : undefined}
          disabled={!isDirty || saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          class={`px-6 py-2.5 rounded-lg text-lg font-medium transition-colors ${
            build.building
              ? "bg-overlay/40 text-subtext cursor-not-allowed"
              : "bg-[#a6e3a1] text-surface hover:brightness-110"
          }`}
          onClick={build.building ? undefined : build.startBuild}
          disabled={build.building}
        >
          {build.building ? "Building..." : "Build"}
        </button>
      </div>

      {/* Main content: keyboard + sidebar */}
      <div class="flex-1 overflow-clip relative">
        {/* Keyboard area — always full width */}
        <div class="absolute inset-0 flex items-center justify-center p-6">
          {/* Floating vertical layer bar (layers mode only) */}
          {!comboMode && !behaviorMode && (
            <div class="absolute left-4 top-1/4 -translate-y-1/2 flex flex-col gap-1 z-10">
              {keymap.layers.map((l, i) => (
                <div key={i} class="group relative flex items-center">
                  {renamingLayer === i ? (
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
                      class="px-3 py-2 rounded text-sm font-medium bg-surface border border-primary
                             text-text outline-none w-24"
                      // biome-ignore lint/a11y/noAutofocus: rename input needs focus
                      autoFocus
                    />
                  ) : (
                    <button
                      class={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap
                              min-w-[4.5rem] text-center ${
                        i === activeLayer
                          ? "bg-primary text-surface"
                          : "bg-surface-alt/80 text-text/70 hover:text-text hover:bg-overlay/30"
                      }`}
                      onClick={() => setActiveLayer(i)}
                      onDblClick={() => handleStartRename(i)}
                    >
                      {l.name}
                    </button>
                  )}
                  {/* Delete button (not for BASE layer) */}
                  {i > 0 && renamingLayer !== i && (
                    <button
                      class="absolute -right-5 opacity-0 group-hover:opacity-100 transition-opacity
                             text-[#f38ba8] hover:text-[#f38ba8]/80 text-xs font-bold"
                      onClick={() => handleDeleteLayer(i)}
                      title={`Delete ${l.name}`}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              {/* Add layer button */}
              <button
                class="px-3 py-2 rounded text-sm font-medium transition-colors
                       bg-surface-alt/60 text-subtext hover:text-text hover:bg-overlay/30
                       min-w-[4.5rem] text-center"
                onClick={handleAddLayer}
                title="Add new layer"
              >
                +
              </button>
            </div>
          )}

          {/* Keyboard + combo overlay wrapper */}
          <div class="relative w-full h-full">
            <KeyboardSvg
              layer={keymap.layers[activeLayer]}
              onKeyClick={handleKeyClick}
              highlightedKeys={highlightedKeys.size > 0 ? highlightedKeys : undefined}
            />
            {/* Combo overlay */}
            {comboMode && (
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

      {/* Build console */}
      <BuildOutput
        lines={build.lines}
        exitCode={build.exitCode}
        expanded={build.expanded}
        setExpanded={build.setExpanded}
      />

      {/* Combo editor panel */}
      {comboMode && createPortal(
        <div style="position:fixed;top:52px;right:16px;bottom:16px;width:360px;z-index:40;background:#313244;border-radius:12px;border:1px solid rgba(88,91,112,0.4);overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)">
          <ComboEditor
            combos={keymap.combos}
            selectedCombo={selectedCombo}
            layerNames={keymap.layers.map((l) => l.name)}
            onSelectCombo={handleSelectCombo}
            onUpdateCombo={handleUpdateCombo}
            onDeleteCombo={handleDeleteCombo}
            onAddCombo={handleAddCombo}
            isPickingPositions={isPickingPositions}
            onStartPickingPositions={handleStartPickingPositions}
            onOpenBindingPicker={handleOpenComboBindingPicker}
          />
        </div>,
        document.body
      )}

      {/* Behavior editor panel */}
      {behaviorMode && createPortal(
        <div style="position:fixed;top:52px;right:16px;bottom:16px;width:360px;z-index:40;background:#313244;border-radius:12px;border:1px solid rgba(88,91,112,0.4);overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)">
          <BehaviorEditor
            behaviors={keymap.behaviors}
            onChange={handleBehaviorsChange}
          />
        </div>,
        document.body
      )}

      {/* Binding Picker Modal */}
      {showPicker && pickerBinding && (
        <BindingPicker
          binding={pickerBinding}
          position={pickerPosition}
          layerNames={keymap.layers.map((l) => l.name)}
          onSave={handlePickerSave}
          onClose={handlePickerClose}
        />
      )}
    </div>
  );
}
