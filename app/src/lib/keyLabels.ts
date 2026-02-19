const LABEL_MAP: Record<string, string> = {
  // Modifiers
  "LGUI": "Gui", "RGUI": "Gui", "LALT": "Alt", "RALT": "Alt",
  "LCTRL": "Ctrl", "RCTRL": "Ctrl", "LSHFT": "Shft", "RSHFT": "Shft",
  "LEFT_SHIFT": "Shft",
  // Navigation
  "UP": "\u2191", "DOWN": "\u2193", "LEFT": "\u2190", "RIGHT": "\u2192",
  "UP_ARROW": "\u2191", "LEFT_ARROW": "\u2190", "RIGHT_ARROW": "\u2192", "DOWN_ARROW": "\u2193",
  "HOME": "Home", "END": "End", "PG_UP": "PgUp", "PG_DN": "PgDn",
  // Editing
  "BSPC": "\u232B", "DEL": "Del", "TAB": "Tab", "RET": "\u23CE", "ESC": "Esc",
  "SPACE": "Spc", "INS": "Ins",
  // Symbols
  "MINUS": "-", "EQUAL": "=", "LBKT": "[", "RBKT": "]", "BSLH": "\\",
  "SEMI": ";", "SQT": "'", "GRAVE": "`", "COMMA": ",", "DOT": ".", "FSLH": "/",
  "EXCL": "!", "AT": "@", "HASH": "#", "DLLR": "$", "PRCNT": "%",
  "CARET": "^", "AMPS": "&", "STAR": "*", "LPAR": "(", "RPAR": ")",
  "UNDER": "_", "PLUS": "+", "PIPE": "|", "TILDE": "~", "DQT": "\"",
  "LT": "<", "GT": ">", "LBRC": "{", "RBRC": "}", "QMARK": "?", "COLON": ":",
  // Media
  "C_VOL_UP": "Vol+", "C_VOL_DN": "Vol-", "C_MUTE": "Mute",
  "C_PP": "\u23EF", "C_NEXT": "\u23ED", "C_PREV": "\u23EE",
  "C_BRI_UP": "Bri+", "C_BRI_DN": "Bri-",
  "C_PLAY_PAUSE": "\u23EF",
  // Function
  "PSCRN": "PScr", "SLCK": "ScrLk", "PAUSE_BREAK": "Pause",
  // Misc
  "ESCAPE": "Esc",
  // Numbers
  "N0": "0", "N1": "1", "N2": "2", "N3": "3", "N4": "4",
  "N5": "5", "N6": "6", "N7": "7", "N8": "8", "N9": "9",
  // Numpad
  "KP_PLUS": "+", "KP_MULTIPLY": "*",
  // Bluetooth
  "BT_SEL": "BT", "BT_CLR": "BT Clr",
  // Mouse
  "LCLK": "LClk", "RCLK": "RClk", "MCLK": "MClk", "MB4": "MB4", "MB5": "MB5",
  "MOVE_LEFT": "M\u2190", "MOVE_RIGHT": "M\u2192", "MOVE_UP": "M\u2191", "MOVE_DOWN": "M\u2193",
  "SCRL_UP": "S\u2191", "SCRL_DOWN": "S\u2193", "SCRL_LEFT": "S\u2190", "SCRL_RIGHT": "S\u2192",
  // Output
  "OUT_TOG": "USB/BT",
  // Editing shortcuts
  "K_UNDO": "Undo", "K_CUT": "Cut", "K_COPY": "Copy", "K_PASTE": "Paste", "K_REDO": "Redo",
  "K_BACK": "Back", "K_FORWARD": "Fwd", "K_APP": "Menu", "K_MUTE": "Mute",
};

// Default layer names (fallback if none provided)
const DEFAULT_LAYER_NAMES = ["BASE", "NAV", "NUM", "FUN", "UTIL", "GAME"];

/** Resolve a single key code (possibly with modifier wrappers) to a display label. */
function resolveKey(param: string): string {
  // Check for Hyper: LS(LC(LA(LGUI))) or RS(RC(RA(RGUI)))
  if (param === "LS(LC(LA(LGUI)))" || param === "RS(RC(RA(RGUI)))") {
    return "Hyper";
  }

  // Check for modifier wrapper: e.g. LC(X), LS(SEMI)
  const modMatch = param.match(/^(L[CSAG]|R[CSAG]|LS|RS|LC|RC|LA|RA|LG|RG)\((.+)\)$/);
  if (modMatch) {
    const mod = modMatch[1];
    const inner = resolveKey(modMatch[2]);
    const modLabel: Record<string, string> = {
      "LC": "C-", "RC": "C-", "LCTRL": "C-", "RCTRL": "C-",
      "LS": "S-", "RS": "S-", "LSHFT": "S-", "RSHFT": "S-",
      "LA": "A-", "RA": "A-", "LALT": "A-", "RALT": "A-",
      "LG": "G-", "RG": "G-", "LGUI": "G-", "RGUI": "G-",
    };
    return (modLabel[mod] ?? (mod + "-")) + inner;
  }

  // Direct lookup
  if (LABEL_MAP[param]) return LABEL_MAP[param];

  // F-keys: F1..F12
  if (/^F\d{1,2}$/.test(param)) return param;

  // Single letters: A-Z
  if (/^[A-Z]$/.test(param)) return param;

  return param;
}

export function getKeyLabel(
  binding: { action: string; params: string[] },
  layerNames?: string[],
): { top?: string; main: string } {
  const { action, params } = binding;
  const LAYER_NAMES = layerNames ?? DEFAULT_LAYER_NAMES;

  switch (action) {
    // Simple keypress
    case "kp":
      return { main: resolveKey(params[0] ?? "") };

    // Home-row mods (hold-tap): hold = modifier, tap = key
    case "hml":
    case "hmr": {
      const hold = resolveKey(params[0] ?? "");
      const tap = resolveKey(params[1] ?? "");
      return { top: hold, main: tap };
    }

    // Layer-tap (thumb): hold = layer, tap = key
    case "lt_th": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      const tap = resolveKey(params[1] ?? "");
      return { top: layerName, main: tap };
    }

    // Mod-tap (gaming layer): hold = modifier, tap = key
    case "mt": {
      const hold = resolveKey(params[0] ?? "");
      const tap = resolveKey(params[1] ?? "");
      return { top: hold, main: tap };
    }

    // Transparent
    case "trans":
      return { main: "" };

    // None / disabled
    case "none":
      return { main: "\u2715" };

    // Bluetooth
    case "bt": {
      if (params[0] === "BT_CLR") return { main: "BT Clr" };
      if (params[0] === "BT_SEL") return { main: `BT ${params[1] ?? ""}` };
      return { main: resolveKey(params[0] ?? "BT") };
    }

    // Output toggle
    case "out":
      return { main: resolveKey(params[0] ?? "OUT_TOG") };

    // Layer toggle
    case "tog": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      return { main: `\u21C4 ${layerName}` };
    }

    // Mod-morphs
    case "comma_morph":
      return { top: ";", main: "," };

    case "dot_morph":
      return { top: ":", main: "." };

    // Mouse movement
    case "mmv":
      return { main: resolveKey(params[0] ?? "") };

    // Mouse scroll
    case "msc":
      return { main: resolveKey(params[0] ?? "") };

    // Mouse button
    case "mkp":
      return { main: resolveKey(params[0] ?? "") };

    // Caps word
    case "caps_word":
      return { main: "Caps" };

    // ZMK Studio unlock
    case "studio_unlock":
      return { main: "Studio" };

    // Fat arrow macro
    case "fat_arrow":
      return { main: "=>" };

    // Sticky key
    case "sk":
      return { top: "SK", main: params[0] ?? "" };

    // Momentary layer
    case "mo": {
      return { top: "MO", main: layerNames?.[parseInt(params[0])] ?? params[0] ?? "" };
    }

    // Key repeat
    case "key_repeat":
      return { main: "RPT" };

    // Bootloader
    case "bootloader":
      return { main: "BOOT" };

    // System reset
    case "sys_reset":
      return { main: "RST" };

    // External power
    case "ext_power":
      return { top: "PWR", main: params[0]?.replace("EP_", "") ?? "TOG" };

    default:
      return { main: action };
  }
}
