#!/usr/bin/env python3
"""Generate SVG layer visualizations from the ZMK keymap.

Usage: python tools/gen_svg_layers.py

Reads config/totem.keymap, parses layer bindings, and generates one SVG
per layer into assets/svg/layers/.
"""

import re
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
KEYMAP = ROOT / "config" / "totem.keymap"
BLANK_SVG = ROOT / "assets" / "svg" / "layers" / "blank.svg"
SVG_DIR = ROOT / "assets" / "svg" / "layers"

# ── Key position transforms (from blank.svg) ──────────────────────────

KEY_POSITIONS = [
    # (x, y, rotation) — top row (0-9)
    (78, 113, -10), (144, 62, -4), (212, 28, 0), (271, 56, 0), (330, 65, 0),
    (520, 65, 0), (580, 56, 0), (639, 28, 0), (706, 62, 4), (773, 113, 10),
    # Home row (10-19)
    (87, 168, -10), (148, 118, -4), (212, 84, 0), (271, 112, 0), (330, 121, 0),
    (520, 121, 0), (580, 112, 0), (639, 84, 0), (703, 118, 4), (764, 168, 10),
    # Bottom row + side buttons (20-31)
    (34, 209, -10), (97, 223, -10), (152, 174, -4), (212, 140, 0), (271, 168, 0),
    (330, 177, 0), (520, 177, 0), (580, 168, 0), (639, 140, 0), (699, 174, 4),
    (754, 223, 10), (817, 209, 10),
    # Thumbs (32-37)
    (255, 236, 0), (320, 245, 15), (381, 270, 30),
    (470, 270, -30), (531, 245, -15), (596, 236, 0),
]

# Which thumb position activates each layer (for "held" highlighting)
HELD_THUMBS = {
    1: 33,   # NAV  → hold Space thumb
    2: 36,   # NUM  → hold Backspace thumb
    3: 37,   # FUN  → hold Delete thumb
    4: 32,   # UTIL → hold Escape thumb
    # GAME (5) is toggled, no held thumb
}

LAYER_NAMES = ["base", "nav", "num", "fun", "util", "game"]
LAYER_DISPLAY = ["Base (Gallium)", "Nav", "Num", "Fun", "Util + Mouse", "Game"]

# ── Key code → display label mapping ──────────────────────────────────

KEY_LABELS = {
    # Letters (identity)
    **{c: c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    # Numbers
    "N0": "0", "N1": "1", "N2": "2", "N3": "3", "N4": "4",
    "N5": "5", "N6": "6", "N7": "7", "N8": "8", "N9": "9",
    # Navigation
    "LEFT": "\u2190", "RIGHT": "\u2192", "UP": "\u2191", "DOWN": "\u2193",
    "LEFT_ARROW": "\u2190", "RIGHT_ARROW": "\u2192", "UP_ARROW": "\u2191", "DOWN_ARROW": "\u2193",
    "HOME": "Home", "END": "End", "PG_UP": "PgUp", "PG_DN": "PgDn",
    "INS": "Ins",
    # Modifiers
    "LSHFT": "LShf", "RSHFT": "RShf", "LEFT_SHIFT": "LShf",
    "LCTRL": "LCtl", "RCTRL": "RCtl",
    "LALT": "LAlt", "RALT": "RAlt",
    "LGUI": "LGui", "RGUI": "RGui",
    # Special keys
    "SPACE": "Spc", "BSPC": "Bksp", "DEL": "Del", "TAB": "Tab",
    "RET": "Ent", "ESC": "Esc", "ESCAPE": "Esc",
    "PSCRN": "PrtSc", "SLCK": "ScrLk", "PAUSE_BREAK": "Pause",
    # Symbols
    "COMMA": ",", "DOT": ".", "SEMI": ";", "SQT": "'", "DQT": "\"",
    "EXCL": "!", "AT": "@", "HASH": "#", "DLLR": "$", "PRCNT": "%",
    "CARET": "^", "AMPS": "&", "STAR": "*", "LPAR": "(", "RPAR": ")",
    "MINUS": "-", "UNDER": "_", "EQUAL": "=", "PLUS": "+",
    "LBKT": "[", "RBKT": "]", "LBRC": "{", "RBRC": "}",
    "BSLH": "\\", "FSLH": "/", "PIPE": "|", "TILDE": "~", "GRAVE": "`",
    "LT": "<", "GT": ">", "QMARK": "?", "COLON": ":",
    # F-keys
    **{f"F{i}": f"F{i}" for i in range(1, 13)},
    # Consumer / media
    "C_VOL_UP": "Vol+", "C_VOL_DN": "Vol\u2212", "C_MUTE": "Mute",
    "C_BRI_UP": "Bri+", "C_BRI_DN": "Bri\u2212",
    "C_PP": "Play", "C_PREV": "Prev", "C_NEXT": "Next",
    "C_PLAY_PAUSE": "Play",
    # Edit
    "K_UNDO": "Undo", "K_CUT": "Cut", "K_COPY": "Copy",
    "K_PASTE": "Paste", "K_REDO": "Redo",
    "K_BACK": "Back", "K_FORWARD": "Fwd", "K_APP": "App",
    "K_MUTE": "Mute",
    # Keypad
    "KP_PLUS": "+", "KP_MULTIPLY": "*",
}

MOD_LABELS = {
    "LGUI": "Gui", "RGUI": "Gui",
    "LALT": "Alt", "RALT": "Alt",
    "LCTRL": "Ctrl", "RCTRL": "Ctrl",
    "LSHFT": "Shf", "RSHFT": "Shf",
}

LAYER_LABELS = {
    "BASE": "Base", "NAV": "Nav", "NUM": "Num",
    "FUN": "Fun", "UTIL": "Util", "GAME": "Game",
    "0": "Base", "1": "Nav", "2": "Num",
    "3": "Fun", "4": "Util", "5": "Game",
}


def key_label(code):
    """Map a ZMK key code to a display label."""
    if code in KEY_LABELS:
        return KEY_LABELS[code]
    # Handle modifier combos like LC(X) → Ctrl+X
    m = re.match(r"^L([CSAG])\((.+)\)$", code)
    if m:
        mod_map = {"C": "Ctrl", "S": "Shf", "A": "Alt", "G": "Gui"}
        inner = key_label(m.group(2))
        return f"{mod_map[m.group(1)]}+{inner}"
    return code


def mod_label(mod):
    """Map a ZMK modifier to a hold display label."""
    if mod in MOD_LABELS:
        return MOD_LABELS[mod]
    # Hyper: LS(LC(LA(LGUI))) or RS(RC(RA(RGUI)))
    if "LC(LA(LGUI))" in mod or "RC(RA(RGUI))" in mod:
        return "Hyper"
    return mod


def layer_label(layer):
    """Map a layer name/number to display label."""
    return LAYER_LABELS.get(layer, layer)


# ── Binding parser ────────────────────────────────────────────────────

def tokenize_bindings(bindings_str):
    """Split a ZMK bindings string into individual binding strings.

    Handles nested parentheses in arguments like LS(LC(LA(LGUI))).
    """
    bindings = []
    i = 0
    s = bindings_str.strip()
    while i < len(s):
        if s[i] == "&":
            # Find the start of this binding
            j = i + 1
            # Collect tokens until next & or end
            depth = 0
            while j < len(s):
                if s[j] == "(":
                    depth += 1
                elif s[j] == ")":
                    depth -= 1
                elif s[j] == "&" and depth == 0:
                    break
                j += 1
            bindings.append(s[i + 1 : j].strip())
            i = j
        else:
            i += 1
    return bindings


def parse_binding(binding_str):
    """Parse a binding into (tap_label, hold_label, is_trans).

    Returns a tuple of (tap, hold, is_trans) where hold may be None.
    """
    # Tokenize respecting parentheses
    tokens = []
    current = ""
    depth = 0
    for ch in binding_str:
        if ch in " \t\n" and depth == 0:
            if current:
                tokens.append(current)
                current = ""
        else:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            current += ch
    if current:
        tokens.append(current)

    if not tokens:
        return ("", None, False)

    behavior = tokens[0]
    args = tokens[1:]

    if behavior == "trans":
        return ("\u25bd", None, True)

    if behavior == "kp":
        return (key_label(args[0]) if args else "?", None, False)

    if behavior in ("hml", "hmr"):
        tap = key_label(args[1]) if len(args) > 1 else "?"
        hold = mod_label(args[0]) if args else "?"
        return (tap, hold, False)

    if behavior == "lt_th":
        tap = key_label(args[1]) if len(args) > 1 else "?"
        hold = layer_label(args[0]) if args else "?"
        return (tap, hold, False)

    if behavior == "mt":
        tap = key_label(args[1]) if len(args) > 1 else "?"
        hold = mod_label(args[0]) if args else "?"
        return (tap, hold, False)

    if behavior == "comma_morph":
        return (", ;", None, False)

    if behavior == "dot_morph":
        return (". :", None, False)

    if behavior == "caps_word":
        return ("CapsWd", None, False)

    if behavior == "fat_arrow":
        return ("=>", None, False)

    if behavior == "bt":
        if args and args[0] == "BT_SEL":
            n = int(args[1]) + 1 if len(args) > 1 else "?"
            return (f"BT{n}", None, False)
        if args and args[0] == "BT_CLR":
            return ("BTClr", None, False)
        return ("BT", None, False)

    if behavior == "out":
        if args and args[0] == "OUT_TOG":
            return ("USB/BT", None, False)
        return ("Out", None, False)

    if behavior == "mmv":
        mmv_map = {
            "MOVE_LEFT": "\u2190", "MOVE_RIGHT": "\u2192",
            "MOVE_UP": "\u2191", "MOVE_DOWN": "\u2193",
        }
        label = mmv_map.get(args[0], args[0]) if args else "Mouse"
        return (f"Ms{label}", None, False)

    if behavior == "msc":
        msc_map = {
            "SCRL_UP": "\u2191", "SCRL_DOWN": "\u2193",
            "SCRL_LEFT": "\u2190", "SCRL_RIGHT": "\u2192",
        }
        label = msc_map.get(args[0], args[0]) if args else "Scrl"
        return (f"Sc{label}", None, False)

    if behavior == "mkp":
        mkp_map = {
            "LCLK": "LClk", "RCLK": "RClk", "MCLK": "MClk",
            "MB4": "MB4", "MB5": "MB5",
        }
        return (mkp_map.get(args[0], args[0]) if args else "Click", None, False)

    if behavior == "tog":
        return (layer_label(args[0]) if args else "Tog", None, False)

    if behavior == "studio_unlock":
        return ("Studio", None, False)

    # Fallback
    return (behavior, None, False)


# ── Keymap parser ─────────────────────────────────────────────────────

def parse_keymap(keymap_path):
    """Parse the ZMK keymap file and return a list of layers.

    Each layer is a list of 38 binding strings.
    """
    text = keymap_path.read_text()

    # Find all layer blocks inside keymap { ... }
    # Match: name { display-name = "..."; bindings = < ... >; };
    layer_pattern = re.compile(
        r"(\w+_layer)\s*\{[^}]*?bindings\s*=\s*<(.*?)>",
        re.DOTALL,
    )

    layers = []
    for match in layer_pattern.finditer(text):
        bindings_str = match.group(2)
        bindings = tokenize_bindings(bindings_str)
        layers.append(bindings)

    return layers


# ── SVG generation ────────────────────────────────────────────────────

def get_svg_header_footer():
    """Extract the SVG header (defs+style) and footer from blank.svg."""
    text = BLANK_SVG.read_text()
    # Find the inner container start
    marker = '<g transform="translate(0, 56)">'
    idx = text.index(marker)
    header = text[: idx + len(marker)] + "\n"
    footer = "    </g>\n  </g>\n</svg>"
    return header, footer


def render_key(pos_idx, tap, hold=None, is_trans=False, is_held=False):
    """Render a single key as an SVG <g> element."""
    x, y, rot = KEY_POSITIONS[pos_idx]

    # Build transform
    transform = f"translate({x}, {y})"
    if rot:
        transform += f" rotate({float(rot)})"

    # CSS classes
    rect_class = "key"
    if is_held:
        rect_class = "key held"

    # Escape text for SVG
    tap_esc = escape(tap)

    # Tap text class
    tap_class = "key tap"
    if is_trans:
        tap_class = "key tap trans"

    lines = []
    lines.append(f'      <g transform="{transform}" class="key keypos-{pos_idx}">')
    lines.append(f'        <rect rx="6" ry="6" x="-28" y="-26" width="55" height="52" class="{rect_class}" />')

    if hold:
        # Smaller tap text to make room for hold label
        lines.append(f'        <text x="0" y="-6" class="{tap_class}">{tap_esc}</text>')
        lines.append(f'        <text x="0" y="0" class="key hold small">{escape(hold)}</text>')
    else:
        lines.append(f'        <text x="0" y="0" class="{tap_class}">{tap_esc}</text>')

    lines.append("      </g>")
    return "\n".join(lines)


def generate_layer_svg(header, footer, layer_idx, bindings):
    """Generate a complete SVG for one layer."""
    layer_display = LAYER_DISPLAY[layer_idx]
    held_pos = HELD_THUMBS.get(layer_idx)

    # Layer label
    label = f'      <text x="5" y="-20" class="label" font-size="16">{escape(layer_display)}</text>'

    keys = []
    for pos_idx, binding_str in enumerate(bindings):
        tap, hold, is_trans = parse_binding(binding_str)

        is_held = pos_idx == held_pos
        if is_held:
            # Show layer name on the held key
            tap = layer_label(str(layer_idx))
            hold = None
            is_trans = False

        keys.append(render_key(pos_idx, tap, hold, is_trans, is_held))

    return header + label + "\n" + "\n".join(keys) + "\n" + footer


# ── Main ──────────────────────────────────────────────────────────────

def main():
    layers = parse_keymap(KEYMAP)
    header, footer = get_svg_header_footer()

    if len(layers) != 6:
        print(f"Warning: expected 6 layers, found {len(layers)}")

    SVG_DIR.mkdir(parents=True, exist_ok=True)

    for i, bindings in enumerate(layers):
        name = LAYER_NAMES[i] if i < len(LAYER_NAMES) else f"layer{i}"
        svg = generate_layer_svg(header, footer, i, bindings)
        out_path = SVG_DIR / f"{name}.svg"
        out_path.write_text(svg)
        print(f"  \u2192 {out_path.relative_to(ROOT)}")

    print(f"\nGenerated {len(layers)} layer SVGs.")


if __name__ == "__main__":
    main()
