import { useState, useMemo, useEffect, useCallback } from "preact/hooks";
import KeyboardSvg from "./components/KeyboardSvg";
import LayerSelector from "./components/LayerSelector";
import Titlebar from "./components/Titlebar";
import Settings, { type AppSettings } from "./components/Settings";
import { parseKeyboardToml } from "./lib/parseKeyboard";
import { resolveKeyLabel, LAYER_NAMES, type KeyLabel } from "./lib/keyLabels";
import { KEYPOS_TO_MATRIX } from "./lib/keyposMap";
import keyboardTomlRaw from "@firmware/keyboard.toml?raw";

const keyboard = parseKeyboardToml(keyboardTomlRaw);

const layerNames = Array.from({ length: keyboard.layers.length }, (_, i) =>
  LAYER_NAMES[i] ?? `Layer ${i}`,
);

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("totem-settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      return { darkMode: false, transparentBg: false, showTitlebar: true, ...parsed };
    }
  } catch {}
  return { darkMode: false, transparentBg: false, showTitlebar: true };
}

function App() {
  const [activeLayer, setActiveLayer] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem("totem-settings", JSON.stringify(settings));
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  const keys: KeyLabel[] = useMemo(() => {
    const layer = keyboard.layers[activeLayer];
    if (!layer) return [];

    return KEYPOS_TO_MATRIX.map(([row, col]) => {
      const code = layer[row]?.[col] ?? "_";
      return resolveKeyLabel(code, keyboard.morses);
    });
  }, [activeLayer]);

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
