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
};

export const ALL_KEYCODES: string[] = Object.values(KEYCODES).flat();

export const ACTIONS = [
  "kp", "hml", "hmr", "lt_th", "lt", "mt", "trans", "none",
  "bt", "out", "tog", "mo", "sl", "to", "mmv", "msc", "mkp",
  "comma_morph", "dot_morph", "caps_word", "fat_arrow",
  "sk", "kt", "key_repeat", "gresc", "soft_off",
  "bootloader", "sys_reset", "ext_power", "studio_unlock",
] as const;

export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<Action, string> = {
  kp: "Key Press",
  hml: "Home Row Mod (L)",
  hmr: "Home Row Mod (R)",
  lt_th: "Layer Tap (Thumb)",
  lt: "Layer Tap",
  mt: "Mod Tap",
  trans: "Transparent",
  none: "None",
  bt: "Bluetooth",
  out: "Output",
  tog: "Layer Toggle",
  mo: "Momentary Layer",
  sl: "Sticky Layer",
  to: "To Layer",
  mmv: "Mouse Move",
  msc: "Mouse Scroll",
  mkp: "Mouse Button",
  comma_morph: "Comma Morph",
  dot_morph: "Dot Morph",
  caps_word: "Caps Word",
  fat_arrow: "Fat Arrow",
  sk: "Sticky Key",
  kt: "Key Toggle",
  key_repeat: "Key Repeat",
  gresc: "Grave Escape",
  soft_off: "Soft Off",
  bootloader: "Bootloader",
  sys_reset: "System Reset",
  ext_power: "Ext Power",
  studio_unlock: "Studio Unlock",
};

export const LAYERS = ["BASE", "NAV", "NUM", "FUN", "UTIL", "GAME"] as const;

/** Actions that take no additional parameters */
export const NO_PARAM_ACTIONS: ReadonlySet<string> = new Set([
  "trans", "none", "comma_morph", "dot_morph", "caps_word", "fat_arrow",
  "key_repeat", "gresc", "soft_off", "bootloader", "sys_reset", "studio_unlock",
]);

/** Actions that take a hold modifier + tap keycode */
export const HOLD_TAP_ACTIONS: ReadonlySet<string> = new Set([
  "hml", "hmr", "mt",
]);
