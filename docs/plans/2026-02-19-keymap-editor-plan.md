# TOTEM Keymap Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local Tauri v2 desktop app for visually editing the TOTEM ZMK keymap, monitoring live key presses/battery via ZMK Studio protocol, and triggering firmware builds.

**Architecture:** Rust backend parses `config/totem.keymap` (devicetree) into a typed JSON schema, Preact frontend renders an interactive 38-key SVG editor. ZMK Studio protocol (protobuf over USB serial / BLE GATT) provides live device monitoring. All IPC flows through Tauri v2 commands and channels.

**Tech Stack:** Tauri v2, Preact, Tailwind CSS v4, Rust (prost, serialport, btleplug, tokio), Vite

**Design doc:** `docs/plans/2026-02-19-keymap-editor-design.md`

---

## Phase 1: Project Scaffold + Keymap Parser (core foundation)

### Task 1: Scaffold Tauri v2 + Preact + Tailwind project

**Files:**
- Create: `app/package.json`
- Create: `app/vite.config.ts`
- Create: `app/tsconfig.json`
- Create: `app/index.html`
- Create: `app/src/main.tsx`
- Create: `app/src/app.tsx`
- Create: `app/src/index.css`
- Create: `app/src-tauri/Cargo.toml`
- Create: `app/src-tauri/src/main.rs`
- Create: `app/src-tauri/src/lib.rs`
- Create: `app/src-tauri/build.rs`
- Create: `app/src-tauri/tauri.conf.json`
- Create: `app/src-tauri/capabilities/default.json`
- Modify: `flake.nix` — add back rust-overlay, Tauri system deps

**Step 1: Create Vite + Preact project**

```bash
cd /home/draxel/Projects/totem
pnpm create vite@latest app --template preact-ts
cd app
pnpm install
```

**Step 2: Add Tailwind CSS v4**

```bash
cd /home/draxel/Projects/totem/app
pnpm add tailwindcss @tailwindcss/vite
```

Replace `app/src/index.css` with:
```css
@import "tailwindcss";

@theme {
  --color-surface: #1e1e2e;
  --color-surface-alt: #313244;
  --color-primary: #cba6f7;
  --color-text: #cdd6f4;
  --color-subtext: #a6adc8;
  --color-overlay: #585b70;
}
```

Update `app/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
});
```

**Step 3: Add Tauri v2**

```bash
cd /home/draxel/Projects/totem/app
pnpm add -D @tauri-apps/cli@latest
pnpm add @tauri-apps/api@latest
pnpm tauri init
```

Answer prompts: app name `totem`, dev URL `http://localhost:5173`, dist `../dist`, dev command `pnpm dev`, build command `pnpm build`.

**Step 4: Configure Cargo.toml**

`app/src-tauri/Cargo.toml` dependencies:
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
regex = "1"

[build-dependencies]
tauri-build = { version = "2" }
```

**Step 5: Update flake.nix — add Tauri deps back**

Add `rust-overlay` input back. Add to dev shell:
```nix
# Rust (Tauri GUI)
rustToolchain  # from rust-overlay, stable, with rust-src + rustfmt
llvmPackages.libclang
llvmPackages.clang
pkg-config

# Tauri system deps
nodejs_22
pnpm
gtk3
webkitgtk_4_1
libsoup_3
openssl
glib
cairo
pango
gdk-pixbuf
atk
libappindicator-gtk3
librsvg
dbus
udev
```

Add `LIBCLANG_PATH` and `BINDGEN_EXTRA_CLANG_ARGS` env vars back.

**Step 6: Create minimal app.tsx**

```tsx
export function App() {
  return (
    <div class="min-h-screen bg-surface text-text p-4">
      <h1 class="text-2xl font-bold text-primary">TOTEM</h1>
      <p class="text-subtext">Keymap Editor</p>
    </div>
  );
}
```

**Step 7: Verify it runs**

```bash
cd /home/draxel/Projects/totem/app
pnpm tauri dev
```

Expected: Tauri window opens with "TOTEM / Keymap Editor" text on dark background.

**Step 8: Commit**

```bash
git add app/ flake.nix
git commit -m "feat: scaffold Tauri v2 + Preact + Tailwind app"
```

---

### Task 2: Rust keymap parser — read `.keymap` to JSON

The parser is TOTEM-specific. It uses regex to extract sections from the known file structure.

**Files:**
- Create: `app/src-tauri/src/keymap.rs`
- Create: `app/src-tauri/src/keymap/parser.rs`
- Create: `app/src-tauri/src/keymap/types.rs`
- Create: `app/src-tauri/src/keymap/serializer.rs`
- Modify: `app/src-tauri/src/lib.rs`

**Step 1: Define JSON types**

`app/src-tauri/src/keymap/types.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keymap {
    pub layers: Vec<Layer>,
    pub combos: Vec<Combo>,
    pub behaviors: Vec<Behavior>,
    pub macros: Vec<Macro>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub name: String,
    pub index: usize,
    pub bindings: Vec<Binding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Binding {
    pub action: String,       // "kp", "hml", "hmr", "lt_th", "trans", "none", etc.
    pub params: Vec<String>,  // ["LGUI", "N"] or ["B"] or []
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Combo {
    pub name: String,
    pub positions: Vec<u8>,
    pub binding: Binding,
    pub timeout_ms: u32,
    pub layers: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Behavior {
    HoldTap {
        name: String,
        label: String,
        flavor: String,
        tapping_term_ms: u32,
        quick_tap_ms: u32,
        require_prior_idle_ms: Option<u32>,
        hold_trigger_key_positions: Option<Vec<u8>>,
        hold_trigger_on_release: bool,
    },
    ModMorph {
        name: String,
        label: String,
        normal: Binding,
        shifted: Binding,
        mods: Vec<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Macro {
    pub name: String,
    pub label: String,
    pub wait_ms: u32,
    pub tap_ms: u32,
    pub bindings: Vec<Binding>,
}
```

**Step 2: Write parser**

`app/src-tauri/src/keymap/parser.rs`:

The parser works by:
1. Reading the raw `.keymap` file as a string
2. Using regex to extract the `behaviors { ... }` block, `combos { ... }` block, and `keymap { ... }` block
3. Within each block, parsing individual nodes (e.g., each `combo_xxx { ... }`)
4. Within each node, parsing properties (`key-positions = <0 10>;`, `bindings = <&kp EXCL>;`, etc.)

Key parsing rules:
- **Bindings in `< ... >`**: Split on `&` to get individual bindings, then split first word = action, rest = params
- **Number arrays in `< ... >`**: Split on whitespace, parse as integers
- **Properties**: `name = <value>;` or `name = "string";`
- **Layer bindings**: 38 bindings per layer, ordered by key position 0-37

The full `.keymap` file uses `#define` and `#include` — the parser should:
- Resolve `#define BASE 0` etc. into a layer name map
- Resolve `#define KEYS_L ...` / `KEYS_R ...` / `THUMBS ...` for hold-trigger positions
- Ignore `#include` lines (they're Zephyr headers, not our config)

**Step 3: Write serializer**

`app/src-tauri/src/keymap/serializer.rs`:

Serializes the JSON types back to `.keymap` devicetree text. Strategy:
- Keep a template of the file structure (header, includes, defines, sections)
- Fill in behavior properties, combo definitions, layer bindings from the typed data
- Format bindings back into `&action PARAM1 PARAM2` strings
- Preserve the visual row alignment of layer bindings (4 rows × varying columns)

**Step 4: Wire up as Tauri command**

`app/src-tauri/src/lib.rs`:
```rust
mod keymap;

use keymap::types::Keymap;

#[tauri::command]
fn load_keymap() -> Result<Keymap, String> {
    let root = find_project_root()?;
    let path = root.join("config/totem.keymap");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read keymap: {e}"))?;
    keymap::parser::parse(&content).map_err(|e| format!("Parse error: {e}"))
}

#[tauri::command]
fn save_keymap(keymap: Keymap) -> Result<(), String> {
    let root = find_project_root()?;
    let path = root.join("config/totem.keymap");
    let content = keymap::serializer::serialize(&keymap);
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write keymap: {e}"))
}
```

**Step 5: Test round-trip**

```bash
cd /home/draxel/Projects/totem/app/src-tauri
cargo test
```

Write a test that:
1. Reads the actual `config/totem.keymap`
2. Parses it to `Keymap`
3. Asserts 6 layers, 33 combos, 5 behaviors
4. Serializes back to string
5. Re-parses and asserts equality

**Step 6: Commit**

```bash
git add app/src-tauri/src/
git commit -m "feat: keymap parser — read/write totem.keymap to typed JSON"
```

---

### Task 3: Frontend — Keyboard SVG component

**Files:**
- Create: `app/src/components/KeyboardSvg.tsx`
- Create: `app/src/lib/layout.ts`
- Create: `app/src/lib/keyLabels.ts`
- Modify: `app/src/app.tsx`

**Step 1: Define physical layout constant**

`app/src/lib/layout.ts` — translate the `totem-layout.dtsi` coordinates into a TypeScript constant:

```ts
// From config/boards/shields/totem/totem-layout.dtsi
// key_physical_attrs: w h x y rot rx ry (units: 0.01mm for position, 0.01° for rotation)
export interface KeyPosition {
  index: number;
  x: number;      // centiunits → scale to SVG
  y: number;
  w: number;
  h: number;
  rot: number;    // degrees (divide dtsi value by 100)
  rx: number;     // rotation center
  ry: number;
}

export const LAYOUT: KeyPosition[] = [
  { index: 0,  x: 78,   y: 152, w: 106, h: 100, rot: -10,  rx: 130,  ry: 202 },
  { index: 1,  x: 196,  y: 60,  w: 106, h: 100, rot: -4,   rx: 249,  ry: 110 },
  { index: 2,  x: 318,  y: 0,   w: 106, h: 100, rot: 0,    rx: 0,    ry: 0   },
  // ... all 38 keys from totem-layout.dtsi
  { index: 37, x: 1004, y: 371, w: 106, h: 100, rot: 0,    rx: 0,    ry: 0   },
];
```

**Step 2: Build SVG keyboard component**

`app/src/components/KeyboardSvg.tsx`:
- Render each key as a `<rect>` with `transform="rotate(...)"` based on layout data
- Show key label text (from the binding for the active layer)
- Color keys by action type:
  - `kp` → default (gray)
  - `hml`/`hmr` → blue (hold-tap/HRM)
  - `lt_th` → green (layer-tap)
  - `comma_morph`/`dot_morph` → orange (mod-morph)
  - `trans` → dimmed
- Accept `activeLayer`, `onKeyClick` props
- For hold-taps, show both hold and tap labels (e.g., "Gui" above, "N" below)

**Step 3: Key label resolver**

`app/src/lib/keyLabels.ts`:
- Map ZMK key names to display labels: `N` → `N`, `LGUI` → `Gui`, `LSHFT` → `Shift`, `LCTRL` → `Ctrl`, etc.
- Handle compound modifiers: `LS(LC(LA(LGUI)))` → `Hyper`
- Handle special keys: `C_VOL_UP` → `Vol+`, `PG_DN` → `PgDn`, etc.

**Step 4: Wire into app.tsx**

```tsx
import { invoke } from "@tauri-apps/api/core";
import { KeyboardSvg } from "./components/KeyboardSvg";
import { useEffect, useState } from "preact/hooks";

export function App() {
  const [keymap, setKeymap] = useState(null);
  const [activeLayer, setActiveLayer] = useState(0);

  useEffect(() => {
    invoke("load_keymap").then(setKeymap);
  }, []);

  if (!keymap) return <div class="bg-surface min-h-screen text-text p-8">Loading...</div>;

  return (
    <div class="bg-surface min-h-screen text-text p-4">
      <div class="flex gap-2 mb-4">
        {keymap.layers.map((l, i) => (
          <button
            class={`px-3 py-1 rounded ${i === activeLayer ? "bg-primary text-surface" : "bg-surface-alt"}`}
            onClick={() => setActiveLayer(i)}
          >
            {l.name}
          </button>
        ))}
      </div>
      <KeyboardSvg
        layer={keymap.layers[activeLayer]}
        behaviors={keymap.behaviors}
        onKeyClick={(pos) => console.log("clicked", pos)}
      />
    </div>
  );
}
```

**Step 5: Verify**

```bash
cd /home/draxel/Projects/totem/app
pnpm tauri dev
```

Expected: See all 6 layer tabs, click to switch. TOTEM keyboard rendered as SVG with correct key labels for each layer.

**Step 6: Commit**

```bash
git add app/src/
git commit -m "feat: keyboard SVG with layer switching and key labels"
```

---

## Phase 2: Editing

### Task 4: Binding picker (edit key bindings)

**Files:**
- Create: `app/src/components/BindingPicker.tsx`
- Create: `app/src/lib/keycodes.ts`
- Modify: `app/src/app.tsx`

**What it does:** When user clicks a key on the SVG, open a popup/modal to change its binding.

Sections in the picker:
1. **Action type** dropdown: `kp`, `hml`, `hmr`, `lt_th`, `trans`, `none`, `mt`, `kp` (with modifier wrapper), `tog`, custom behaviors
2. **Key code** search/grid: A-Z, 0-9, F1-F12, arrows, modifiers, media, etc.
3. **For hold-taps**: separate hold param (modifier or layer) + tap param (key)
4. **Preview**: shows what the binding will look like: `&hml LGUI N`

`app/src/lib/keycodes.ts` — categorized list of all ZMK keycodes:
```ts
export const KEYCODES = {
  letters: ["A","B","C",...,"Z"],
  numbers: ["N0","N1",...,"N9"],
  fkeys: ["F1","F2",...,"F12"],
  modifiers: ["LSHFT","RSHFT","LCTRL","RCTRL","LALT","RALT","LGUI","RGUI"],
  navigation: ["UP","DOWN","LEFT","RIGHT","HOME","END","PG_UP","PG_DN"],
  editing: ["BSPC","DEL","TAB","RET","ESC","SPACE","INS"],
  symbols: ["MINUS","EQUAL","LBKT","RBKT","BSLH","SEMI","SQT","GRAVE","COMMA","DOT","FSLH"],
  media: ["C_VOL_UP","C_VOL_DN","C_MUTE","C_PP","C_NEXT","C_PREV","C_BRI_UP","C_BRI_DN"],
  bluetooth: ["BT_SEL 0","BT_SEL 1","BT_SEL 2","BT_CLR"],
  mouse: ["LCLK","RCLK","MCLK","MB4","MB5"],
};
```

**Step 1: Build BindingPicker component**
**Step 2: Wire into app — clicking key opens picker, selecting binding updates keymap state**
**Step 3: Add Save button — calls `save_keymap` Tauri command**
**Step 4: Verify: edit a key, save, check `config/totem.keymap` file changed correctly**
**Step 5: Commit**

---

### Task 5: Combo editor

**Files:**
- Create: `app/src/components/ComboEditor.tsx`
- Create: `app/src/components/ComboOverlay.tsx`
- Modify: `app/src/app.tsx`

**What it does:**
- `ComboOverlay` renders on top of the keyboard SVG: draws lines connecting combo key positions, shows the combo binding label at the midpoint
- Click a combo highlight to select it → sidebar shows combo details (binding, timeout, layers)
- Edit combo binding (reuse BindingPicker), timeout, layer filter
- Add new combo: click "Add Combo" → click 2-3 key positions on SVG → choose binding
- Delete combo: button in sidebar

**Step 1: Build ComboOverlay (SVG lines + labels)**
**Step 2: Build ComboEditor sidebar**
**Step 3: Wire add/edit/delete into keymap state**
**Step 4: Verify: add a combo, edit timeout, save, check .keymap**
**Step 5: Commit**

---

### Task 6: Behavior parameter editor

**Files:**
- Create: `app/src/components/BehaviorEditor.tsx`
- Modify: `app/src/app.tsx`

**What it does:** Sidebar panel for editing the 5 custom behaviors:

For hold-taps (hml, hmr, lt_th):
- Flavor dropdown: balanced, hold-preferred, tap-preferred, tap-unless-interrupted
- Number inputs: tapping-term-ms, quick-tap-ms, require-prior-idle-ms
- Checkbox: hold-trigger-on-release
- Visual key position selector for hold-trigger-key-positions (click keys on SVG to toggle)

For mod-morphs (comma_morph, dot_morph):
- Normal binding picker
- Shifted binding picker
- Modifier checkboxes (LSHFT, RSHFT, LCTRL, etc.)

**Step 1: Build BehaviorEditor component**
**Step 2: Wire hold-trigger position selector to SVG (toggle mode)**
**Step 3: Verify: change tapping-term, save, check .keymap**
**Step 4: Commit**

---

## Phase 3: Build Integration

### Task 7: Build console

**Files:**
- Create: `app/src/components/BuildConsole.tsx`
- Create: `app/src-tauri/src/build.rs`
- Modify: `app/src-tauri/src/lib.rs`

**Rust side** (`build.rs`):
- `start_build` command: spawns `totem` as subprocess using `tauri_plugin_shell`
- Streams stdout/stderr via Tauri Channel
- `cancel_build`: kills the subprocess

```rust
use tauri::ipc::Channel;

#[derive(Clone, serde::Serialize)]
#[serde(tag = "event", content = "data")]
pub enum BuildEvent {
    Stdout { line: String },
    Stderr { line: String },
    Exit { code: i32 },
}

#[tauri::command]
pub async fn start_build(on_event: Channel<BuildEvent>) -> Result<(), String> {
    // Find project root, spawn `totem` subprocess
    // Read stdout/stderr line by line, send via channel
    // Send Exit event when done
}
```

**Frontend** (`BuildConsole.tsx`):
- Collapsible bottom panel
- Build button (green), cancel button (red, shown during build)
- Terminal-style monospace output area with auto-scroll
- Status indicator: idle / building / success / error

**Step 1: Implement Rust build runner**
**Step 2: Build frontend console component**
**Step 3: Verify: click build, see streaming output, verify UF2 files created**
**Step 4: Commit**

---

## Phase 4: Device Monitoring (ZMK Studio Protocol)

### Task 8: ZMK Studio protocol client

**Files:**
- Create: `app/src-tauri/src/studio/mod.rs`
- Create: `app/src-tauri/src/studio/framing.rs`
- Create: `app/src-tauri/src/studio/transport.rs`
- Create: `app/src-tauri/proto/` (protobuf definitions)
- Modify: `app/src-tauri/Cargo.toml` (add prost, serialport, btleplug)
- Modify: `app/src-tauri/build.rs` (add prost-build)

**Protocol details:**
- Framing: start `0xAB`, escape `0xAC`, end `0xAD`
- Payload: protobuf-encoded Request/Response/Notification
- Transport: USB CDC/ACM serial or BLE GATT custom service

**Step 1: Clone/download ZMK Studio protobuf definitions**

From `github.com/zmkfirmware/zmk-studio-messages`:
- Copy `.proto` files into `app/src-tauri/proto/`
- Configure `prost-build` in `build.rs`

**Step 2: Implement framing layer** (`framing.rs`)
- `fn encode(payload: &[u8]) -> Vec<u8>` — add framing bytes, escape special bytes
- `fn decode(frame: &[u8]) -> Result<Vec<u8>>` — strip framing, unescape

**Step 3: Implement USB serial transport** (`transport.rs`)
- List available serial ports, filter for ZMK devices
- Open serial port, read/write framed messages
- Async read loop with tokio

**Step 4: Implement BLE transport** (`transport.rs`)
- Scan for BLE devices with ZMK Studio GATT service UUID `00000000-0196-6107-c967-c5cfb1c2482a`
- Connect and discover characteristics
- Write requests, receive responses via GATT indications

**Step 5: Implement Studio RPC client** (`mod.rs`)
- `get_device_info()` → device name, split info
- `get_lock_state()` → locked/unlocked
- `list_behaviors()` → available behaviors
- `get_keymap()` → current live keymap
- Battery via BLE Battery Service (UUID `0x180F`, characteristic `0x2A19`)

**Step 6: Wire as Tauri commands**
```rust
#[tauri::command]
async fn list_devices() -> Result<Vec<Device>, String> { ... }

#[tauri::command]
async fn connect_device(id: String) -> Result<DeviceInfo, String> { ... }

#[tauri::command]
async fn get_battery() -> Result<BatteryInfo, String> { ... }
```

**Step 7: Commit**

---

### Task 9: Monitor UI

**Files:**
- Create: `app/src/components/MonitorPanel.tsx`
- Create: `app/src/components/BatteryIndicator.tsx`
- Create: `app/src/components/ConnectionStatus.tsx`
- Modify: `app/src/app.tsx`

**What it does:**
- Header bar: connection status badge (disconnected/USB/BLE), connect button
- When connected: battery bars for left + right halves, active layer indicator
- Keyboard SVG switches to monitor mode: keys animate/glow on press
- Layer indicator updates in real-time as user switches layers on the physical keyboard

**Step 1: Build connection UI (device list, connect button)**
**Step 2: Build battery + layer indicators**
**Step 3: Build key press animation on SVG**
**Step 4: Verify: connect via USB, see battery levels, press keys → SVG responds**
**Step 5: Commit**

---

## Phase 5: Polish

### Task 10: App chrome + mode switching

**Files:**
- Create: `app/src/components/Header.tsx`
- Create: `app/src/components/Sidebar.tsx`
- Modify: `app/src/app.tsx`

**What it does:**
- Header: TOTEM logo, Edit/Monitor mode toggle, connection status, save/build buttons
- Sidebar: context-sensitive — shows BindingPicker, ComboEditor, or BehaviorEditor depending on selection
- Keyboard SVG is always centered
- Build console collapses to bottom
- Dark theme throughout (Catppuccin Mocha palette from the `@theme` config)

**Step 1: Build Header with mode toggle**
**Step 2: Build Sidebar container with tabbed sub-editors**
**Step 3: Layout everything with Tailwind grid**
**Step 4: Verify: mode switching works, all editors accessible**
**Step 5: Commit**

---

### Task 11: Final integration + flake.nix GUI command

**Files:**
- Modify: `flake.nix` — add `totem gui` command back

Add to the `totem` script case statement:
```bash
gui)
  cd "$ROOT/app"
  if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    pnpm install
  fi
  WAYLAND_DISPLAY= pnpm tauri dev
  ;;
```

Update help text to include `totem gui`.

**Step 1: Add gui command to flake**
**Step 2: Full end-to-end test: `totem gui` → edit keymap → save → build → flash**
**Step 3: Commit**

---

## Implementation Order Summary

| Phase | Task | What | Dependencies |
|-------|------|------|-------------|
| 1 | 1 | Scaffold Tauri + Preact + Tailwind | — |
| 1 | 2 | Keymap parser (Rust) | Task 1 |
| 1 | 3 | Keyboard SVG component | Tasks 1, 2 |
| 2 | 4 | Binding picker (edit keys) | Task 3 |
| 2 | 5 | Combo editor | Tasks 3, 4 |
| 2 | 6 | Behavior parameter editor | Tasks 3, 4 |
| 3 | 7 | Build console | Task 1 |
| 4 | 8 | ZMK Studio protocol client | Task 1 |
| 4 | 9 | Monitor UI | Tasks 3, 8 |
| 5 | 10 | App chrome + polish | All above |
| 5 | 11 | Flake integration | Task 10 |

Tasks 7 and 8 can run in parallel with Phase 2 (they don't depend on editing features).
