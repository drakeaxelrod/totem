import { useStore } from "../store/index.ts";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { ComboEditor } from "./ComboEditor.tsx";
import { BehaviorEditor } from "./BehaviorEditor.tsx";
import { MouseConfigEditor } from "./MouseConfigEditor.tsx";

export function Sidebar() {
  const {
    keymap, sidebarTab, selectedCombo, isPickingPositions, pickingPositions,
    setSidebarTab, selectCombo,
    updateCombo, deleteCombo, duplicateCombo, addCombo,
    commitPickingPositions, setIsPickingPositions, setPickingPositions,
    setEditingComboBinding,
    setBehaviors, setMouseConfig,
  } = useStore();

  if (!keymap) return null;

  const handleStartPickingPositions = () => {
    if (selectedCombo === null) return;
    if (isPickingPositions) {
      commitPickingPositions(selectedCombo, pickingPositions);
      setIsPickingPositions(false);
    } else {
      const combo = keymap.combos[selectedCombo];
      if (combo) setPickingPositions(new Set(combo.positions));
      setIsPickingPositions(true);
    }
  };

  return (
    <div style={{ flex: "0 0 400px" }} className="min-h-0 min-w-md flex flex-col border-l border-overlay/30 bg-surface-alt">
      {/* Sidebar tab strip */}
      <div className="flex items-center border-b border-overlay/30 shrink-0">
        {(["combos", "behaviors", "mouse"] as const).map((tab) => (
          <button
            key={tab}
            style={{ flex: "1 1 0%" }}
            className={`px-3 py-1.5 text-xs font-medium text-center transition-colors ${
              sidebarTab === tab
                ? "text-text border-b-2 border-primary"
                : "text-subtext hover:text-text"
            }`}
            onClick={() => setSidebarTab(tab)}
          >
            {tab === "combos"
              ? `Combos (${keymap.combos.length})`
              : tab === "behaviors"
                ? `Behaviors (${keymap.behaviors.length})`
                : "Mouse"}
          </button>
        ))}
      </div>

      {/* Tab content — Radix ScrollArea for WebKitGTK compatibility */}
      <ScrollArea className="flex-1 min-h-0">
        {sidebarTab === "combos" && (
          <ComboEditor
            combos={keymap.combos}
            selectedCombo={selectedCombo}
            layerNames={keymap.layers.map((l) => l.name)}
            onSelectCombo={selectCombo}
            onUpdateCombo={updateCombo}
            onDeleteCombo={deleteCombo}
            onDuplicateCombo={duplicateCombo}
            onAddCombo={addCombo}
            isPickingPositions={isPickingPositions}
            onStartPickingPositions={handleStartPickingPositions}
            onOpenBindingPicker={setEditingComboBinding}
          />
        )}
        {sidebarTab === "behaviors" && (
          <BehaviorEditor
            behaviors={keymap.behaviors}
            onChange={setBehaviors}
          />
        )}
        {sidebarTab === "mouse" && (
          <MouseConfigEditor
            config={keymap.mouse_config}
            onChange={setMouseConfig}
          />
        )}
      </ScrollArea>
    </div>
  );
}
