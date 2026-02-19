// Nerd Font icon codepoints (MDI = Material Design Icons, nf-md-*):
// Only 5-digit MDI codepoints — FA 4-digit codepoints render wrong in Lilex.
//
// Keyboard:   F006E=backspace  F0E7E=backspace_reverse  F0311=keyboard_return
//             F0312=keyboard_tab  F1050=keyboard_space
// Volume:     F057E=volume_high  F057F=volume_low  F0581=volume_off
// Media:      F040A=play  F03E4=pause  F04DB=stop
//             F04AD=skip_next  F04AE=skip_previous
// System:     F0425=power  F033E=lock  F02DC=home  F04B2=sleep
// Misc:       F00AF=bluetooth  F0553=usb
// Brightness: F00DE=brightness_5  F00E0=brightness_7

const LABEL_MAP: Record<string, string> = {
  // ── Modifiers ──
  "LGUI": "Gui", "RGUI": "Gui", "LEFT_GUI": "Gui", "RIGHT_GUI": "Gui",
  "LWIN": "Win", "RWIN": "Win", "LEFT_WIN": "Win", "RIGHT_WIN": "Win",
  "LCMD": "Cmd", "RCMD": "Cmd", "LEFT_COMMAND": "Cmd", "RIGHT_COMMAND": "Cmd",
  "LMETA": "Meta", "RMETA": "Meta", "LEFT_META": "Meta", "RIGHT_META": "Meta",
  "LALT": "Alt", "RALT": "Alt", "LEFT_ALT": "Alt", "RIGHT_ALT": "Alt",
  "LCTRL": "Ctrl", "RCTRL": "Ctrl", "LEFT_CONTROL": "Ctrl", "RIGHT_CONTROL": "Ctrl",
  "LSHFT": "Shft", "RSHFT": "Shft", "LEFT_SHIFT": "Shft", "RIGHT_SHIFT": "Shft",
  "LSHIFT": "Shft", "RSHIFT": "Shft",

  // ── Navigation ──
  "UP": "\u2191", "DOWN": "\u2193", "LEFT": "\u2190", "RIGHT": "\u2192",
  "UP_ARROW": "\u2191", "DOWN_ARROW": "\u2193", "LEFT_ARROW": "\u2190", "RIGHT_ARROW": "\u2192",
  "HOME": "\u{F02DC}", "END": "End",
  "PG_UP": "PgUp", "PG_DN": "PgDn", "PAGE_UP": "PgUp", "PAGE_DOWN": "PgDn",

  // ── Editing / control (MDI keyboard icons) ──
  "BSPC": "\u{F006E}", "BACKSPACE": "\u{F006E}",
  "DEL": "\u{F0E7E}", "DELETE": "\u{F0E7E}",
  "TAB": "\u{F0312}",
  "RET": "\u{F0311}", "RETURN": "\u{F0311}", "ENTER": "\u{F0311}", "RET2": "\u{F0311}", "RETURN2": "\u{F0311}",
  "ESC": "Esc", "ESCAPE": "Esc",
  "SPACE": "\u{F1050}",
  "INS": "Ins", "INSERT": "Ins",

  // ── Locks ──
  "CAPS": "Caps", "CAPSLOCK": "Caps", "CLCK": "Caps",
  "LCAPS": "Caps", "LOCKING_CAPS": "Caps",
  "SCROLLLOCK": "ScrLk", "LSLCK": "ScrLk", "LOCKING_SCROLL": "ScrLk",
  "KP_NUMLOCK": "NumLk", "KP_NUM": "NumLk", "KP_NLCK": "NumLk",
  "LNLCK": "NumLk", "LOCKING_NUM": "NumLk",

  // ── Numbers ──
  "N0": "0", "N1": "1", "N2": "2", "N3": "3", "N4": "4",
  "N5": "5", "N6": "6", "N7": "7", "N8": "8", "N9": "9",
  "NUMBER_0": "0", "NUMBER_1": "1", "NUMBER_2": "2", "NUMBER_3": "3", "NUMBER_4": "4",
  "NUMBER_5": "5", "NUMBER_6": "6", "NUMBER_7": "7", "NUMBER_8": "8", "NUMBER_9": "9",

  // ── Symbols ──
  "MINUS": "-", "EQUAL": "=", "LBKT": "[", "RBKT": "]", "BSLH": "\\",
  "LEFT_BRACKET": "[", "RIGHT_BRACKET": "]", "BACKSLASH": "\\",
  "SEMI": ";", "SEMICOLON": ";", "SQT": "'", "SINGLE_QUOTE": "'", "APOSTROPHE": "'", "APOS": "'",
  "GRAVE": "`", "COMMA": ",", "DOT": ".", "PERIOD": ".", "FSLH": "/", "SLASH": "/",
  "EXCL": "!", "EXCLAMATION": "!", "AT": "@", "AT_SIGN": "@",
  "HASH": "#", "POUND": "#", "DLLR": "$", "DOLLAR": "$", "PRCNT": "%", "PERCENT": "%",
  "CARET": "^", "AMPS": "&", "AMPERSAND": "&", "STAR": "*", "ASTERISK": "*", "ASTRK": "*",
  "LPAR": "(", "RPAR": ")", "LEFT_PARENTHESIS": "(", "RIGHT_PARENTHESIS": ")",
  "UNDER": "_", "UNDERSCORE": "_", "PLUS": "+", "PIPE": "|", "PIPE2": "|",
  "TILDE": "~", "TILDE2": "~", "DQT": "\"", "DOUBLE_QUOTES": "\"",
  "LT": "<", "LESS_THAN": "<", "GT": ">", "GREATER_THAN": ">",
  "LBRC": "{", "LEFT_BRACE": "{", "RBRC": "}", "RIGHT_BRACE": "}",
  "QMARK": "?", "QUESTION": "?", "COLON": ":",
  "NON_US_BSLH": "\\", "NUBS": "\\", "NON_US_BACKSLASH": "\\",
  "NON_US_HASH": "#", "NUHS": "#",

  // ── Function keys ──
  "PSCRN": "PScr", "PRINTSCREEN": "PScr",
  "SLCK": "ScrLk",
  "PAUSE_BREAK": "Pause",

  // ── Numpad ──
  "KP_N0": "KP 0", "KP_N1": "KP 1", "KP_N2": "KP 2", "KP_N3": "KP 3", "KP_N4": "KP 4",
  "KP_N5": "KP 5", "KP_N6": "KP 6", "KP_N7": "KP 7", "KP_N8": "KP 8", "KP_N9": "KP 9",
  "KP_NUMBER_0": "KP 0", "KP_NUMBER_1": "KP 1", "KP_NUMBER_2": "KP 2", "KP_NUMBER_3": "KP 3",
  "KP_NUMBER_4": "KP 4", "KP_NUMBER_5": "KP 5", "KP_NUMBER_6": "KP 6", "KP_NUMBER_7": "KP 7",
  "KP_NUMBER_8": "KP 8", "KP_NUMBER_9": "KP 9",
  "KP_PLUS": "KP +", "KP_MINUS": "KP -", "KP_SUBTRACT": "KP -",
  "KP_MULTIPLY": "KP *", "KP_ASTERISK": "KP *",
  "KP_DIVIDE": "KP /", "KP_SLASH": "KP /",
  "KP_DOT": "KP .", "KP_COMMA": "KP ,",
  "KP_EQUAL": "KP =", "KP_EQUAL_AS400": "KP =",
  "KP_ENTER": "KP \u{F0311}",
  "KP_LPAR": "KP (", "KP_LEFT_PARENTHESIS": "KP (",
  "KP_RPAR": "KP )", "KP_RIGHT_PARENTHESIS": "KP )",
  "KP_CLEAR": "KP Clr", "CLEAR": "Clr", "CLEAR2": "Clr", "CLEAR_AGAIN": "Clr",

  // ── Consumer: media playback (MDI icons) ──
  "C_PLAY": "\u{F040A}", "C_PAUSE": "\u{F03E4}", "C_STOP": "\u{F04DB}",
  "C_PP": "\u{F040A}", "C_PLAY_PAUSE": "\u{F040A}", "K_PP": "\u{F040A}", "K_PLAY_PAUSE": "\u{F040A}",
  "C_NEXT": "\u{F04AD}", "K_NEXT": "\u{F04AD}",
  "C_PREV": "\u{F04AE}", "C_PREVIOUS": "\u{F04AE}", "K_PREV": "\u{F04AE}", "K_PREVIOUS": "\u{F04AE}",
  "C_FF": "FF", "C_FAST_FORWARD": "FF",
  "C_RW": "RW", "C_REWIND": "RW",
  "C_REC": "Rec", "C_RECORD": "Rec",
  "C_EJECT": "Eject", "K_EJECT": "Eject", "C_STOP_EJECT": "Eject",
  "C_REPEAT": "Rpt", "C_SHUFFLE": "Shfl", "C_RANDOM_PLAY": "Shfl",
  "C_SLOW": "Slow", "C_SLOW2": "Slow", "C_SLOW_TRACKING": "Slow",
  "C_CAPTIONS": "CC", "C_SUBTITLES": "CC", "C_SNAPSHOT": "Snap",

  // ── Consumer: volume & sound (MDI speaker icons) ──
  "C_VOL_UP": "\u{F057E}", "C_VOLUME_UP": "\u{F057E}", "K_VOL_UP": "\u{F057E}", "K_VOLUME_UP": "\u{F057E}", "K_VOL_UP2": "\u{F057E}", "K_VOLUME_UP2": "\u{F057E}",
  "C_VOL_DN": "\u{F057F}", "C_VOLUME_DOWN": "\u{F057F}", "K_VOL_DN": "\u{F057F}", "K_VOLUME_DOWN": "\u{F057F}", "K_VOL_DN2": "\u{F057F}", "K_VOLUME_DOWN2": "\u{F057F}",
  "C_MUTE": "\u{F0581}", "K_MUTE": "\u{F0581}", "K_MUTE2": "\u{F0581}",
  "C_BASS_BOOST": "Bass", "C_ALT_AUDIO_INC": "Alt\u266A", "C_ALTERNATE_AUDIO_INCREMENT": "Alt\u266A",

  // ── Consumer: display (MDI brightness/sun icons) ──
  "C_BRI_UP": "\u{F00E0}", "C_BRI_INC": "\u{F00E0}", "C_BRIGHTNESS_INC": "\u{F00E0}",
  "C_BRI_DN": "\u{F00DE}", "C_BRI_DEC": "\u{F00DE}", "C_BRIGHTNESS_DEC": "\u{F00DE}",
  "C_BRI_MIN": "Bri Min", "C_BRIGHTNESS_MINIMUM": "Bri Min",
  "C_BRI_MAX": "Bri Max", "C_BRIGHTNESS_MAXIMUM": "Bri Max",
  "C_BRI_AUTO": "Bri A", "C_BRIGHTNESS_AUTO": "Bri A",
  "C_BKLT_TOG": "BkLt", "C_BACKLIGHT_TOGGLE": "BkLt",
  "C_ASPECT": "Aspt", "C_PIP": "PiP",

  // ── Consumer: menu & controls ──
  "C_MENU": "Menu",
  "C_MENU_PICK": "OK", "C_MENU_SELECT": "OK",
  "C_MENU_UP": "M\u2191", "C_MENU_DOWN": "M\u2193", "C_MENU_LEFT": "M\u2190", "C_MENU_RIGHT": "M\u2192",
  "C_MENU_ESC": "M Esc", "C_MENU_ESCAPE": "M Esc",
  "C_MENU_INC": "M+", "C_MENU_INCREASE": "M+", "C_MENU_DEC": "M-", "C_MENU_DECREASE": "M-",
  "C_RED": "Red", "C_RED_BUTTON": "Red", "C_GREEN": "Grn", "C_GREEN_BUTTON": "Grn",
  "C_BLUE": "Blu", "C_BLUE_BUTTON": "Blu", "C_YELLOW": "Yel", "C_YELLOW_BUTTON": "Yel",
  "C_CHAN_INC": "Ch+", "C_CHANNEL_INC": "Ch+", "C_CHAN_DEC": "Ch-", "C_CHANNEL_DEC": "Ch-",
  "C_CHAN_LAST": "ChLst", "C_RECALL_LAST": "ChLst",
  "C_DATA_ON_SCREEN": "Data",

  // ── Consumer: media source ──
  "C_MEDIA_HOME": "MHome", "C_MEDIA_TV": "TV", "C_MEDIA_CABLE": "Cable",
  "C_MEDIA_DVD": "DVD", "C_MEDIA_CD": "CD", "C_MEDIA_VCR": "VCR",
  "C_MEDIA_GUIDE": "Guide", "C_MODE_STEP": "Mode", "C_MEDIA_STEP": "Mode",
  "C_MEDIA_COMPUTER": "PC", "C_MEDIA_WWW": "WWW", "C_MEDIA_GAMES": "Games",
  "C_MEDIA_PHONE": "Phone", "C_MEDIA_MESSAGES": "Msg",
  "C_MEDIA_SATELLITE": "Sat", "C_MEDIA_TAPE": "Tape", "C_MEDIA_TUNER": "Tuner",

  // ── Consumer: power & lock (MDI icons) ──
  "C_PWR": "\u{F0425}", "C_POWER": "\u{F0425}", "K_PWR": "\u{F0425}", "K_POWER": "\u{F0425}",
  "C_RESET": "Rst",
  "C_SLEEP": "\u{F04B2}", "K_SLEEP": "\u{F04B2}", "C_SLEEP_MODE": "\u{F04B2}",
  "C_AL_LOGOFF": "Logoff",
  "C_AL_LOCK": "\u{F033E}", "C_AL_SCREENSAVER": "\u{F033E}", "C_AL_COFFEE": "\u{F033E}",
  "K_LOCK": "\u{F033E}", "K_SCREENSAVER": "\u{F033E}", "K_COFFEE": "\u{F033E}",

  // ── Application control ──
  "C_AC_HOME": "\u{F02DC}", "C_AC_BACK": "Back", "C_AC_FORWARD": "Fwd",
  "C_AC_REFRESH": "Rfsh", "K_REFRESH": "Rfsh", "C_AC_STOP": "Stop", "K_STOP": "Stop", "K_STOP2": "Stop", "K_STOP3": "Stop",
  "C_AC_SEARCH": "Srch", "C_AC_FIND": "Srch", "K_FIND": "Srch", "K_FIND2": "Srch",
  "C_AC_BOOKMARKS": "Bkmk", "C_AC_FAVORITES": "Bkmk", "C_AC_FAVOURITES": "Bkmk",
  "C_AC_ZOOM": "Zoom", "C_AC_ZOOM_IN": "Z+", "C_AC_ZOOM_OUT": "Z-",
  "C_AC_SCROLL_UP": "Scr\u2191", "K_SCROLL_UP": "Scr\u2191",
  "C_AC_SCROLL_DOWN": "Scr\u2193", "K_SCROLL_DOWN": "Scr\u2193",
  "C_AC_NEW": "New", "C_AC_OPEN": "Open", "C_AC_SAVE": "Save", "C_AC_CLOSE": "Close",
  "C_AC_PRINT": "Prnt", "C_AC_EXIT": "Exit",
  "C_AC_CUT": "Cut", "C_AC_COPY": "Copy", "C_AC_PASTE": "Pste",
  "C_AC_UNDO": "Undo", "C_AC_REDO": "Redo",
  "C_AC_EDIT": "Edit", "C_AC_PROPERTIES": "Props", "C_AC_PROPS": "Props",
  "C_AC_VIEW_TOGGLE": "View", "C_AC_INS": "Ins", "C_AC_INSERT": "Ins", "C_AC_DEL": "Del",
  "C_AC_REPLY": "Reply", "C_AC_FORWARD_MAIL": "FwdMl", "C_AC_SEND": "Send",
  "C_AC_GOTO": "Goto",
  "C_AC_DESKTOP_SHOW_ALL_WINDOWS": "AllWin",
  "C_AC_DESKTOP_SHOW_ALL_APPLICATIONS": "AllApp",
  "C_AC_NEXT_KEYBOARD_LAYOUT_SELECT": "KbLay", "GLOBE": "Globe",
  "C_VOICE_COMMAND": "Voice",
  "C_QUIT": "Quit", "C_HELP": "Help",

  // ── Application launch ──
  "C_AL_CALC": "Calc", "C_AL_CALCULATOR": "Calc", "K_CALC": "Calc", "K_CALCULATOR": "Calc",
  "C_AL_FILES": "Files", "C_AL_FILE_BROWSER": "Files",
  "C_AL_WWW": "Web", "K_WWW": "Web",
  "C_AL_MAIL": "Mail", "C_AL_EMAIL": "Mail",
  "C_AL_MUSIC": "Music", "C_AL_AUDIO": "Music", "C_AL_AUDIO_BROWSER": "Music",
  "C_AL_MOVIES": "Film", "C_AL_MOVIE_BROWSER": "Film",
  "C_AL_IMAGES": "Img", "C_AL_IMAGE_BROWSER": "Img",
  "C_AL_DOCS": "Docs", "C_AL_DOCUMENTS": "Docs",
  "C_AL_WORD": "Word", "C_AL_SHEET": "Sheet", "C_AL_SPREADSHEET": "Sheet",
  "C_AL_PRESENTATION": "Pres", "C_AL_GRAPHICS_EDITOR": "GfxEd",
  "C_AL_TEXT_EDITOR": "TxtEd",
  "C_AL_IM": "IM", "C_AL_INSTANT_MESSAGING": "IM",
  "C_AL_CHAT": "Chat", "C_AL_NETWORK_CHAT": "Chat",
  "C_AL_CONTACTS": "Cont", "C_AL_ADDRESS_BOOK": "Cont",
  "C_AL_CAL": "Cal", "C_AL_CALENDAR": "Cal",
  "C_AL_NEWS": "News", "C_AL_DB": "DB", "C_AL_DATABASE": "DB",
  "C_AL_VOICEMAIL": "VMail", "C_AL_FINANCE": "Fin",
  "C_AL_TASK_MANAGER": "TaskM", "C_AL_JOURNAL": "Jrnl",
  "C_AL_CONTROL_PANEL": "CPanel", "C_AL_HELP": "Help", "K_HELP": "Help",
  "C_AL_SPELL": "Spell", "C_AL_SPELLCHECK": "Spell",
  "C_AL_SCREEN_SAVER": "ScrSv", "C_AL_KEYBOARD_LAYOUT": "KbLay",
  "C_AL_TIPS": "Tips", "C_AL_TUTORIAL": "Tips", "C_AL_OEM_FEATURES": "Tips",
  "C_AL_NEXT_TASK": "NxTask", "C_AL_PREV_TASK": "PvTask", "C_AL_PREVIOUS_TASK": "PvTask",
  "C_AL_SELECT_TASK": "SelTsk", "C_AL_MY_COMPUTER": "MyPC",

  // ── Input assist ──
  "C_KBIA_NEXT": "IA\u2192", "C_KEYBOARD_INPUT_ASSIST_NEXT": "IA\u2192",
  "C_KBIA_PREV": "IA\u2190", "C_KEYBOARD_INPUT_ASSIST_PREVIOUS": "IA\u2190",
  "C_KBIA_NEXT_GRP": "IAG\u2192", "C_KEYBOARD_INPUT_ASSIST_NEXT_GROUP": "IAG\u2192",
  "C_KBIA_PREV_GRP": "IAG\u2190", "C_KEYBOARD_INPUT_ASSIST_PREVIOUS_GROUP": "IAG\u2190",
  "C_KBIA_ACCEPT": "IA OK", "C_KEYBOARD_INPUT_ASSIST_ACCEPT": "IA OK",
  "C_KBIA_CANCEL": "IA X", "C_KEYBOARD_INPUT_ASSIST_CANCEL": "IA X",

  // ── International ──
  "INT1": "Int1", "INTERNATIONAL_1": "Int1", "INT_RO": "Ro",
  "INT2": "Int2", "INTERNATIONAL_2": "Int2", "INT_KANA": "Kana", "INT_KATAKANAHIRAGANA": "Kana",
  "INT3": "Int3", "INTERNATIONAL_3": "Int3", "INT_YEN": "\u00A5",
  "INT4": "Int4", "INTERNATIONAL_4": "Int4", "INT_HENKAN": "Henk",
  "INT5": "Int5", "INTERNATIONAL_5": "Int5", "INT_MUHENKAN": "Muhn",
  "INT6": "Int6", "INTERNATIONAL_6": "Int6",
  "INT7": "Int7", "INTERNATIONAL_7": "Int7",
  "INT8": "Int8", "INTERNATIONAL_8": "Int8",
  "INT9": "Int9", "INTERNATIONAL_9": "Int9",

  // ── Language ──
  "LANG1": "Lang1", "LANGUAGE_1": "Lang1", "LANG_HANGEUL": "Hang",
  "LANG2": "Lang2", "LANGUAGE_2": "Lang2", "LANG_HANJA": "Hnja",
  "LANG3": "Lang3", "LANGUAGE_3": "Lang3", "LANG_KATAKANA": "Kata",
  "LANG4": "Lang4", "LANGUAGE_4": "Lang4", "LANG_HIRAGANA": "Hira",
  "LANG5": "Lang5", "LANGUAGE_5": "Lang5", "LANG_ZENKAKUHANKAKU": "ZH",
  "LANG6": "Lang6", "LANGUAGE_6": "Lang6",
  "LANG7": "Lang7", "LANGUAGE_7": "Lang7",
  "LANG8": "Lang8", "LANGUAGE_8": "Lang8",
  "LANG9": "Lang9", "LANGUAGE_9": "Lang9",

  // ── Misc system ──
  "ALT_ERASE": "AltEr", "SYSREQ": "SysRq", "ATTENTION": "SysRq",
  "K_CANCEL": "Cncl", "K_EDIT": "Edit",
  "CRSEL": "CrSel", "EXSEL": "ExSel", "PRIOR": "Prior",
  "SEPARATOR": "Sep", "OUT": "Out", "OPER": "Oper",

  // ── Editing shortcuts ──
  "K_UNDO": "Undo", "K_CUT": "Cut", "K_COPY": "Copy", "K_PASTE": "Pste",
  "K_REDO": "Redo", "K_AGAIN": "Redo",
  "K_BACK": "Back", "K_FORWARD": "Fwd",
  "K_APP": "Menu", "K_CONTEXT_MENU": "Menu", "K_CMENU": "Menu", "K_APPLICATION": "Menu",
  "K_SELECT": "Sel", "K_EXEC": "Exec", "K_EXECUTE": "Exec",

  // ── Mouse ──
  "LCLK": "LClk", "RCLK": "RClk", "MCLK": "MClk", "MB4": "MB4", "MB5": "MB5",
  "MOVE_LEFT": "\u2190", "MOVE_RIGHT": "\u2192", "MOVE_UP": "\u2191", "MOVE_DOWN": "\u2193",
  "SCRL_UP": "S\u2191", "SCRL_DOWN": "S\u2193", "SCRL_LEFT": "S\u2190", "SCRL_RIGHT": "S\u2192",

  // ── Bluetooth & output (MDI icons) ──
  "BT_SEL": "\u{F00AF}", "BT_CLR": "BT Clr", "BT_CLR_ALL": "BT ClrA",
  "BT_NXT": "BT\u2192", "BT_PRV": "BT\u2190",
  "OUT_TOG": "\u{F0553}/\u{F00AF}", "OUT_USB": "\u{F0553}", "OUT_BLE": "\u{F00AF}",
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
      if (params[0] === "BT_CLR_ALL") return { main: "Clr All" };
      if (params[0] === "BT_NXT") return { main: "BT \u25B8" };
      if (params[0] === "BT_PRV") return { main: "BT \u25C2" };
      if (params[0] === "BT_DISC") return { top: "\u{F00AF}", main: `DC${params[1] ?? ""}` };
      if (params[0] === "BT_SEL") return { top: "\u{F00AF}", main: params[1] ?? "" };
      return { main: resolveKey(params[0] ?? "BT") };
    }

    // Output toggle
    case "out":
      return { main: resolveKey(params[0] ?? "OUT_TOG") };

    // Layer toggle
    case "tog": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      return { top: "TOG", main: layerName };
    }

    // Mod-morphs
    case "comma_morph":
      return { top: ";", main: "," };

    case "dot_morph":
      return { top: ":", main: "." };

    // Mouse movement
    case "mmv":
      return { top: "Mouse", main: resolveKey(params[0] ?? "") };

    // Mouse scroll
    case "msc":
      return { top: "Scrl", main: resolveKey(params[0] ?? "") };

    // Mouse button
    case "mkp":
      return { main: resolveKey(params[0] ?? "") };

    // Caps word
    case "caps_word":
      return { main: "Caps" };

    // ZMK Studio unlock
    case "studio_unlock":
      return { main: "\u{F033E}" };

    // Fat arrow macro
    case "fat_arrow":
      return { main: "=>" };

    // Sticky key
    case "sk":
      return { top: "SK", main: resolveKey(params[0] ?? "") };

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
      return { top: "\u{F0425}", main: params[0]?.replace("EP_", "") ?? "TOG" };

    // Layer-tap (generic ZMK)
    case "lt": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      const tap = resolveKey(params[1] ?? "");
      return { top: layerName, main: tap };
    }

    // Sticky layer
    case "sl": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      return { top: "SL", main: layerName };
    }

    // To layer (activates until another layer is activated)
    case "to": {
      const layerIdx = parseInt(params[0] ?? "0", 10);
      const layerName = isNaN(layerIdx) ? (params[0] ?? "") : (LAYER_NAMES[layerIdx] ?? params[0] ?? "");
      return { top: "TO", main: layerName };
    }

    // Grave escape
    case "gresc":
      return { main: "Esc/`" };

    // Tap dance
    case "td":
      return { top: "TD", main: params[0] ?? "" };

    // Conditional layer
    case "conditional_layer":
      return { top: "CL", main: params[0] ?? "" };

    // Key toggle
    case "kt":
      return { top: "KT", main: resolveKey(params[0] ?? "") };

    // Soft off (ZMK deep sleep)
    case "soft_off":
      return { main: "\u{F04B2}" };

    // RGB underglow
    case "rgb_ug":
      return { top: "RGB", main: params[0]?.replace("RGB_", "") ?? "TOG" };

    // Backlight
    case "bl":
      return { top: "BL", main: params[0]?.replace("BL_", "") ?? "TOG" };

    default:
      return { main: action };
  }
}
