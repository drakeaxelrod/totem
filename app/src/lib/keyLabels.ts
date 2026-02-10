export interface KeyLabel {
  tap: string;
  hold?: string;
  isTransparent?: boolean;
}

interface MorseEntry {
  tap: string;
  hold: string;
  hold_after_tap?: string;
}

const LAYER_NAMES: Record<number, string> = {
  0: "Base",
  1: "Func",
  2: "Nav",
  3: "Mouse",
  4: "Media",
  5: "Num",
  6: "Gaming",
};

// Maps RMK named keycodes to short display labels
const KEYCODE_LABELS: Record<string, string> = {
  // Punctuation
  Comma: ",",
  Dot: ".",
  Semicolon: ";",
  Quote: "'",
  Grave: "`",
  Slash: "/",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  LeftBracket: "[",
  RightBracket: "]",

  // Numbers
  Kc0: "0", Kc1: "1", Kc2: "2", Kc3: "3", Kc4: "4",
  Kc5: "5", Kc6: "6", Kc7: "7", Kc8: "8", Kc9: "9",

  // Modifiers
  LShift: "Shift", RShift: "Shift",
  LCtrl: "Ctrl", RCtrl: "Ctrl",
  LAlt: "Alt", RAlt: "Alt",
  LGui: "Gui", RGui: "Gui",

  // Navigation
  Escape: "Esc",
  Space: "Space",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Bksp",
  Delete: "Del",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Left: "\u2190",
  Down: "\u2193",
  Up: "\u2191",
  Right: "\u2192",
  Insert: "Ins",
  CapsLock: "Caps",
  CapsWordToggle: "CapsW",
  Menu: "Menu",
  PrintScreen: "PrtSc",
  ScrollLock: "ScrLk",
  Pause: "Pause",

  // Editing
  Undo: "Undo",
  Cut: "Cut",
  Copy: "Copy",
  Paste: "Paste",
  Again: "Redo",

  // Media
  AudioMute: "Mute",
  AudioVolDown: "Vol-",
  AudioVolUp: "Vol+",
  MediaPrevTrack: "Prev",
  MediaNextTrack: "Next",
  MediaPlayPause: "Play",
  MediaStop: "Stop",
  MediaFastForward: "FF",
  MediaRewind: "Rew",
  MediaEject: "Eject",
  Calculator: "Calc",
  BrightnessDown: "Bri-",
  BrightnessUp: "Bri+",
  WwwBack: "Back",
  WwwForward: "Fwd",
  WwwRefresh: "Rfsh",
  WwwHome: "Home",

  // Mouse
  MouseLeft: "\u2190",
  MouseDown: "\u2193",
  MouseUp: "\u2191",
  MouseRight: "\u2192",
  MouseBtn1: "Btn1",
  MouseBtn2: "Btn2",
  MouseBtn3: "Btn3",
  MouseBtn4: "Back",
  MouseBtn5: "Fwd",
  MouseWheelUp: "WhlUp",
  MouseWheelDown: "WhlDn",
  MouseWheelLeft: "WhlL",
  MouseWheelRight: "WhlR",
  MouseAccel0: "Acc0",
  MouseAccel1: "Acc1",
  MouseAccel2: "Acc2",

  // BLE / User keys
  User0: "BT1",
  User1: "BT2",
  User2: "BT3",
  User5: "BT Clr",
  User6: "USB",
};

// Modifier short names for hold display
const MOD_LABELS: Record<string, string> = {
  LCtrl: "Ctrl",
  RCtrl: "Ctrl",
  LAlt: "Alt",
  RAlt: "Alt",
  LGui: "Gui",
  RGui: "Gui",
  LShift: "Shift",
  RShift: "Shift",
};

export function resolveKeyLabel(
  code: string,
  morses: MorseEntry[] = [],
): KeyLabel {
  if (code === "_") {
    return { tap: "\u25BD", isTransparent: true };
  }

  // MT(tap, mod) or MT(tap, mod, profile) — mod-tap
  const mtMatch = code.match(/^MT\((\w+),\s*(\w+)(?:,\s*\w+)?\)$/);
  if (mtMatch) {
    return {
      tap: KEYCODE_LABELS[mtMatch[1]] ?? mtMatch[1],
      hold: MOD_LABELS[mtMatch[2]] ?? mtMatch[2],
    };
  }

  // LT(layer, tap) or LT(layer, tap, profile) — layer-tap
  const ltMatch = code.match(/^LT\((\d+),\s*(\w+)(?:,\s*\w+)?\)$/);
  if (ltMatch) {
    const layerIdx = parseInt(ltMatch[1]);
    return {
      tap: KEYCODE_LABELS[ltMatch[2]] ?? ltMatch[2],
      hold: LAYER_NAMES[layerIdx] ?? `L${layerIdx}`,
    };
  }

  // TD(n) — tap-dance (morse)
  const tdMatch = code.match(/^TD\((\d+)\)$/);
  if (tdMatch) {
    const idx = parseInt(tdMatch[1]);
    const morse = morses[idx];
    if (morse) {
      const holdMatch = morse.hold.match(/^MO\((\d+)\)$/);
      return {
        tap: KEYCODE_LABELS[morse.tap] ?? morse.tap,
        hold: holdMatch
          ? LAYER_NAMES[parseInt(holdMatch[1])] ?? `L${holdMatch[1]}`
          : morse.hold,
      };
    }
    return { tap: `TD${idx}` };
  }

  // TG(layer) — toggle layer
  const tgMatch = code.match(/^TG\((\d+)\)$/);
  if (tgMatch) {
    const layerIdx = parseInt(tgMatch[1]);
    return { tap: LAYER_NAMES[layerIdx] ?? `TG${layerIdx}` };
  }

  // MO(layer) — momentary layer
  const moMatch = code.match(/^MO\((\d+)\)$/);
  if (moMatch) {
    const layerIdx = parseInt(moMatch[1]);
    return { tap: LAYER_NAMES[layerIdx] ?? `MO${layerIdx}` };
  }

  // Function keys
  const fMatch = code.match(/^F(\d+)$/);
  if (fMatch) {
    return { tap: `F${fMatch[1]}` };
  }

  // Named keycode or single letter
  if (KEYCODE_LABELS[code]) {
    return { tap: KEYCODE_LABELS[code] };
  }

  // Single letter or unknown — display as-is
  return { tap: code };
}

export { LAYER_NAMES };
