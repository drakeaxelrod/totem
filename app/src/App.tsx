import { useState, useMemo, useEffect, useCallback } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import KeyboardSvg from "./components/KeyboardSvg";
import LayerSelector from "./components/LayerSelector";
import Titlebar from "./components/Titlebar";
import Settings, { type AppSettings } from "./components/Settings";
import { parseKeyboardConfig } from "./lib/parseKeyboard";
import { resolveKeyLabel, LAYER_NAMES, type KeyLabel } from "./lib/keyLabels";
import { resolveQmkKeycode } from "./lib/qmkKeycodes";
import { KEYPOS_TO_MATRIX } from "./lib/keyposMap";
import keyboardToml from "@firmware/keyboard.toml";

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

function App() {
  const [activeLayer, setActiveLayer] = useState(0);
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
          <KeyboardSvg keys={keys} darkMode={settings.darkMode} />
        </div>
        <div class="mt-6">
          <LayerSelector
            layers={layerNames}
            activeLayer={activeLayer}
            onSelect={setActiveLayer}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
