import type { KeyLabel } from "./keyLabels";
import { LAYER_NAMES } from "./keyLabels";

// QMK keycode ranges
const QK_BASIC_MAX = 0x00ff;
const QK_MODS = 0x0100;
const QK_MODS_MAX = 0x1fff;
const QK_MOD_TAP = 0x2000;
const QK_MOD_TAP_MAX = 0x3fff;
const QK_LAYER_TAP = 0x4000;
const QK_LAYER_TAP_MAX = 0x4fff;
const QK_TO = 0x5200;
const QK_TO_MAX = 0x521f;
const QK_MOMENTARY = 0x5220;
const QK_MOMENTARY_MAX = 0x523f;
const QK_TOGGLE_LAYER = 0x5260;
const QK_TOGGLE_LAYER_MAX = 0x527f;

// QMK HID usage codes → display labels
const HID_LABELS: Record<number, string> = {
  0x00: "",
  0x04: "A", 0x05: "B", 0x06: "C", 0x07: "D", 0x08: "E",
  0x09: "F", 0x0a: "G", 0x0b: "H", 0x0c: "I", 0x0d: "J",
  0x0e: "K", 0x0f: "L", 0x10: "M", 0x11: "N", 0x12: "O",
  0x13: "P", 0x14: "Q", 0x15: "R", 0x16: "S", 0x17: "T",
  0x18: "U", 0x19: "V", 0x1a: "W", 0x1b: "X", 0x1c: "Y",
  0x1d: "Z",
  0x1e: "1", 0x1f: "2", 0x20: "3", 0x21: "4", 0x22: "5",
  0x23: "6", 0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",
  0x28: "Enter", 0x29: "Esc", 0x2a: "Bksp", 0x2b: "Tab", 0x2c: "Space",
  0x2d: "-", 0x2e: "=", 0x2f: "[", 0x30: "]", 0x31: "\\",
  0x33: ";", 0x34: "'", 0x35: "`", 0x36: ",", 0x37: ".", 0x38: "/",
  0x39: "Caps",
  // F-keys
  0x3a: "F1", 0x3b: "F2", 0x3c: "F3", 0x3d: "F4", 0x3e: "F5", 0x3f: "F6",
  0x40: "F7", 0x41: "F8", 0x42: "F9", 0x43: "F10", 0x44: "F11", 0x45: "F12",
  // Print/Scroll/Pause
  0x46: "PrtSc", 0x47: "ScrLk", 0x48: "Pause",
  // Navigation
  0x49: "Ins", 0x4a: "Home", 0x4b: "PgUp", 0x4c: "Del",
  0x4d: "End", 0x4e: "PgDn",
  0x4f: "\u2192", 0x50: "\u2190", 0x51: "\u2193", 0x52: "\u2191",
  // Editing (usage page 0x0C — but QMK maps them to basic range)
  0x7a: "Undo", 0x7b: "Cut", 0x7c: "Copy", 0x7d: "Paste", 0x7e: "Redo",
  // Menu
  0x65: "Menu",
};

function modLabel(modBits: number): string {
  const parts: string[] = [];
  // Check left mods (bits 0-3) and right mods (bits 4-7 shifted)
  if (modBits & 0x01) parts.push("Ctrl");
  if (modBits & 0x02) parts.push("Shift");
  if (modBits & 0x04) parts.push("Alt");
  if (modBits & 0x08) parts.push("Gui");
  // Right mods (bit 4 = right flag)
  if (modBits & 0x11 && !(modBits & 0x01)) parts.push("Ctrl");
  if (modBits & 0x12 && !(modBits & 0x02)) parts.push("Shift");
  if (modBits & 0x14 && !(modBits & 0x04)) parts.push("Alt");
  if (modBits & 0x18 && !(modBits & 0x08)) parts.push("Gui");
  return parts.join("+") || "Mod";
}

function basicLabel(code: number): string {
  return HID_LABELS[code & 0xff] ?? `0x${(code & 0xff).toString(16)}`;
}

/** Resolve a QMK 2-byte keycode to a display label */
export function resolveQmkKeycode(code: number): KeyLabel {
  // Transparent
  if (code === 0x0000) return { tap: "\u25BD", isTransparent: true };
  // KC_TRNS
  if (code === 0x0001) return { tap: "\u25BD", isTransparent: true };

  // Basic keycodes
  if (code <= QK_BASIC_MAX) {
    return { tap: basicLabel(code) };
  }

  // Mods + keycode (e.g. Ctrl+A)
  if (code >= QK_MODS && code <= QK_MODS_MAX) {
    const mods = (code >> 8) & 0x1f;
    const kc = code & 0xff;
    return { tap: `${modLabel(mods)}+${basicLabel(kc)}` };
  }

  // Mod-tap
  if (code >= QK_MOD_TAP && code <= QK_MOD_TAP_MAX) {
    const mods = (code >> 8) & 0x1f;
    const kc = code & 0xff;
    return { tap: basicLabel(kc), hold: modLabel(mods) };
  }

  // Layer-tap
  if (code >= QK_LAYER_TAP && code <= QK_LAYER_TAP_MAX) {
    const layer = (code >> 8) & 0x0f;
    const kc = code & 0xff;
    return {
      tap: basicLabel(kc),
      hold: LAYER_NAMES[layer] ?? `L${layer}`,
    };
  }

  // TO(layer)
  if (code >= QK_TO && code <= QK_TO_MAX) {
    const layer = code & 0x1f;
    return { tap: `TO ${LAYER_NAMES[layer] ?? layer}` };
  }

  // MO(layer)
  if (code >= QK_MOMENTARY && code <= QK_MOMENTARY_MAX) {
    const layer = code & 0x1f;
    return { tap: LAYER_NAMES[layer] ?? `MO${layer}` };
  }

  // TG(layer)
  if (code >= QK_TOGGLE_LAYER && code <= QK_TOGGLE_LAYER_MAX) {
    const layer = code & 0x1f;
    return { tap: LAYER_NAMES[layer] ?? `TG${layer}` };
  }

  // Unknown
  return { tap: `0x${code.toString(16).padStart(4, "0")}` };
}
