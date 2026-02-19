import { useState, useCallback } from "preact/hooks";
import { getKeyLabel } from "../lib/keyLabels.ts";
import type { Binding, Combo } from "../lib/types.ts";

interface ComboEditorProps {
  combos: Combo[];
  selectedCombo: number | null;
  layerNames: string[];
  onSelectCombo: (index: number | null) => void;
  onUpdateCombo: (index: number, combo: Combo) => void;
  onDeleteCombo: (index: number) => void;
  onDuplicateCombo: (index: number) => void;
  onAddCombo: () => void;
  isPickingPositions: boolean;
  onStartPickingPositions: () => void;
  onOpenBindingPicker: (comboIndex: number) => void;
}

function bindingLabel(binding: Binding): string {
  const label = getKeyLabel(binding);
  return label.top ? `${label.top} ${label.main}` : label.main;
}

function positionsLabel(positions: number[]): string {
  if (positions.length === 0) return "none";
  return positions.sort((a, b) => a - b).join(", ");
}

// ── Inline detail editor (accordion body) ──────────────────────────

function ComboDetail({
  combo,
  index,
  onUpdate,
  onDelete,
  onStartPickingPositions,
  isPickingPositions,
  onOpenBindingPicker,
  layerNames,
}: {
  combo: Combo;
  index: number;
  onUpdate: (combo: Combo) => void;
  onDelete: () => void;
  onStartPickingPositions: () => void;
  isPickingPositions: boolean;
  onOpenBindingPicker: () => void;
  layerNames: string[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleNameChange = useCallback(
    (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      onUpdate({ ...combo, name: value });
    },
    [combo, onUpdate],
  );

  const handleTimeoutChange = useCallback(
    (e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(value) && value > 0) {
        onUpdate({ ...combo, timeout_ms: value });
      }
    },
    [combo, onUpdate],
  );

  const handleRequirePriorIdleToggle = useCallback(
    (enabled: boolean) => {
      onUpdate({
        ...combo,
        require_prior_idle_ms: enabled ? 150 : null,
      });
    },
    [combo, onUpdate],
  );

  const handleRequirePriorIdleChange = useCallback(
    (e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(value) && value > 0) {
        onUpdate({ ...combo, require_prior_idle_ms: value });
      }
    },
    [combo, onUpdate],
  );

  const handleSlowReleaseToggle = useCallback(() => {
    onUpdate({ ...combo, slow_release: !combo.slow_release });
  }, [combo, onUpdate]);

  const handleLayerToggle = useCallback(
    (layerIndex: number) => {
      const current = new Set(combo.layers);
      if (current.has(layerIndex)) {
        current.delete(layerIndex);
      } else {
        current.add(layerIndex);
      }
      onUpdate({ ...combo, layers: Array.from(current).sort() });
    },
    [combo, onUpdate],
  );

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }, [confirmDelete, onDelete]);

  const label = bindingLabel(combo.binding);

  return (
    <div class="flex flex-col gap-3 px-3 pb-3 pt-2 bg-surface-alt rounded-b-lg border border-t-0 border-[#fab387]/40">
      {/* Name */}
      <div class="flex flex-col gap-1">
        <label class="text-xs text-subtext font-medium">Name</label>
        <input
          type="text"
          value={combo.name}
          onInput={handleNameChange}
          placeholder={`combo_${index}`}
          class="w-full px-2 py-1 bg-surface rounded text-sm text-text
                 border border-overlay/50 outline-none focus:border-primary
                 placeholder:text-subtext/50"
        />
      </div>

      {/* Positions */}
      <div class="flex flex-col gap-1">
        <label class="text-xs text-subtext font-medium">Positions</label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-text font-mono">
            {combo.positions.length > 0
              ? positionsLabel(combo.positions)
              : "—"}
          </span>
          <button
            class={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              isPickingPositions
                ? "bg-[#fab387] text-surface"
                : "bg-surface text-subtext hover:text-text hover:bg-overlay/30 border border-overlay/50"
            }`}
            onClick={onStartPickingPositions}
          >
            {isPickingPositions ? "Done" : "Pick keys"}
          </button>
        </div>
      </div>

      {/* Binding */}
      <div class="flex flex-col gap-1">
        <label class="text-xs text-subtext font-medium">Binding</label>
        <button
          class="w-full text-left px-2 py-1 bg-surface rounded text-sm text-text
                 border border-overlay/50 hover:border-primary transition-colors"
          onClick={onOpenBindingPicker}
        >
          <code class="font-mono text-xs text-subtext">
            &{combo.binding.action}
            {combo.binding.params.length > 0 && ` ${combo.binding.params.join(" ")}`}
          </code>
          <span class="ml-2 text-text">{label}</span>
        </button>
      </div>

      {/* Timeout + Layers row */}
      <div class="flex gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-subtext font-medium">Timeout</label>
          <div class="flex items-center gap-1">
            <input
              type="number"
              value={combo.timeout_ms}
              onInput={handleTimeoutChange}
              min={10}
              max={500}
              step={5}
              class="w-20 px-2 py-1 bg-surface rounded text-sm text-text font-mono
                     border border-overlay/50 outline-none focus:border-primary"
            />
            <span class="text-xs text-subtext">ms</span>
          </div>
        </div>
      </div>

      {/* Require prior idle */}
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={combo.require_prior_idle_ms !== null}
              onChange={(e) =>
                handleRequirePriorIdleToggle((e.target as HTMLInputElement).checked)
              }
              class="accent-primary"
            />
            <span class="text-xs text-subtext font-medium">Require prior idle</span>
          </label>
          {combo.require_prior_idle_ms !== null && (
            <div class="flex items-center gap-1">
              <input
                type="number"
                value={combo.require_prior_idle_ms}
                onInput={handleRequirePriorIdleChange}
                min={10}
                max={2000}
                step={10}
                class="w-20 px-2 py-1 bg-surface rounded text-sm text-text font-mono
                       border border-overlay/50 outline-none focus:border-primary"
              />
              <span class="text-xs text-subtext">ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Slow release */}
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={combo.slow_release}
          onChange={handleSlowReleaseToggle}
          class="accent-primary"
        />
        <span class="text-xs text-subtext font-medium">Slow release</span>
      </label>

      {/* Layer filter */}
      <div class="flex flex-col gap-1">
        <label class="text-xs text-subtext font-medium">
          Active layers
          <span class="font-normal text-subtext/60 ml-1">(none = all)</span>
        </label>
        <div class="flex flex-wrap gap-1">
          {layerNames.map((name, i) => {
            const isActive = combo.layers.includes(i);
            return (
              <button
                key={name}
                class={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-surface text-subtext hover:text-text border border-transparent hover:bg-overlay/30"
                }`}
                onClick={() => handleLayerToggle(i)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete */}
      <button
        class={`self-start px-2 py-1 rounded text-xs transition-colors ${
          confirmDelete
            ? "bg-[#f38ba8] text-surface font-medium"
            : "text-[#f38ba8] hover:bg-[#f38ba8]/10"
        }`}
        onClick={handleDelete}
        onBlur={() => setConfirmDelete(false)}
      >
        {confirmDelete ? "Confirm Delete" : "Delete"}
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function ComboEditor({
  combos,
  selectedCombo,
  layerNames,
  onSelectCombo,
  onUpdateCombo,
  onDeleteCombo,
  onDuplicateCombo,
  onAddCombo,
  isPickingPositions,
  onStartPickingPositions,
  onOpenBindingPicker,
}: ComboEditorProps) {
  const selected = selectedCombo !== null ? combos[selectedCombo] : null;
  const [contextMenu, setContextMenu] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div class="flex flex-col h-full overflow-y-auto p-2 gap-1">
      {combos.map((combo, i) => {
        const isSelected = selectedCombo === i;
        const label = bindingLabel(combo.binding);

        return (
          <div key={i}>
            {/* Combo header row */}
            <button
              class={`w-full text-left px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? "bg-[#fab387]/15 border border-[#fab387]/40 rounded-t-lg border-b-0"
                  : "bg-surface hover:bg-overlay/20 border border-transparent rounded-lg"
              }`}
              onClick={() => onSelectCombo(isSelected ? null : i)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ index: i, x: e.clientX, y: e.clientY });
              }}
            >
              <div class="flex items-center justify-between gap-2">
                <span
                  class={`font-medium truncate ${isSelected ? "text-[#fab387]" : "text-text"}`}
                >
                  {combo.name || `Combo ${i}`}
                </span>
                <span class="text-xs text-subtext shrink-0">{label}</span>
              </div>
              <div class="text-xs text-subtext mt-0.5">
                Keys: {positionsLabel(combo.positions)}
              </div>
            </button>

            {/* Inline detail (accordion) */}
            {isSelected && selected !== null && (
              <ComboDetail
                combo={selected}
                index={selectedCombo!}
                onUpdate={(c) => onUpdateCombo(selectedCombo!, c)}
                onDelete={() => onDeleteCombo(selectedCombo!)}
                onStartPickingPositions={onStartPickingPositions}
                isPickingPositions={isPickingPositions}
                onOpenBindingPicker={() => onOpenBindingPicker(selectedCombo!)}
                layerNames={layerNames}
              />
            )}
          </div>
        );
      })}

      {/* Combo context menu */}
      {contextMenu && (
        <div
          class="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            class="absolute bg-surface border border-overlay/40 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={`left:${contextMenu.x}px;top:${contextMenu.y}px`}
          >
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                onSelectCombo(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Edit
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-overlay/20 transition-colors"
              onClick={() => {
                onDuplicateCombo(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Duplicate
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-[#f38ba8] hover:bg-[#f38ba8]/10 transition-colors"
              onClick={() => {
                onDeleteCombo(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {combos.length === 0 && (
        <div class="text-sm text-subtext italic text-center py-4">
          No combos defined
        </div>
      )}

      {/* Add button at bottom */}
      <button
        class="w-full mt-1 py-1.5 rounded-lg text-xs font-medium text-subtext
               hover:text-text hover:bg-overlay/20 border border-dashed border-overlay/40
               hover:border-overlay/60 transition-colors"
        onClick={onAddCombo}
      >
        + Add Combo
      </button>
    </div>
  );
}
