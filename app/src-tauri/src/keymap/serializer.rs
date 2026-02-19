use super::types::{Behavior, Binding, Combo, Keymap, Layer};

/// Key position groups for reverse-mapping hold-trigger-key-positions.
const KEYS_L: &[u8] = &[0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25];
const KEYS_R: &[u8] = &[5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 26, 27, 28, 29, 30, 31];
const THUMBS: &[u8] = &[32, 33, 34, 35, 36, 37];

/// Serialize a Keymap struct back to a valid ZMK .keymap devicetree file.
pub fn serialize(keymap: &Keymap) -> String {
    let mut out = String::new();

    // Derive layer names from the keymap data
    let layer_names: Vec<&str> = keymap.layers.iter().map(|l| l.name.as_str()).collect();

    // Header comments and includes
    let mc = &keymap.mouse_config;
    out.push_str(&format!(
        "// TOTEM Gallium layout — ported from RMK firmware (keymap.rs + behavior.rs)\n\
         // Home row mods (GACS), combos, mod-morphs, macro, mouse keys, caps word\n\
         // Mouse speed tuning (must precede pointing.h)\n\
         \n\
         #define ZMK_POINTING_DEFAULT_MOVE_VAL {}\n\
         #define ZMK_POINTING_DEFAULT_SCRL_VAL {}\n\
         \n\
         #include <behaviors.dtsi>\n\
         #include <dt-bindings/zmk/bt.h>\n\
         #include <dt-bindings/zmk/keys.h>\n\
         #include <dt-bindings/zmk/outputs.h>\n\
         #include <dt-bindings/zmk/pointing.h>\n\
         \n",
        mc.move_speed, mc.scroll_speed
    ));

    // Layer defines (dynamic from keymap)
    for (i, name) in layer_names.iter().enumerate() {
        // Pad to align index after name
        let pad_len = 6usize.saturating_sub(name.len()) + 1;
        let pad = " ".repeat(pad_len);
        out.push_str(&format!("#define {}{}{}\n", name, pad, i));
    }
    out.push('\n');

    // Key position diagram and defines
    out.push_str(
        "// Key position groups for reference:\n\
         //          0  1  2  3  4     5  6  7  8  9       <- top\n\
         //         10 11 12 13 14    15 16 17 18 19       <- home\n\
         //    20   21 22 23 24 25    26 27 28 29 30   31  <- bottom + side\n\
         //                   32 33 34    35 36 37          <- thumbs\n\
         \n\
         #define KEYS_L 0 1 2 3 4 10 11 12 13 14 20 21 22 23 24 25\n\
         #define KEYS_R 5 6 7 8 9 15 16 17 18 19 26 27 28 29 30 31\n\
         #define THUMBS 32 33 34 35 36 37\n\
         \n",
    );

    // Mouse behavior tuning
    out.push_str(&format!(
        "// Mouse behavior tuning\n\
         \n\
         &mmv {{\n\
         \x20   time-to-max-speed-ms = <{}>;\n\
         \x20   acceleration-exponent = <{}>;\n\
         }};\n\
         \n\
         &msc {{\n\
         \x20   time-to-max-speed-ms = <{}>;\n\
         \x20   acceleration-exponent = <{}>;\n\
         }};\n\
         \n",
        mc.move_time_to_max_ms, mc.move_accel_exponent,
        mc.scroll_time_to_max_ms, mc.scroll_accel_exponent
    ));

    // Root devicetree node
    out.push_str("/ {\n");

    // Behaviors
    serialize_behaviors(&mut out, &keymap.behaviors);

    // Combos
    serialize_combos(&mut out, &keymap.combos, &layer_names);

    // Macros (empty block for compatibility)
    out.push_str("\n    macros {\n    };\n");

    // Keymap
    serialize_keymap(&mut out, &keymap.layers);

    out.push_str("};\n");
    out
}

fn format_binding(binding: &Binding) -> String {
    if binding.params.is_empty() {
        format!("&{}", binding.action)
    } else {
        format!("&{} {}", binding.action, binding.params.join(" "))
    }
}

fn serialize_behaviors(out: &mut String, behaviors: &[Behavior]) {
    out.push_str("    behaviors {\n");

    for behavior in behaviors {
        match behavior {
            Behavior::HoldTap {
                name,
                label,
                flavor,
                tapping_term_ms,
                quick_tap_ms,
                require_prior_idle_ms,
                hold_trigger_key_positions,
                hold_trigger_on_release,
                hold_bindings,
                tap_bindings,
            } => {
                let comment = match name.as_str() {
                    "hml" => "        // ── Home Row Mods (left hand) ──\n        // Positional: hold only triggers on right-hand keys + thumbs\n\n",
                    "hmr" => "\n        // ── Home Row Mods (right hand) ──\n        // Positional: hold only triggers on left-hand keys + thumbs\n\n",
                    "lt_th" => "\n        // ── Thumb Layer-Tap ──\n        // Fast activation: hold-preferred, 200ms (RMK HoldOnOtherPress)\n\n",
                    _ => "",
                };
                out.push_str(comment);

                out.push_str(&format!("        {}: {} {{\n", name, label));
                out.push_str("            compatible = \"zmk,behavior-hold-tap\";\n");
                out.push_str("            #binding-cells = <2>;\n");
                out.push_str(&format!("            flavor = \"{}\";\n", flavor));
                out.push_str(&format!(
                    "            tapping-term-ms = <{}>;\n",
                    tapping_term_ms
                ));
                out.push_str(&format!(
                    "            quick-tap-ms = <{}>;\n",
                    quick_tap_ms
                ));
                if let Some(idle) = require_prior_idle_ms {
                    out.push_str(&format!(
                        "            require-prior-idle-ms = <{}>;\n",
                        idle
                    ));
                }
                out.push_str(&format!(
                    "            bindings = <{}>, <{}>;\n",
                    hold_bindings, tap_bindings
                ));

                if let Some(positions) = hold_trigger_key_positions {
                    let pos_str = reverse_key_positions(positions);
                    out.push_str(&format!(
                        "\n            hold-trigger-key-positions = <{}>;\n",
                        pos_str
                    ));
                }
                if *hold_trigger_on_release {
                    out.push_str("            hold-trigger-on-release;\n");
                }

                out.push_str("        };\n");
            }
            Behavior::ModMorph {
                name,
                label,
                normal,
                shifted,
                mods,
            } => {
                let comment = match name.as_str() {
                    "comma_morph" => "\n        // ── Mod-Morph: Comma / Semicolon ──\n        // Normal: ,  |  Shifted: ; (shift suppressed)\n\n",
                    "dot_morph" => "\n        // ── Mod-Morph: Dot / Colon ──\n        // Normal: .  |  Shifted: : (shift suppressed, COLON = LS(SEMI))\n\n",
                    _ => "\n",
                };
                out.push_str(comment);

                out.push_str(&format!("        {}: {} {{\n", name, label));
                out.push_str("            compatible = \"zmk,behavior-mod-morph\";\n");
                out.push_str("            #binding-cells = <0>;\n");
                out.push_str(&format!(
                    "            bindings = <{}>, <{}>;\n",
                    format_binding(normal),
                    format_binding(shifted)
                ));
                out.push_str(&format!(
                    "\n            mods = <{}>;\n",
                    mods
                ));
                out.push_str("        };\n");
            }
            Behavior::Macro {
                name,
                label,
                wait_ms,
                tap_ms,
                bindings,
            } => {
                let comment = match name.as_str() {
                    "fat_arrow" => "\n        // ── Macro: Fat Arrow => ──\n\n",
                    _ => "\n",
                };
                out.push_str(comment);

                out.push_str(&format!("        {}: {} {{\n", name, label));
                out.push_str("            compatible = \"zmk,behavior-macro\";\n");
                out.push_str("            #binding-cells = <0>;\n");
                out.push_str(&format!("            wait-ms = <{}>;\n", wait_ms));
                out.push_str(&format!("            tap-ms = <{}>;\n", tap_ms));
                let bindings_str: Vec<String> =
                    bindings.iter().map(|b| format_binding(b)).collect();
                out.push_str(&format!(
                    "            bindings = <{}>;\n",
                    bindings_str.join(" ")
                ));
                out.push_str("        };\n");
            }
        }
    }

    out.push_str("    };\n");
}

/// Reverse-map a list of key positions back to macro names where possible.
fn reverse_key_positions(positions: &[u8]) -> String {
    let mut remaining: Vec<u8> = positions.to_vec();
    let mut parts = Vec::new();

    // Check KEYS_R
    if contains_all(&remaining, KEYS_R) {
        remove_all(&mut remaining, KEYS_R);
        parts.push("KEYS_R".to_string());
    }

    // Check KEYS_L
    if contains_all(&remaining, KEYS_L) {
        remove_all(&mut remaining, KEYS_L);
        parts.push("KEYS_L".to_string());
    }

    // Check THUMBS
    if contains_all(&remaining, THUMBS) {
        remove_all(&mut remaining, THUMBS);
        parts.push("THUMBS".to_string());
    }

    // Any remaining positions as raw numbers
    for pos in &remaining {
        parts.push(pos.to_string());
    }

    parts.join(" ")
}

fn contains_all(haystack: &[u8], needles: &[u8]) -> bool {
    needles.iter().all(|n| haystack.contains(n))
}

fn remove_all(haystack: &mut Vec<u8>, needles: &[u8]) {
    haystack.retain(|h| !needles.contains(h));
}

fn serialize_combos(out: &mut String, combos: &[Combo], layer_names: &[&str]) {
    out.push_str(&format!(
        "\n    // ══════════════════════════════════════════════════════════════\n\
         \x20   // Combos — {} total\n\
         \x20   // ══════════════════════════════════════════════════════════════\n\
         \n\
         \x20   combos {{\n\
         \x20       compatible = \"zmk,combos\";\n",
        combos.len()
    ));

    for combo in combos {
        out.push_str(&format!("\n        {} {{\n", combo.name));
        out.push_str(&format!(
            "            timeout-ms = <{}>;\n",
            combo.timeout_ms
        ));
        let pos_str: Vec<String> = combo.positions.iter().map(|p| p.to_string()).collect();
        out.push_str(&format!(
            "            key-positions = <{}>;\n",
            pos_str.join(" ")
        ));
        out.push_str(&format!(
            "            bindings = <{}>;\n",
            format_binding(&combo.binding)
        ));
        if !combo.layers.is_empty() {
            let layer_str: Vec<String> = combo
                .layers
                .iter()
                .map(|l| {
                    layer_names
                        .get(*l)
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| l.to_string())
                })
                .collect();
            out.push_str(&format!(
                "            layers = <{}>;\n",
                layer_str.join(" ")
            ));
        }
        out.push_str("        };\n");
    }

    out.push_str("    };\n");
}

fn serialize_keymap(out: &mut String, layers: &[Layer]) {
    out.push_str(&format!(
        "\n    // ══════════════════════════════════════════════════════════════\n\
         \x20   // Keymap — {} layers\n\
         \x20   // ══════════════════════════════════════════════════════════════\n\
         \n\
         \x20   keymap {{\n\
         \x20       compatible = \"zmk,keymap\";\n",
        layers.len()
    ));

    for layer in layers {
        // Layer label (lowercase + _layer suffix)
        let layer_label = format!("{}_layer", layer.name.to_lowercase());

        out.push_str(&format!(
            "\n        {} {{\n",
            layer_label
        ));
        out.push_str(&format!(
            "            display-name = \"{}\";\n",
            layer.name
        ));
        out.push_str("            bindings = <\n");

        // Format bindings in keyboard layout rows: 10 + 10 + 12 + 6
        let bindings = &layer.bindings;
        if bindings.len() == 38 {
            // Row 0: positions 0-9 (10 keys)
            let row0: Vec<String> = bindings[0..10].iter().map(|b| format_binding(b)).collect();
            out.push_str(&format!("           {}  {}\n",
                row0[..5].join("  "),
                row0[5..].join("  ")
            ));

            // Row 1: positions 10-19 (10 keys)
            let row1: Vec<String> = bindings[10..20].iter().map(|b| format_binding(b)).collect();
            out.push_str(&format!("           {}  {}\n",
                row1[..5].join("  "),
                row1[5..].join("  ")
            ));

            // Row 2: positions 20-31 (12 keys, includes side buttons)
            out.push_str(&format!("{}  {}  {}  {}\n",
                format_binding(&bindings[20]),
                bindings[21..26].iter().map(|b| format_binding(b)).collect::<Vec<_>>().join("  "),
                bindings[26..31].iter().map(|b| format_binding(b)).collect::<Vec<_>>().join("  "),
                format_binding(&bindings[31])
            ));

            // Row 3: positions 32-37 (6 thumb keys)
            let row3: Vec<String> = bindings[32..38].iter().map(|b| format_binding(b)).collect();
            out.push_str(&format!("                                    {}  {}\n",
                row3[..3].join("  "),
                row3[3..].join("  ")
            ));
        } else {
            // Fallback: just dump all bindings
            for binding in bindings {
                out.push_str(&format!("            {}\n", format_binding(binding)));
            }
        }

        out.push_str("            >;\n");
        out.push_str("        };\n");
    }

    out.push_str("    };\n");
}
