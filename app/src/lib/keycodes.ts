export const KEYCODES = {
  letters: [
    "A","B","C","D","E","F","G","H","I","J","K","L","M",
    "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  ],
  numbers: ["N1","N2","N3","N4","N5","N6","N7","N8","N9","N0"],
  fkeys: ["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"],
  modifiers: ["LSHFT","RSHFT","LCTRL","RCTRL","LALT","RALT","LGUI","RGUI"],
  navigation: ["UP","DOWN","LEFT","RIGHT","HOME","END","PG_UP","PG_DN"],
  editing: ["BSPC","DEL","TAB","RET","ESC","SPACE","INS"],
  symbols: [
    "MINUS","EQUAL","LBKT","RBKT","BSLH","SEMI","SQT","GRAVE","COMMA","DOT","FSLH",
    "EXCL","AT","HASH","DLLR","PRCNT","CARET","AMPS","STAR","LPAR","RPAR",
    "UNDER","PLUS","PIPE","TILDE","DQT","LT","GT","LBRC","RBRC","QMARK","COLON",
  ],
  media: [
    "C_VOL_UP","C_VOL_DN","C_MUTE","C_PP","C_NEXT","C_PREV",
    "C_BRI_UP","C_BRI_DN","C_PLAY_PAUSE",
  ],
  mouse: ["LCLK","RCLK","MCLK","MB4","MB5"],
  international: [
    "NON_US_HASH","NON_US_BSLH",
    "INT1","INT2","INT3","INT4","INT5","INT6","INT7","INT8","INT9",
    "LANG1","LANG2","LANG3","LANG4","LANG5","LANG6","LANG7","LANG8","LANG9",
  ],
} as const;

export type KeycodeCategory = keyof typeof KEYCODES;

export const CATEGORY_LABELS: Record<KeycodeCategory, string> = {
  letters: "Letters",
  numbers: "Numbers",
  fkeys: "F-Keys",
  modifiers: "Modifiers",
  navigation: "Navigation",
  editing: "Editing",
  symbols: "Symbols",
  media: "Media",
  mouse: "Mouse",
  international: "International",
};

export const ALL_KEYCODES: string[] = Object.values(KEYCODES).flat();

export const ACTIONS = [
  "kp", "hml", "hmr", "lt_th", "lt", "mt", "trans", "none",
  "bt", "out", "tog", "mo", "sl", "to", "mmv", "msc", "mkp",
  "comma_morph", "dot_morph", "caps_word", "fat_arrow",
  "sk", "kt", "td", "key_repeat", "gresc", "soft_off",
  "bootloader", "sys_reset", "ext_power", "studio_unlock",
] as const;

export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<Action, string> = {
  // Key behaviors
  kp: "Key Press",
  mt: "Mod-Tap",
  lt: "Layer-Tap",
  sk: "Sticky Key",
  kt: "Key Toggle",
  gresc: "Grave Escape",
  caps_word: "Caps Word",
  key_repeat: "Key Repeat",
  td: "Tap Dance",
  // Custom hold-taps
  hml: "HRM Left",
  hmr: "HRM Right",
  lt_th: "Layer-Tap Thumb",
  // Layer control
  mo: "Momentary",
  tog: "Toggle",
  sl: "Sticky Layer",
  to: "To Layer",
  trans: "Transparent",
  none: "None",
  // Mouse
  mmv: "Move",
  msc: "Scroll",
  mkp: "Click",
  // Wireless
  bt: "Bluetooth",
  out: "Output",
  // Custom behaviors
  comma_morph: ", → ;",
  dot_morph: ". → :",
  fat_arrow: "=> Macro",
  // System
  soft_off: "Soft Off",
  bootloader: "Bootloader",
  sys_reset: "Reset",
  ext_power: "Ext Power",
  studio_unlock: "Studio Unlock",
};

/** Short descriptions for each action, shown in the picker */
export const ACTION_DESCRIPTIONS: Record<Action, string> = {
  kp: "Send a keycode when pressed",
  mt: "Hold: modifier — Tap: keycode",
  lt: "Hold: activate layer — Tap: keycode",
  sk: "One-shot modifier — applies to the next keypress only",
  kt: "Press to toggle a key on, press again to toggle off",
  gresc: "Tap: Escape — With Shift/GUI held: ` ~",
  caps_word: "Capitalizes the next word, then auto-disables",
  key_repeat: "Repeats whatever key was last pressed",
  td: "Different action for single, double, or triple tap",
  hml: "Positional hold-tap — hold triggers only on right-hand keys",
  hmr: "Positional hold-tap — hold triggers only on left-hand keys",
  lt_th: "Layer-tap tuned for thumb keys (faster activation)",
  mo: "Activate layer while held, deactivate on release",
  tog: "Toggle layer on/off with each press",
  sl: "Activate layer for just the next keypress",
  to: "Switch to layer permanently until another &to",
  trans: "Transparent — falls through to the layer below",
  none: "Blocks key completely — no action at all",
  mmv: "Move the mouse cursor in a direction",
  msc: "Scroll the mouse wheel in a direction",
  mkp: "Press a mouse button (left, right, middle, etc.)",
  bt: "Bluetooth profile switching, pairing, and clearing",
  out: "Select output: USB, Bluetooth, or toggle between them",
  comma_morph: "Normal: comma (,) — Shifted: semicolon (;)",
  dot_morph: "Normal: period (.) — Shifted: colon (:)",
  fat_arrow: "Macro that types => (equal sign + greater than)",
  soft_off: "Put the keyboard into deep sleep",
  bootloader: "Enter USB firmware flash mode (DFU/UF2)",
  sys_reset: "Reset the keyboard microcontroller",
  ext_power: "Control external power output (LEDs, etc.)",
  studio_unlock: "Unlock ZMK Studio for live editing",
};

/** Grouped actions for organized display in the picker */
export interface ActionGroup {
  label: string;
  actions: Action[];
}

export const ACTION_GROUPS: ActionGroup[] = [
  {
    label: "Keys",
    actions: ["kp", "mt", "lt", "sk", "kt", "gresc", "caps_word", "key_repeat", "td"],
  },
  {
    label: "Custom Hold-Taps",
    actions: ["hml", "hmr", "lt_th"],
  },
  {
    label: "Layers",
    actions: ["mo", "tog", "sl", "to", "trans", "none"],
  },
  {
    label: "Mouse",
    actions: ["mmv", "msc", "mkp"],
  },
  {
    label: "Wireless",
    actions: ["bt", "out"],
  },
  {
    label: "Mod-Morphs & Macros",
    actions: ["comma_morph", "dot_morph", "fat_arrow"],
  },
  {
    label: "System",
    actions: ["bootloader", "sys_reset", "soft_off", "ext_power", "studio_unlock"],
  },
];

export const LAYERS = ["BASE", "NAV", "NUM", "FUN", "UTIL", "GAME"] as const;

/** Actions that take no additional parameters */
export const NO_PARAM_ACTIONS: ReadonlySet<string> = new Set([
  "trans", "none", "comma_morph", "dot_morph", "caps_word", "fat_arrow",
  "td", "key_repeat", "gresc", "soft_off", "bootloader", "sys_reset", "studio_unlock",
]);

/** Actions that take a hold modifier + tap keycode */
export const HOLD_TAP_ACTIONS: ReadonlySet<string> = new Set([
  "hml", "hmr", "mt",
]);
