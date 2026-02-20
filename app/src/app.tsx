import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useStore } from "./store/index.ts";
import { Header } from "./components/Header.tsx";
import { KeyboardView } from "./components/KeyboardView.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { BindingPicker } from "./components/BindingPicker.tsx";
import type { Binding } from "./lib/types.ts";

export function App() {
  const {
    keymap, error,
    loadKeymap, undo,
    activeLayer, selectedKey, editingComboBinding,
    selectKey, setEditingComboBinding,
    setBinding, setComboBinding,
    isPickingPositions, selectedCombo, pickingPositions,
    syncPickingPositions,
    connectionStatus, behaviorsReady, setBehaviorsReady,
    setConnectionStatus, fetchPhysicalLayout, fetchLiveKeymap, liveKeymap,
    buildLines, buildExitCode, buildExpanded, setBuildExpanded, building,
    toast, showToast, clearToast,
  } = useStore();

  // ── Global effects ──────────────────────────────────────────────────────

  useEffect(() => { loadKeymap(); }, [loadKeymap]);

  // Derive stable identity for the connected device
  const deviceSerial = connectionStatus.state === "connected" ? connectionStatus.info.serial_number : null;
  const deviceReady = connectionStatus.state === "connected" && !connectionStatus.locked;

  useEffect(() => {
    if (deviceReady) {
      // Fetch layout independently
      fetchPhysicalLayout().catch((e) => {
        console.error("Failed to fetch physical layout:", e);
        showToast(`Layout fetch failed: ${e}`, "error");
      });
      // Discover behaviors, then fetch the resolved keymap (depends on behavior metadata)
      invoke("discover_behaviors")
        .then(() => {
          setBehaviorsReady(true);
          return fetchLiveKeymap().catch((e) => {
            console.error("Failed to fetch live keymap:", e);
            showToast(`Keymap fetch failed: ${e}`, "error");
          });
        })
        .catch((e) => {
          console.error("Failed to discover behaviors:", e);
          showToast(`Behavior discovery failed: ${e}`, "error");
        });
    } else {
      setBehaviorsReady(false);
    }
  }, [deviceReady, deviceSerial]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  useEffect(() => {
    if (isPickingPositions && selectedCombo !== null) {
      syncPickingPositions(selectedCombo, pickingPositions);
    }
  }, [pickingPositions, isPickingPositions, selectedCombo, syncPickingPositions]);

  // ── Binding picker orchestration ────────────────────────────────────────

  const displayLayers = liveKeymap ?? keymap?.layers;

  const pickerBinding =
    editingComboBinding !== null
      ? keymap?.combos[editingComboBinding]?.binding ?? null
      : selectedKey !== null
        ? displayLayers?.[activeLayer]?.bindings[selectedKey] ?? null
        : null;

  const pickerPosition =
    editingComboBinding !== null ? -1 : selectedKey ?? -1;

  const showPicker =
    (editingComboBinding !== null && pickerBinding !== null) ||
    (selectedKey !== null && pickerBinding !== null);

  const handlePickerSave = (newBinding: Binding) => {
    if (editingComboBinding !== null) {
      setComboBinding(editingComboBinding, newBinding);
      setEditingComboBinding(null);
      return;
    }
    if (selectedKey === null) return;
    setBinding(activeLayer, selectedKey, newBinding);

    if (
      connectionStatus.state === "connected" &&
      !connectionStatus.locked &&
      behaviorsReady
    ) {
      invoke("set_live_binding", {
        layerId: activeLayer,
        keyPosition: selectedKey,
        action: newBinding.action,
        params: newBinding.params,
      }).catch((e) => {
        console.error("Live edit failed:", e);
        showToast(`Live edit failed: ${e}`, "error");
      });
    }

    selectKey(null);
  };

  const handlePickerClose = () => {
    selectKey(null);
    setEditingComboBinding(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (error) return <div className="min-h-screen bg-surface text-red-400 p-8">{error}</div>;
  if (!keymap) return <div className="min-h-screen bg-surface text-text p-8">Loading...</div>;

  return (
    <div className="h-full bg-surface text-text flex flex-col overflow-hidden font-sans">
      <Header />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <KeyboardView />
        {liveKeymap && <Sidebar />}
      </div>

      <StatusBar
        status={connectionStatus}
        onStatusChange={setConnectionStatus}
        buildLines={buildLines}
        buildExitCode={buildExitCode}
        buildExpanded={buildExpanded}
        setBuildExpanded={setBuildExpanded}
        building={building}
      />

      {showPicker && pickerBinding && (
        <BindingPicker
          binding={pickerBinding}
          position={pickerPosition}
          layerNames={(displayLayers ?? keymap.layers).map((l) => l.name)}
          onSave={handlePickerSave}
          onClose={handlePickerClose}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg text-xs font-medium shadow-lg transition-opacity ${
            toast.kind === "error"
              ? "bg-[#f38ba8]/90 text-[#11111b]"
              : "bg-[#a6e3a1]/90 text-[#11111b]"
          }`}
          onClick={clearToast}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
