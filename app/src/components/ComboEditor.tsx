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

function ComboListItem({
  combo,
  index,
  isSelected,
  onClick,
}: {
  combo: Combo;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const label = bindingLabel(combo.binding);

  return (
    <button
      class={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
        isSelected
          ? "bg-[#fab387]/15 border border-[#fab387]/40"
          : "bg-surface hover:bg-overlay/20 border border-transparent"
      }`}
      onClick={onClick}
    >
      <div class="flex items-center justify-between gap-2">
        <span class={`font-medium truncate ${isSelected ? "text-[#fab387]" : "text-text"}`}>
          {combo.name || `Combo ${index}`}
        </span>
        <span class="text-xs text-subtext shrink-0">{label}</span>
      </div>
      <div class="text-sm text-subtext mt-0.5">
        Keys: {positionsLabel(combo.positions)}
      </div>
    </button>
  );
}

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
    <div class="flex flex-col gap-3 pt-3 border-t border-overlay/30">
      {/* Name */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Name</label>
        <input
          type="text"
          value={combo.name}
          onInput={handleNameChange}
          placeholder={`combo_${index}`}
          class="w-full px-3 py-1.5 bg-surface rounded text-sm text-text
                 border border-overlay/50 outline-none focus:border-primary
                 placeholder:text-subtext/50"
        />
      </div>

      {/* Positions */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Positions</label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-text">
            {combo.positions.length > 0
              ? positionsLabel(combo.positions)
              : "No keys selected"}
          </span>
          <button
            class={`px-2 py-0.5 rounded text-sm transition-colors ${
              isPickingPositions
                ? "bg-[#fab387] text-surface"
                : "bg-surface text-subtext hover:text-text hover:bg-overlay/30"
            }`}
            onClick={onStartPickingPositions}
          >
            {isPickingPositions ? "Picking..." : "Pick keys"}
          </button>
        </div>
      </div>

      {/* Binding */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Binding</label>
        <button
          class="w-full text-left px-3 py-1.5 bg-surface rounded text-sm text-text
                 border border-overlay/50 hover:border-primary transition-colors"
          onClick={onOpenBindingPicker}
        >
          <code class="font-mono text-sm text-subtext">
            &{combo.binding.action}
            {combo.binding.params.length > 0 && ` ${combo.binding.params.join(" ")}`}
          </code>
          <span class="ml-2 text-text">{label}</span>
        </button>
      </div>

      {/* Timeout */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Timeout (ms)</label>
        <input
          type="number"
          value={combo.timeout_ms}
          onInput={handleTimeoutChange}
          min={10}
          max={500}
          step={5}
          class="w-32 px-3 py-1.5 bg-surface rounded text-sm text-text
                 border border-overlay/50 outline-none focus:border-primary"
        />
      </div>

      {/* Layer filter */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">
          Active Layers
          <span class="font-normal text-subtext/60 ml-1">
            (none checked = all layers)
          </span>
        </label>
        <div class="flex flex-wrap gap-1.5">
          {layerNames.map((name, i) => {
            const isActive = combo.layers.includes(i);
            return (
              <button
                key={name}
                class={`px-2 py-0.5 rounded text-sm transition-colors ${
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
      <div class="pt-2">
        <button
          class={`px-3 py-1.5 rounded text-sm transition-colors ${
            confirmDelete
              ? "bg-[#f38ba8] text-surface font-medium"
              : "text-[#f38ba8] hover:bg-[#f38ba8]/10"
          }`}
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? "Confirm Delete" : "Delete Combo"}
        </button>
      </div>
    </div>
  );
}

export function ComboEditor({
  combos,
  selectedCombo,
  layerNames,
  onSelectCombo,
  onUpdateCombo,
  onDeleteCombo,
  onAddCombo,
  isPickingPositions,
  onStartPickingPositions,
  onOpenBindingPicker,
}: ComboEditorProps) {
  const selected = selectedCombo !== null ? combos[selectedCombo] : null;

  return (
    <div class="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-overlay/30">
        <h2 class="text-base font-medium text-text">
          Combos
          <span class="text-subtext ml-1">({combos.length})</span>
        </h2>
        <button
          class="px-2 py-0.5 rounded text-sm bg-primary text-surface font-medium
                 hover:brightness-110 transition-all"
          onClick={onAddCombo}
        >
          + Add
        </button>
      </div>

      {/* Scrollable content */}
      <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {/* Combo list */}
        {combos.map((combo, i) => (
          <ComboListItem
            key={i}
            combo={combo}
            index={i}
            isSelected={selectedCombo === i}
            onClick={() => onSelectCombo(selectedCombo === i ? null : i)}
          />
        ))}

        {combos.length === 0 && (
          <div class="text-sm text-subtext italic text-center py-4">
            No combos defined. Click "+ Add" to create one.
          </div>
        )}

        {/* Detail panel for selected combo */}
        {selected !== null && selectedCombo !== null && (
          <ComboDetail
            combo={selected}
            index={selectedCombo}
            onUpdate={(c) => onUpdateCombo(selectedCombo, c)}
            onDelete={() => onDeleteCombo(selectedCombo)}
            onStartPickingPositions={onStartPickingPositions}
            isPickingPositions={isPickingPositions}
            onOpenBindingPicker={() => onOpenBindingPicker(selectedCombo)}
            layerNames={layerNames}
          />
        )}
      </div>
    </div>
  );
}
