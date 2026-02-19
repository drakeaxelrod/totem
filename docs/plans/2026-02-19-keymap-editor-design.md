# TOTEM Keymap Editor — Design Document

## Overview

A local Tauri v2 desktop app for visually editing the TOTEM's ZMK keymap, monitoring live key presses and battery, and triggering firmware builds. TOTEM-specific (hardcoded 38-key layout).

## Stack

- **Frontend**: Preact + Tailwind CSS
- **Backend**: Tauri v2 (Rust)
- **Keymap format**: Rust parses `.keymap` (devicetree) to JSON, frontend works with JSON only
- **Device communication**: ZMK Studio protocol (protobuf over USB serial + BLE GATT)
- **Build integration**: Shells out to `totem` command

## Architecture

```
Preact (WebView)
  ├── Keyboard SVG (interactive 38-key layout)
  ├── Combo Editor (visual overlay on SVG)
  ├── Behavior Parameter Editor (sidebar)
  ├── Monitor Panel (live keys, battery, layer)
  └── Build Console (terminal output)
        │
        │ Tauri IPC (JSON)
        ▼
Rust Backend
  ├── Keymap Parser (.keymap ↔ JSON)
  ├── ZMK Studio Client (protobuf over USB/BLE)
  ├── BLE Battery Monitor (GATT)
  └── Build Runner (`totem` subprocess)
```

### Data Flow

1. Rust reads `config/totem.keymap` → parses devicetree → produces JSON
2. Frontend receives JSON via Tauri IPC, renders interactive editor
3. User edits keymap/combos/behaviors in the UI
4. Frontend sends modified JSON back to Rust
5. Rust serializes JSON → devicetree → writes `config/totem.keymap`
6. User clicks build → Rust runs `totem` subprocess, streams output to frontend

## JSON Schema

The intermediate JSON format that flows between Rust and Preact:

```json
{
  "layers": [
    {
      "name": "BASE",
      "index": 0,
      "bindings": [
        { "pos": 0, "action": "kp", "params": ["B"] },
        { "pos": 7, "action": "hml", "params": ["LGUI", "N"] },
        { "pos": 32, "action": "lt_th", "params": ["NAV", "SPACE"] }
      ]
    }
  ],
  "combos": [
    {
      "name": "excl",
      "positions": [0, 10],
      "binding": { "action": "kp", "params": ["EXCL"] },
      "timeout": 80,
      "layers": [0]
    }
  ],
  "behaviors": {
    "hml": {
      "type": "hold-tap",
      "flavor": "balanced",
      "tapping_term_ms": 280,
      "quick_tap_ms": 175,
      "require_prior_idle_ms": 150,
      "hold_trigger_key_positions": [5,6,7,8,9,15,16,17,18,19,26,27,28,29,30,31,32,33,34,35,36,37]
    },
    "hmr": {
      "type": "hold-tap",
      "flavor": "balanced",
      "tapping_term_ms": 280,
      "quick_tap_ms": 175,
      "require_prior_idle_ms": 150,
      "hold_trigger_key_positions": [0,1,2,3,4,10,11,12,13,14,20,21,22,23,24,25,32,33,34,35,36,37]
    },
    "lt_th": {
      "type": "hold-tap",
      "flavor": "hold-preferred",
      "tapping_term_ms": 200,
      "quick_tap_ms": 200
    },
    "comma_morph": {
      "type": "mod-morph",
      "normal": { "action": "kp", "params": ["COMMA"] },
      "shifted": { "action": "kp", "params": ["SEMI"] },
      "mods": ["LSHFT", "RSHFT"]
    },
    "dot_morph": {
      "type": "mod-morph",
      "normal": { "action": "kp", "params": ["DOT"] },
      "shifted": { "action": "kp", "params": ["COLON"] },
      "mods": ["LSHFT", "RSHFT"]
    }
  },
  "macros": {
    "fat_arrow": {
      "bindings": [
        { "action": "kp", "params": ["EQUAL"] },
        { "action": "kp", "params": ["GT"] }
      ]
    }
  },
  "config": {
    "keyboard_name": "TOTEM",
    "zmk_studio": true,
    "zmk_pointing": true,
    "bt_max_paired": 5,
    "sleep_timeout_ms": 900000,
    "idle_timeout_ms": 30000
  }
}
```

## Tauri IPC Commands

### Keymap

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `load_keymap` | — | `KeymapJson` | Parse `config/totem.keymap` to JSON |
| `save_keymap` | `KeymapJson` | `Result` | Write JSON back to `.keymap` file |

### Build

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `start_build` | — | `stream<BuildOutput>` | Run `totem`, stream stdout/stderr |
| `cancel_build` | — | `Result` | Kill build process |

### Device (ZMK Studio Protocol)

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `list_devices` | — | `Device[]` | Discover keyboards (USB serial + BLE) |
| `connect_device` | `device_id` | `DeviceInfo` | Connect via Studio protocol |
| `get_battery` | — | `{left: u8, right: u8}` | Battery levels both halves |
| `get_active_layer` | — | `u8` | Current active layer index |
| `subscribe_key_events` | — | `stream<KeyEvent>` | Real-time key press events |

### BLE

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `scan_ble` | — | `BleDevice[]` | Scan for BLE devices |
| `connect_ble` | `address` | `Result` | Connect to keyboard via BLE |

## UI Components

### 1. Keyboard SVG

The centerpiece. Interactive 38-key TOTEM layout:
- Click a key to edit its binding (opens binding picker)
- Color-coded by action type (tap, hold-tap, mod-morph, layer-tap)
- Layer tabs across the top to switch between 6 layers
- In monitor mode: keys light up on press, active layer highlighted
- Hardcoded TOTEM physical layout with correct key positions and rotations

### 2. Combo Editor

Visual combo overlay on the keyboard SVG:
- Lines/highlights connecting combo trigger key positions
- Click a combo to select it, edit binding/timeout/layers in sidebar
- Add new combos by clicking key positions on the SVG
- Show all combos for current layer, dimmed combos from other layers

### 3. Behavior Parameter Editor

Sidebar panel for editing custom behavior properties:
- Sliders/number inputs for timing (tapping-term, quick-tap, require-prior-idle)
- Dropdown for flavor (balanced, hold-preferred, tap-preferred)
- Visual hold-trigger-key-position selector (click keys on SVG to toggle)
- Mod-morph editor: pick normal and shifted bindings, select modifier triggers

### 4. Monitor Panel

Live device status (requires USB or BLE connection):
- Battery bar indicators for left and right halves
- Active layer name indicator
- Key press visualization (keys glow/animate on the SVG when pressed)
- Connection status badge (USB/BLE/disconnected)

### 5. Build Console

Bottom panel (collapsible):
- Build button (triggers `totem` command)
- Terminal-style auto-scrolling output log
- Success/error status indicator
- Cancel button for in-progress builds

## App Modes

Two primary modes, toggled via header:

- **Edit mode**: Keymap editor active. Click keys/combos/behaviors to modify. Save writes `.keymap` file. No device connection needed.
- **Monitor mode**: Read-only keyboard view. Shows live key presses, active layer, battery. Requires USB or BLE connection via ZMK Studio protocol.

## Rust Crates

| Crate | Purpose |
|-------|---------|
| `tauri` v2 | App framework, IPC, windowing |
| `prost` | Protobuf encoding/decoding (ZMK Studio messages) |
| `serialport` | USB serial communication (CDC/ACM) |
| `btleplug` | BLE GATT client (battery service, Studio protocol) |
| `tokio` | Async runtime for serial/BLE/subprocess streams |

## Keymap Parser Strategy

The Rust keymap parser is TOTEM-specific. It knows the exact structure of the `.keymap` file:

1. **Read** `config/totem.keymap` as text
2. **Extract** devicetree nodes by pattern matching known node names (`behaviors`, `keymap`, `combos`, macros)
3. **Parse** binding strings (e.g., `&hml LGUI N`) into structured `Binding { action, params }`
4. **Parse** behavior properties from node definitions
5. **Serialize** back to devicetree text, preserving formatting and comments where possible

Since we only support TOTEM, we don't need a full devicetree parser. We know the file structure and can use targeted regex/text parsing for each section.

## Physical Layout Definition

Hardcoded in the frontend as a constant. 38 key positions with:
- x, y coordinates (matching TOTEM PCB layout)
- rotation angle (for angled outer keys)
- row, column (for matrix mapping)
- label position offsets

This is derived from the existing TOTEM SVG used in keymap visualizations.
