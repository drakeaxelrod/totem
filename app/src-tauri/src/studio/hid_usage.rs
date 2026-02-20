//! Static mapping between ZMK keycode text names and HID usage codes.
//!
//! HID encoding: `(page << 16) | usage_id`
//! Modifier wrappers add: `mod_bits << 24`
//!
//! Pages: KEY=0x07, CONSUMER=0x0C, GENERIC_DESKTOP=0x01

use std::collections::HashMap;
use std::sync::LazyLock;

// ── HID usage pages ─────────────────────────────────────────────────

const HID_USAGE_KEY: u32 = 0x07;
const HID_USAGE_CONSUMER: u32 = 0x0C;

#[inline]
const fn hid(page: u32, id: u32) -> u32 {
    (page << 16) | id
}

#[inline]
const fn key(id: u32) -> u32 {
    hid(HID_USAGE_KEY, id)
}

#[inline]
const fn consumer(id: u32) -> u32 {
    hid(HID_USAGE_CONSUMER, id)
}

// ── Modifier bits ───────────────────────────────────────────────────

const MOD_LCTL: u32 = 0x01;
const MOD_LSFT: u32 = 0x02;
const MOD_LALT: u32 = 0x04;
const MOD_LGUI: u32 = 0x08;
const MOD_RCTL: u32 = 0x10;
const MOD_RSFT: u32 = 0x20;
const MOD_RALT: u32 = 0x40;
const MOD_RGUI: u32 = 0x80;

#[inline]
const fn apply_mods(mods: u32, keycode: u32) -> u32 {
    (mods << 24) | keycode
}

#[inline]
const fn ls(keycode: u32) -> u32 {
    apply_mods(MOD_LSFT, keycode)
}

// ── Static keycode table ────────────────────────────────────────────

/// (name, hid_usage_code) pairs for all supported keycodes.
const KEYCODE_TABLE: &[(&str, u32)] = &[
    // Letters (HID page 0x07, usage 0x04..0x1D)
    ("A", key(0x04)),
    ("B", key(0x05)),
    ("C", key(0x06)),
    ("D", key(0x07)),
    ("E", key(0x08)),
    ("F", key(0x09)),
    ("G", key(0x0A)),
    ("H", key(0x0B)),
    ("I", key(0x0C)),
    ("J", key(0x0D)),
    ("K", key(0x0E)),
    ("L", key(0x0F)),
    ("M", key(0x10)),
    ("N", key(0x11)),
    ("O", key(0x12)),
    ("P", key(0x13)),
    ("Q", key(0x14)),
    ("R", key(0x15)),
    ("S", key(0x16)),
    ("T", key(0x17)),
    ("U", key(0x18)),
    ("V", key(0x19)),
    ("W", key(0x1A)),
    ("X", key(0x1B)),
    ("Y", key(0x1C)),
    ("Z", key(0x1D)),
    // Numbers
    ("N1", key(0x1E)),
    ("N2", key(0x1F)),
    ("N3", key(0x20)),
    ("N4", key(0x21)),
    ("N5", key(0x22)),
    ("N6", key(0x23)),
    ("N7", key(0x24)),
    ("N8", key(0x25)),
    ("N9", key(0x26)),
    ("N0", key(0x27)),
    // Editing / control
    ("RET", key(0x28)),
    ("RETURN", key(0x28)),
    ("ENTER", key(0x28)),
    ("ESC", key(0x29)),
    ("ESCAPE", key(0x29)),
    ("BSPC", key(0x2A)),
    ("BACKSPACE", key(0x2A)),
    ("TAB", key(0x2B)),
    ("SPACE", key(0x2C)),
    // Symbols (unshifted)
    ("MINUS", key(0x2D)),
    ("EQUAL", key(0x2E)),
    ("LBKT", key(0x2F)),
    ("RBKT", key(0x30)),
    ("BSLH", key(0x31)),
    ("BACKSLASH", key(0x31)),
    ("NON_US_HASH", key(0x32)),
    ("NUHS", key(0x32)),
    ("SEMI", key(0x33)),
    ("SEMICOLON", key(0x33)),
    ("SQT", key(0x34)),
    ("SINGLE_QUOTE", key(0x34)),
    ("APOSTROPHE", key(0x34)),
    ("APOS", key(0x34)),
    ("GRAVE", key(0x35)),
    ("COMMA", key(0x36)),
    ("DOT", key(0x37)),
    ("PERIOD", key(0x37)),
    ("FSLH", key(0x38)),
    ("SLASH", key(0x38)),
    ("CAPS", key(0x39)),
    ("CAPSLOCK", key(0x39)),
    ("CLCK", key(0x39)),
    // F-keys
    ("F1", key(0x3A)),
    ("F2", key(0x3B)),
    ("F3", key(0x3C)),
    ("F4", key(0x3D)),
    ("F5", key(0x3E)),
    ("F6", key(0x3F)),
    ("F7", key(0x40)),
    ("F8", key(0x41)),
    ("F9", key(0x42)),
    ("F10", key(0x43)),
    ("F11", key(0x44)),
    ("F12", key(0x45)),
    // Print screen, scroll lock, pause
    ("PSCRN", key(0x46)),
    ("PRINTSCREEN", key(0x46)),
    ("SLCK", key(0x47)),
    ("SCROLLLOCK", key(0x47)),
    ("PAUSE_BREAK", key(0x48)),
    // Navigation
    ("INS", key(0x49)),
    ("INSERT", key(0x49)),
    ("HOME", key(0x4A)),
    ("PG_UP", key(0x4B)),
    ("PAGE_UP", key(0x4B)),
    ("DEL", key(0x4C)),
    ("DELETE", key(0x4C)),
    ("END", key(0x4D)),
    ("PG_DN", key(0x4E)),
    ("PAGE_DOWN", key(0x4E)),
    ("RIGHT", key(0x4F)),
    ("LEFT", key(0x50)),
    ("DOWN", key(0x51)),
    ("UP", key(0x52)),
    // Keypad
    ("KP_NLCK", key(0x53)),
    ("KP_DIVIDE", key(0x54)),
    ("KP_MULTIPLY", key(0x55)),
    ("KP_MINUS", key(0x56)),
    ("KP_PLUS", key(0x57)),
    ("KP_ENTER", key(0x58)),
    ("KP_N1", key(0x59)),
    ("KP_N2", key(0x5A)),
    ("KP_N3", key(0x5B)),
    ("KP_N4", key(0x5C)),
    ("KP_N5", key(0x5D)),
    ("KP_N6", key(0x5E)),
    ("KP_N7", key(0x5F)),
    ("KP_N8", key(0x60)),
    ("KP_N9", key(0x61)),
    ("KP_N0", key(0x62)),
    ("KP_DOT", key(0x63)),
    // ISO key
    ("NON_US_BSLH", key(0x64)),
    ("NUBS", key(0x64)),
    // Application / Menu
    ("K_APP", key(0x65)),
    ("K_CMENU", key(0x65)),
    // F13..F24
    ("F13", key(0x68)),
    ("F14", key(0x69)),
    ("F15", key(0x6A)),
    ("F16", key(0x6B)),
    ("F17", key(0x6C)),
    ("F18", key(0x6D)),
    ("F19", key(0x6E)),
    ("F20", key(0x6F)),
    ("F21", key(0x70)),
    ("F22", key(0x71)),
    ("F23", key(0x72)),
    ("F24", key(0x73)),
    // International keys
    ("INT1", key(0x87)),
    ("INT2", key(0x88)),
    ("INT3", key(0x89)),
    ("INT4", key(0x8A)),
    ("INT5", key(0x8B)),
    ("INT6", key(0x8C)),
    ("INT7", key(0x8D)),
    ("INT8", key(0x8E)),
    ("INT9", key(0x8F)),
    // Language keys
    ("LANG1", key(0x90)),
    ("LANG2", key(0x91)),
    ("LANG3", key(0x92)),
    ("LANG4", key(0x93)),
    ("LANG5", key(0x94)),
    ("LANG6", key(0x95)),
    ("LANG7", key(0x96)),
    ("LANG8", key(0x97)),
    ("LANG9", key(0x98)),
    // Modifiers
    ("LCTRL", key(0xE0)),
    ("LCTL", key(0xE0)),
    ("LEFT_CONTROL", key(0xE0)),
    ("LSHFT", key(0xE1)),
    ("LSHIFT", key(0xE1)),
    ("LEFT_SHIFT", key(0xE1)),
    ("LALT", key(0xE2)),
    ("LEFT_ALT", key(0xE2)),
    ("LGUI", key(0xE3)),
    ("LEFT_GUI", key(0xE3)),
    ("LMETA", key(0xE3)),
    ("LWIN", key(0xE3)),
    ("LCMD", key(0xE3)),
    ("RCTRL", key(0xE4)),
    ("RCTL", key(0xE4)),
    ("RIGHT_CONTROL", key(0xE4)),
    ("RSHFT", key(0xE5)),
    ("RSHIFT", key(0xE5)),
    ("RIGHT_SHIFT", key(0xE5)),
    ("RALT", key(0xE6)),
    ("RIGHT_ALT", key(0xE6)),
    ("RGUI", key(0xE7)),
    ("RIGHT_GUI", key(0xE7)),
    ("RMETA", key(0xE7)),
    ("RWIN", key(0xE7)),
    ("RCMD", key(0xE7)),
    // ── Shifted symbols (left-shift applied) ────────────────────────
    ("EXCL", ls(key(0x1E))),          // LS(N1)
    ("EXCLAMATION", ls(key(0x1E))),
    ("AT", ls(key(0x1F))),            // LS(N2)
    ("AT_SIGN", ls(key(0x1F))),
    ("HASH", ls(key(0x20))),          // LS(N3)
    ("POUND", ls(key(0x20))),
    ("DLLR", ls(key(0x21))),          // LS(N4)
    ("DOLLAR", ls(key(0x21))),
    ("PRCNT", ls(key(0x22))),         // LS(N5)
    ("PERCENT", ls(key(0x22))),
    ("CARET", ls(key(0x23))),         // LS(N6)
    ("AMPS", ls(key(0x24))),          // LS(N7)
    ("AMPERSAND", ls(key(0x24))),
    ("STAR", ls(key(0x25))),          // LS(N8)
    ("ASTERISK", ls(key(0x25))),
    ("ASTRK", ls(key(0x25))),
    ("LPAR", ls(key(0x26))),          // LS(N9)
    ("LEFT_PARENTHESIS", ls(key(0x26))),
    ("RPAR", ls(key(0x27))),          // LS(N0)
    ("RIGHT_PARENTHESIS", ls(key(0x27))),
    ("UNDER", ls(key(0x2D))),         // LS(MINUS)
    ("UNDERSCORE", ls(key(0x2D))),
    ("PLUS", ls(key(0x2E))),          // LS(EQUAL)
    ("LBRC", ls(key(0x2F))),          // LS(LBKT)
    ("LEFT_BRACE", ls(key(0x2F))),
    ("RBRC", ls(key(0x30))),          // LS(RBKT)
    ("RIGHT_BRACE", ls(key(0x30))),
    ("PIPE", ls(key(0x31))),          // LS(BSLH)
    ("COLON", ls(key(0x33))),         // LS(SEMI)
    ("DQT", ls(key(0x34))),           // LS(SQT)
    ("DOUBLE_QUOTES", ls(key(0x34))),
    ("TILDE", ls(key(0x35))),         // LS(GRAVE)
    ("LT", ls(key(0x36))),            // LS(COMMA)
    ("LESS_THAN", ls(key(0x36))),
    ("GT", ls(key(0x37))),            // LS(DOT)
    ("GREATER_THAN", ls(key(0x37))),
    ("QMARK", ls(key(0x38))),         // LS(FSLH)
    ("QUESTION", ls(key(0x38))),
    // ── Consumer page (media/system) ────────────────────────────────
    ("C_POWER", consumer(0x30)),
    ("C_SLEEP", consumer(0x32)),
    ("C_MENU", consumer(0x40)),
    ("C_PLAY", consumer(0xB0)),
    ("C_PAUSE", consumer(0xB1)),
    ("C_RECORD", consumer(0xB2)),
    ("C_FAST_FORWARD", consumer(0xB3)),
    ("C_REWIND", consumer(0xB4)),
    ("C_NEXT", consumer(0xB5)),
    ("C_PREV", consumer(0xB6)),
    ("C_PREVIOUS", consumer(0xB6)),
    ("C_STOP", consumer(0xB7)),
    ("C_EJECT", consumer(0xB8)),
    ("C_RW", consumer(0xB4)),
    ("C_FF", consumer(0xB3)),
    ("C_PP", consumer(0xCD)),
    ("C_PLAY_PAUSE", consumer(0xCD)),
    ("C_MUTE", consumer(0xE2)),
    ("C_VOL_UP", consumer(0xE9)),
    ("C_VOLUME_UP", consumer(0xE9)),
    ("C_VOL_DN", consumer(0xEA)),
    ("C_VOLUME_DOWN", consumer(0xEA)),
    ("C_BRI_UP", consumer(0x6F)),
    ("C_BRIGHTNESS_INC", consumer(0x6F)),
    ("C_BRI_DN", consumer(0x70)),
    ("C_BRIGHTNESS_DEC", consumer(0x70)),
    ("C_BRI_AUTO", consumer(0x71)),
    ("C_AL_CALC", consumer(0x192)),
    ("C_AL_WWW", consumer(0x196)),
    ("C_AC_SEARCH", consumer(0x221)),
    ("C_AC_HOME", consumer(0x223)),
    ("C_AC_BACK", consumer(0x224)),
    ("C_AC_FORWARD", consumer(0x225)),
    ("C_AC_REFRESH", consumer(0x227)),
    ("C_AC_BOOKMARKS", consumer(0x22A)),
];

// ── Lookup maps ─────────────────────────────────────────────────────

static NAME_TO_HID: LazyLock<HashMap<&'static str, u32>> = LazyLock::new(|| {
    KEYCODE_TABLE.iter().copied().collect()
});

static HID_TO_NAME: LazyLock<HashMap<u32, &'static str>> = LazyLock::new(|| {
    // Reverse map — first entry wins (canonical short name)
    let mut map = HashMap::new();
    for &(name, code) in KEYCODE_TABLE {
        map.entry(code).or_insert(name);
    }
    map
});

// ── Modifier wrapper names ──────────────────────────────────────────

const MOD_WRAPPERS: &[(&str, u32)] = &[
    ("LS", MOD_LSFT),
    ("LC", MOD_LCTL),
    ("LA", MOD_LALT),
    ("LG", MOD_LGUI),
    ("RS", MOD_RSFT),
    ("RC", MOD_RCTL),
    ("RA", MOD_RALT),
    ("RG", MOD_RGUI),
];

// ── Public API ──────────────────────────────────────────────────────

/// Look up a keycode name and return its HID usage code.
/// Handles plain names like `"A"`, `"C_VOL_UP"`, etc.
pub fn keycode_to_hid(name: &str) -> Option<u32> {
    NAME_TO_HID.get(name).copied()
}

/// Reverse lookup: HID usage code → canonical keycode name.
#[allow(dead_code)]
pub fn hid_to_keycode(usage: u32) -> Option<&'static str> {
    HID_TO_NAME.get(&usage).copied()
}

/// Reverse lookup that also handles modifier-wrapped HID codes.
/// Returns the canonical name (e.g. "EXCL") for known shifted symbols,
/// or wraps with modifier prefixes (e.g. "LS(A)") for ad-hoc composites.
/// Falls back to hex string for completely unknown HID values.
pub fn hid_to_keycode_with_modifiers(hid: u32) -> String {
    // Try direct lookup first (handles named shifted symbols like EXCL, PIPE, etc.)
    if let Some(name) = hid_to_keycode(hid) {
        return name.to_string();
    }

    // Extract modifier bits from upper byte
    let mod_bits = (hid >> 24) & 0xFF;
    let base_hid = hid & 0x00FF_FFFF;

    if mod_bits == 0 {
        return format!("0x{hid:08X}");
    }

    let base_name = match hid_to_keycode(base_hid) {
        Some(name) => name.to_string(),
        None => return format!("0x{hid:08X}"),
    };

    // Wrap with modifier prefixes (inner → outer order)
    let mut result = base_name;
    const WRAP_ORDER: &[(u32, &str)] = &[
        (MOD_RSFT, "RS"),
        (MOD_RCTL, "RC"),
        (MOD_RALT, "RA"),
        (MOD_RGUI, "RG"),
        (MOD_LSFT, "LS"),
        (MOD_LCTL, "LC"),
        (MOD_LALT, "LA"),
        (MOD_LGUI, "LG"),
    ];
    for &(bit, prefix) in WRAP_ORDER {
        if mod_bits & bit != 0 {
            result = format!("{prefix}({result})");
        }
    }
    result
}

/// Parse a keycode string that may include modifier wrappers.
/// Examples: `"A"` → 0x70004, `"LS(N1)"` → 0x0207001E, `"LC(LS(A))"` → 0x030070004
pub fn parse_keycode_with_modifiers(text: &str) -> Option<u32> {
    parse_with_mods(text, 0)
}

fn parse_with_mods(text: &str, accumulated_mods: u32) -> Option<u32> {
    let text = text.trim();

    // Check for modifier wrappers: XX(inner)
    for &(prefix, mod_bit) in MOD_WRAPPERS {
        if let Some(rest) = text.strip_prefix(prefix) {
            let rest = rest.trim();
            if let Some(inner) = rest.strip_prefix('(').and_then(|s| s.strip_suffix(')')) {
                return parse_with_mods(inner.trim(), accumulated_mods | mod_bit);
            }
        }
    }

    // Base case: look up the keycode
    let hid_code = keycode_to_hid(text)?;
    if accumulated_mods == 0 {
        Some(hid_code)
    } else {
        Some(apply_mods(accumulated_mods, hid_code))
    }
}

/// Convert a modifier name (as used in ZMK bindings) to its mod bits.
/// E.g., "LSHFT" → MOD_LSFT, "RCTRL" → MOD_RCTL.
#[allow(dead_code)]
pub fn modifier_to_bits(name: &str) -> Option<u32> {
    match name {
        "LSHFT" | "LSHIFT" | "LEFT_SHIFT" => Some(MOD_LSFT),
        "RSHFT" | "RSHIFT" | "RIGHT_SHIFT" => Some(MOD_RSFT),
        "LCTRL" | "LCTL" | "LEFT_CONTROL" => Some(MOD_LCTL),
        "RCTRL" | "RCTL" | "RIGHT_CONTROL" => Some(MOD_RCTL),
        "LALT" | "LEFT_ALT" => Some(MOD_LALT),
        "RALT" | "RIGHT_ALT" => Some(MOD_RALT),
        "LGUI" | "LEFT_GUI" | "LMETA" | "LWIN" | "LCMD" => Some(MOD_LGUI),
        "RGUI" | "RIGHT_GUI" | "RMETA" | "RWIN" | "RCMD" => Some(MOD_RGUI),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_letter() {
        assert_eq!(keycode_to_hid("A"), Some(0x0007_0004));
        assert_eq!(keycode_to_hid("Z"), Some(0x0007_001D));
    }

    #[test]
    fn number_keys() {
        assert_eq!(keycode_to_hid("N1"), Some(0x0007_001E));
        assert_eq!(keycode_to_hid("N0"), Some(0x0007_0027));
    }

    #[test]
    fn shifted_symbols() {
        // EXCL = LS(N1) = (0x02 << 24) | 0x0007001E
        assert_eq!(keycode_to_hid("EXCL"), Some(0x0200_0000 | 0x0007_001E));
        assert_eq!(keycode_to_hid("AT"), Some(0x0200_0000 | 0x0007_001F));
    }

    #[test]
    fn consumer_keys() {
        assert_eq!(keycode_to_hid("C_VOL_UP"), Some(0x000C_00E9));
        assert_eq!(keycode_to_hid("C_MUTE"), Some(0x000C_00E2));
    }

    #[test]
    fn modifiers() {
        assert_eq!(keycode_to_hid("LCTRL"), Some(0x0007_00E0));
        assert_eq!(keycode_to_hid("RGUI"), Some(0x0007_00E7));
    }

    #[test]
    fn international() {
        assert_eq!(keycode_to_hid("INT1"), Some(0x0007_0087));
        assert_eq!(keycode_to_hid("LANG1"), Some(0x0007_0090));
        assert_eq!(keycode_to_hid("NON_US_HASH"), Some(0x0007_0032));
        assert_eq!(keycode_to_hid("NUBS"), Some(0x0007_0064));
    }

    #[test]
    fn reverse_lookup() {
        assert_eq!(hid_to_keycode(0x0007_0004), Some("A"));
        assert_eq!(hid_to_keycode(0x000C_00E9), Some("C_VOL_UP"));
    }

    #[test]
    fn parse_plain_keycode() {
        assert_eq!(parse_keycode_with_modifiers("A"), Some(0x0007_0004));
    }

    #[test]
    fn parse_single_modifier_wrapper() {
        // LS(A) = (0x02 << 24) | 0x00070004
        assert_eq!(
            parse_keycode_with_modifiers("LS(A)"),
            Some(0x0200_0000 | 0x0007_0004)
        );
    }

    #[test]
    fn parse_nested_modifier_wrappers() {
        // LC(LS(A)) = ((0x01 | 0x02) << 24) | 0x00070004
        assert_eq!(
            parse_keycode_with_modifiers("LC(LS(A))"),
            Some(0x0300_0000 | 0x0007_0004)
        );
    }

    #[test]
    fn modifier_to_bits_works() {
        assert_eq!(modifier_to_bits("LSHFT"), Some(0x02));
        assert_eq!(modifier_to_bits("RALT"), Some(0x40));
        assert_eq!(modifier_to_bits("UNKNOWN"), None);
    }

    #[test]
    fn unknown_returns_none() {
        assert_eq!(keycode_to_hid("NONEXISTENT"), None);
        assert_eq!(hid_to_keycode(0xDEAD_BEEF), None);
        assert_eq!(parse_keycode_with_modifiers("NOPE"), None);
    }
}
