import { useState, useMemo, useEffect, useCallback } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import KeyboardSvg, { type ResolvedCombo } from "./components/KeyboardSvg";
import LayerSelector from "./components/LayerSelector";
import Titlebar from "./components/Titlebar";
import Settings, { type AppSettings } from "./components/Settings";
import { parseKeyboardConfig } from "./lib/parseKeyboard";
import { resolveKeyLabel, LAYER_NAMES, type KeyLabel } from "./lib/keyLabels";
import { resolveQmkKeycode } from "./lib/qmkKeycodes";
import { KEYPOS_TO_MATRIX } from "./lib/keyposMap";
import keyboardToml from "@rmk/keyboard.toml";

const tomlKeyboard = parseKeyboardConfig(keyboardToml);

const layerNames = Array.from(
  { length: tomlKeyboard.layerCount },
  (_, i) => LAYER_NAMES[i] ?? `Layer ${i}`,
);

export type KeymapSource = "toml" | "vial";

interface VialKeymap {
  rows: number;
  cols: number;
  layers: number;
  keymap: number[][][];
}

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("totem-settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        darkMode: false,
        transparentBg: false,
        showTitlebar: true,
        keymapSource: "toml" as KeymapSource,
        ...parsed,
      };
    }
  } catch {}
  return { darkMode: false, transparentBg: false, showTitlebar: true, keymapSource: "toml" };
}

// Build action string → keypos reverse map from base layer
const actionToKeypos = new Map<string, number>();
const layer0 = tomlKeyboard.layers[0];
KEYPOS_TO_MATRIX.forEach(([row, col], keypos) => {
  const action = layer0[row]?.[col];
  if (action && action !== "_") actionToKeypos.set(action, keypos);
});

// Resolve combos to keypos indices + display labels
const resolvedCombos: ResolvedCombo[] = tomlKeyboard.combos
  .map((c) => {
    const indices = c.actions.map((a) => actionToKeypos.get(a));
    if (indices.some((i) => i === undefined)) return null;
    return {
      keyposIndices: indices as number[],
      outputLabel: resolveKeyLabel(c.output).tap,
    };
  })
  .filter((c): c is ResolvedCombo => c !== null);

function App() {
  const [activeLayer, setActiveLayer] = useState(0);
  const [showCombos, setShowCombos] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [vialKeymap, setVialKeymap] = useState<VialKeymap | null>(null);
  const [vialConnected, setVialConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem("totem-settings", JSON.stringify(settings));
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  // Poll for Vial connection status
  useEffect(() => {
    const check = async () => {
      try {
        const connected = await invoke<boolean>("is_vial_connected");
        setVialConnected(connected);
      } catch {
        setVialConnected(false);
      }
    };
    check();
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, []);

  // Load Vial keymap when source switches to "vial"
  useEffect(() => {
    if (settings.keymapSource !== "vial" || !vialConnected) return;
    invoke<VialKeymap>("get_vial_keymap", {
      rows: tomlKeyboard.rows,
      cols: tomlKeyboard.cols,
    })
      .then(setVialKeymap)
      .catch(() => {
        setVialKeymap(null);
        setSettings((s) => ({ ...s, keymapSource: "toml" }));
      });
  }, [settings.keymapSource, vialConnected]);

  const keys: KeyLabel[] = useMemo(() => {
    if (settings.keymapSource === "vial" && vialKeymap) {
      const layer = vialKeymap.keymap[activeLayer];
      if (!layer) return [];
      return KEYPOS_TO_MATRIX.map(([row, col]) => {
        const code = layer[row]?.[col] ?? 0;
        return resolveQmkKeycode(code);
      });
    }

    // Default: TOML source
    const layer = tomlKeyboard.layers[activeLayer];
    if (!layer) return [];
    return KEYPOS_TO_MATRIX.map(([row, col]) => {
      const code = layer[row]?.[col] ?? "_";
      return resolveKeyLabel(code, tomlKeyboard.morses);
    });
  }, [activeLayer, settings.keymapSource, vialKeymap]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const bgClass = settings.transparentBg
    ? ""
    : settings.darkMode
      ? "bg-[#0f172a]"
      : "bg-[#eef2f7]";

  return (
    <div
      data-tauri-drag-region
      class={`h-full relative overflow-hidden rounded-xl ${bgClass}`}
      onContextMenu={handleContextMenu}
    >
      {settings.showTitlebar && <Titlebar />}

      {menu && (
        <Settings
          settings={settings}
          onChange={setSettings}
          position={menu}
          onClose={closeMenu}
          vialConnected={vialConnected}
        />
      )}

      <main data-tauri-drag-region class="absolute inset-0 flex flex-col items-center justify-center px-3">
        <div data-tauri-drag-region class="w-full">
          <KeyboardSvg
            keys={keys}
            darkMode={settings.darkMode}
            combos={showCombos && activeLayer === 0 ? resolvedCombos : undefined}
          />
        </div>
        <div class="mt-6 flex items-center gap-2">
          <LayerSelector
            layers={layerNames}
            activeLayer={activeLayer}
            onSelect={setActiveLayer}
          />
          {activeLayer === 0 && (
            <button
              onClick={() => setShowCombos((s) => !s)}
              class={`px-3 py-1.5 rounded-lg text-[13px] font-semibold tracking-wide uppercase cursor-pointer transition-colors ${
                showCombos
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              }`}
            >
              Combos
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
