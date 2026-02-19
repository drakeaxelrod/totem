use std::collections::HashMap;

use regex::Regex;

use super::types::{Behavior, Binding, Combo, Keymap, Layer, MouseConfig};

/// Parse a ZMK .keymap file into a Keymap struct.
pub fn parse(content: &str) -> Result<Keymap, String> {
    let layer_defines = parse_layer_defines(content);
    let key_group_defines = parse_key_group_defines(content);
    let behaviors = parse_behaviors(content, &key_group_defines)?;
    let combos = parse_combos(content, &layer_defines)?;
    let layers = parse_layers(content, &layer_defines)?;
    let mouse_config = parse_mouse_config(content);

    Ok(Keymap {
        layers,
        combos,
        behaviors,
        mouse_config,
    })
}

/// Parse `#define BASE 0` style layer definitions.
fn parse_layer_defines(content: &str) -> HashMap<String, usize> {
    let mut map = HashMap::new();
    let re = Regex::new(r"#define\s+(\w+)\s+(\d+)").unwrap();
    for cap in re.captures_iter(content) {
        let name = cap[1].to_string();
        let val: usize = cap[2].parse().unwrap();
        map.insert(name, val);
    }
    map
}

/// Parse `#define KEYS_L 0 1 2 ...` style key group definitions.
fn parse_key_group_defines(content: &str) -> HashMap<String, Vec<u8>> {
    let mut map = HashMap::new();
    let re = Regex::new(r"#define\s+(KEYS_L|KEYS_R|THUMBS)\s+(.+)").unwrap();
    for cap in re.captures_iter(content) {
        let name = cap[1].to_string();
        let vals: Vec<u8> = cap[2]
            .split_whitespace()
            .filter_map(|s| s.parse().ok())
            .collect();
        map.insert(name, vals);
    }
    map
}

/// Parse a single binding string like `&kp B` or `&hml LGUI N` or `&trans`.
fn parse_binding(s: &str) -> Result<Binding, String> {
    let s = s.trim();
    if !s.starts_with('&') {
        return Err(format!("Binding doesn't start with &: '{s}'"));
    }
    let s = &s[1..]; // strip &

    // Tokenize: split on whitespace but respect nested parentheses.
    let tokens = tokenize_binding(s);
    if tokens.is_empty() {
        return Err("Empty binding".to_string());
    }

    let action = tokens[0].clone();
    let params: Vec<String> = tokens[1..].to_vec();

    Ok(Binding { action, params })
}

/// Tokenize a binding string respecting nested parentheses.
/// E.g. `hml LS(LC(LA(LGUI))) W` -> ["hml", "LS(LC(LA(LGUI)))", "W"]
fn tokenize_binding(s: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut paren_depth = 0;

    for ch in s.chars() {
        match ch {
            '(' => {
                paren_depth += 1;
                current.push(ch);
            }
            ')' => {
                paren_depth -= 1;
                current.push(ch);
            }
            ' ' | '\t' if paren_depth == 0 => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            _ => {
                current.push(ch);
            }
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

/// Parse all bindings from a `bindings = < ... >;` value.
/// This handles the layer binding format with 38 bindings in angle brackets.
fn parse_bindings_list(bindings_str: &str) -> Result<Vec<Binding>, String> {
    // The bindings_str should be the content between < and > (already extracted)
    let mut bindings = Vec::new();
    let mut current = String::new();
    let mut paren_depth = 0;

    for ch in bindings_str.chars() {
        match ch {
            '&' if paren_depth == 0 => {
                // Start of a new binding - push previous if non-empty
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() {
                    bindings.push(parse_binding(&format!("&{trimmed}"))?);
                }
                current.clear();
            }
            '(' => {
                paren_depth += 1;
                current.push(ch);
            }
            ')' => {
                paren_depth -= 1;
                current.push(ch);
            }
            '\n' | '\r' => {
                current.push(' ');
            }
            _ => {
                current.push(ch);
            }
        }
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        bindings.push(parse_binding(&format!("&{trimmed}"))?);
    }

    Ok(bindings)
}

/// Extract the content of a top-level devicetree block like `behaviors { ... }`.
/// Handles nested braces correctly.
fn extract_block(content: &str, block_name: &str) -> Option<String> {
    // Find the block start: look for `block_name {`
    // For behaviors/combos/keymap inside `/ { ... }`
    let pattern = format!(r"\b{}\s*\{{", regex::escape(block_name));
    let re = Regex::new(&pattern).unwrap();
    let m = re.find(content)?;

    let start_brace = content[m.start()..].find('{')? + m.start();
    let mut depth = 0;
    let mut end_brace = start_brace;

    for (i, ch) in content[start_brace..].char_indices() {
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    end_brace = start_brace + i;
                    break;
                }
            }
            _ => {}
        }
    }

    Some(content[start_brace + 1..end_brace].to_string())
}

/// Extract all individual node blocks within a parent block.
/// Returns (short_name, label, body) tuples.
/// E.g. `hml: home_row_mod_left { ... }` -> ("hml", "home_row_mod_left", "...")
fn extract_nodes(block_content: &str) -> Vec<(String, String, String)> {
    let mut nodes = Vec::new();
    // Match patterns like: `name: label {` or `name {`
    let re = Regex::new(r"(\w+)\s*:\s*(\w+)\s*\{|(\w+)\s*\{").unwrap();

    let mut search_from = 0;
    while search_from < block_content.len() {
        let remaining = &block_content[search_from..];
        let cap = match re.find(remaining) {
            Some(m) => m,
            None => break,
        };

        let cap_match = re.captures(&remaining[cap.start()..]).unwrap();

        let (short_name, label) = if let Some(sn) = cap_match.get(1) {
            (
                sn.as_str().to_string(),
                cap_match[2].to_string(),
            )
        } else {
            let name = cap_match[3].to_string();
            // Skip non-node keywords
            if name == "compatible" || name == "bindings" || name == "layers" {
                search_from += cap.start() + cap.len();
                continue;
            }
            (name.clone(), name)
        };

        // Find the opening brace
        let abs_start = search_from + cap.start();
        let brace_pos = match block_content[abs_start..].find('{') {
            Some(p) => abs_start + p,
            None => break,
        };

        // Find matching closing brace
        let mut depth = 0;
        let mut end_brace = brace_pos;
        for (i, ch) in block_content[brace_pos..].char_indices() {
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        end_brace = brace_pos + i;
                        break;
                    }
                }
                _ => {}
            }
        }

        let body = block_content[brace_pos + 1..end_brace].to_string();
        nodes.push((short_name, label, body));
        search_from = end_brace + 1;
    }

    nodes
}

/// Extract a property value from a node body.
/// E.g. `tapping-term-ms = <280>;` -> "280"
/// E.g. `flavor = "balanced";` -> "balanced"
fn extract_property(body: &str, prop_name: &str) -> Option<String> {
    let escaped = regex::escape(prop_name);
    // Try angle bracket value first: prop = <value>;
    let re_angle = Regex::new(&format!(r"{}\s*=\s*<([^>]*)>", escaped)).unwrap();
    if let Some(cap) = re_angle.captures(body) {
        return Some(cap[1].trim().to_string());
    }
    // Try quoted value: prop = "value";
    let re_quoted = Regex::new(&format!(r#"{}\s*=\s*"([^"]*)""#, escaped)).unwrap();
    if let Some(cap) = re_quoted.captures(body) {
        return Some(cap[1].to_string());
    }
    None
}

/// Check if a boolean property exists (e.g. `hold-trigger-on-release;`)
fn has_boolean_property(body: &str, prop_name: &str) -> bool {
    // Boolean properties appear as just `prop-name;` (no `=`)
    let escaped = regex::escape(prop_name);
    let re = Regex::new(&format!(r"(?m)^\s*{}\s*;", escaped)).unwrap();
    re.is_match(body)
}

/// Parse all behavior nodes from the behaviors block.
fn parse_behaviors(
    content: &str,
    key_groups: &HashMap<String, Vec<u8>>,
) -> Result<Vec<Behavior>, String> {
    let block = match extract_block(content, "behaviors") {
        Some(b) => b,
        None => return Ok(Vec::new()),
    };

    let nodes = extract_nodes(&block);
    let mut behaviors = Vec::new();

    for (short_name, label, body) in nodes {
        let compatible = extract_property(&body, "compatible");
        match compatible.as_deref() {
            Some("zmk,behavior-hold-tap") => {
                let flavor = extract_property(&body, "flavor").unwrap_or_default();
                let tapping_term_ms: u32 = extract_property(&body, "tapping-term-ms")
                    .unwrap_or_default()
                    .parse()
                    .unwrap_or(0);
                let quick_tap_ms: u32 = extract_property(&body, "quick-tap-ms")
                    .unwrap_or_default()
                    .parse()
                    .unwrap_or(0);
                let require_prior_idle_ms: Option<u32> =
                    extract_property(&body, "require-prior-idle-ms")
                        .and_then(|v| v.parse().ok());

                // Parse hold-trigger-key-positions, expanding macros
                let hold_trigger_key_positions =
                    extract_property(&body, "hold-trigger-key-positions").map(|v| {
                        expand_key_positions(&v, key_groups)
                    });

                let hold_trigger_on_release =
                    has_boolean_property(&body, "hold-trigger-on-release");

                // Parse bindings = <&kp>, <&kp>;
                let bindings_raw = extract_behavior_bindings(&body);
                let (hold_bindings, tap_bindings) = if bindings_raw.len() == 2 {
                    (bindings_raw[0].clone(), bindings_raw[1].clone())
                } else {
                    ("".to_string(), "".to_string())
                };

                behaviors.push(Behavior::HoldTap {
                    name: short_name,
                    label,
                    flavor,
                    tapping_term_ms,
                    quick_tap_ms,
                    require_prior_idle_ms,
                    hold_trigger_key_positions,
                    hold_trigger_on_release,
                    hold_bindings,
                    tap_bindings,
                });
            }
            Some("zmk,behavior-mod-morph") => {
                let mods = extract_property(&body, "mods").unwrap_or_default();

                // Parse bindings = <&kp COMMA>, <&kp SEMI>;
                let bindings_raw = extract_mod_morph_bindings(&body)?;
                let (normal, shifted) = if bindings_raw.len() == 2 {
                    (bindings_raw[0].clone(), bindings_raw[1].clone())
                } else {
                    return Err(format!(
                        "Mod-morph {} has {} bindings, expected 2",
                        short_name,
                        bindings_raw.len()
                    ));
                };

                behaviors.push(Behavior::ModMorph {
                    name: short_name,
                    label,
                    normal,
                    shifted,
                    mods,
                });
            }
            Some("zmk,behavior-macro") => {
                let wait_ms: u32 = extract_property(&body, "wait-ms")
                    .unwrap_or_default()
                    .parse()
                    .unwrap_or(0);
                let tap_ms: u32 = extract_property(&body, "tap-ms")
                    .unwrap_or_default()
                    .parse()
                    .unwrap_or(0);

                // Parse bindings = <&kp EQUAL &kp GT>;
                let bindings_str = extract_property(&body, "bindings").unwrap_or_default();
                let bindings = parse_bindings_list(&bindings_str)?;

                behaviors.push(Behavior::Macro {
                    name: short_name,
                    label,
                    wait_ms,
                    tap_ms,
                    bindings,
                });
            }
            Some("zmk,behavior-tap-dance") => {
                let tapping_term_ms: u32 = extract_property(&body, "tapping-term-ms")
                    .unwrap_or_default()
                    .parse()
                    .unwrap_or(200);
                let bindings_str = extract_property(&body, "bindings").unwrap_or_default();
                let bindings = parse_bindings_list(&bindings_str)?;

                behaviors.push(Behavior::TapDance {
                    name: short_name,
                    label,
                    tapping_term_ms,
                    bindings,
                });
            }
            _ => {
                // Skip unknown behavior types
            }
        }
    }

    Ok(behaviors)
}

/// Extract behavior bindings in the format `<&kp>, <&kp>` (hold-tap style).
fn extract_behavior_bindings(body: &str) -> Vec<String> {
    let re = Regex::new(r"bindings\s*=\s*(.+?);").unwrap();
    if let Some(cap) = re.captures(body) {
        let raw = &cap[1];
        // Split by >, < to get individual binding references
        let parts: Vec<String> = raw
            .split(">,")
            .map(|s| {
                let s = s.trim().trim_start_matches('<').trim_end_matches('>').trim();
                s.to_string()
            })
            .collect();
        return parts;
    }
    Vec::new()
}

/// Extract mod-morph bindings in the format `<&kp COMMA>, <&kp SEMI>`.
fn extract_mod_morph_bindings(body: &str) -> Result<Vec<Binding>, String> {
    let re = Regex::new(r"bindings\s*=\s*(.+?);").unwrap();
    if let Some(cap) = re.captures(body) {
        let raw = &cap[1];
        // Split by >, <
        let parts: Vec<&str> = raw.split(">,").collect();
        let mut bindings = Vec::new();
        for part in parts {
            let cleaned = part.trim().trim_start_matches('<').trim_end_matches('>').trim();
            bindings.push(parse_binding(cleaned)?);
        }
        return Ok(bindings);
    }
    Ok(Vec::new())
}

/// Expand key position macros like `KEYS_R THUMBS` into a flat Vec<u8>.
fn expand_key_positions(raw: &str, key_groups: &HashMap<String, Vec<u8>>) -> Vec<u8> {
    let mut positions = Vec::new();
    for token in raw.split_whitespace() {
        if let Some(group) = key_groups.get(token) {
            positions.extend(group);
        } else if let Ok(num) = token.parse::<u8>() {
            positions.push(num);
        }
    }
    positions
}

/// Parse all combos from the combos block.
fn parse_combos(
    content: &str,
    layer_defines: &HashMap<String, usize>,
) -> Result<Vec<Combo>, String> {
    let block = match extract_block(content, "combos") {
        Some(b) => b,
        None => return Ok(Vec::new()),
    };

    let nodes = extract_nodes(&block);
    let mut combos = Vec::new();

    for (short_name, _label, body) in nodes {
        let timeout_ms: u32 = extract_property(&body, "timeout-ms")
            .unwrap_or_else(|| "80".to_string())
            .parse()
            .unwrap_or(80);

        // Parse key-positions = <0 10>;
        let positions_raw = extract_property(&body, "key-positions").unwrap_or_default();
        let positions: Vec<u8> = positions_raw
            .split_whitespace()
            .filter_map(|s| s.parse().ok())
            .collect();

        // Parse bindings = <&kp AT>;
        let bindings_raw = extract_property(&body, "bindings").unwrap_or_default();
        let bindings = parse_bindings_list(&bindings_raw)?;
        let binding = bindings
            .into_iter()
            .next()
            .ok_or_else(|| format!("Combo {} has no binding", short_name))?;

        // Parse layers = <BASE>;
        let layers = match extract_property(&body, "layers") {
            Some(raw) => raw
                .split_whitespace()
                .filter_map(|s| {
                    // Try as number first, then resolve name
                    s.parse::<usize>()
                        .ok()
                        .or_else(|| layer_defines.get(s).copied())
                })
                .collect(),
            None => Vec::new(),
        };

        let require_prior_idle_ms: Option<u32> =
            extract_property(&body, "require-prior-idle-ms")
                .and_then(|v| v.parse().ok());
        let slow_release = has_boolean_property(&body, "slow-release");

        combos.push(Combo {
            name: short_name,
            positions,
            binding,
            timeout_ms,
            layers,
            require_prior_idle_ms,
            slow_release,
        });
    }

    Ok(combos)
}

/// Parse all layers from the keymap block.
fn parse_layers(
    content: &str,
    layer_defines: &HashMap<String, usize>,
) -> Result<Vec<Layer>, String> {
    let block = match extract_block(content, "keymap") {
        Some(b) => b,
        None => return Err("No keymap block found".to_string()),
    };

    let nodes = extract_nodes(&block);
    let mut layers = Vec::new();

    // Build reverse lookup: index -> name
    let mut index_to_name: HashMap<usize, String> = HashMap::new();
    for (name, idx) in layer_defines {
        index_to_name.insert(*idx, name.clone());
    }

    for (i, (_short_name, _label, body)) in nodes.iter().enumerate() {
        // Get display name from `display-name = "BASE";`
        let display_name = extract_property(body, "display-name")
            .unwrap_or_else(|| index_to_name.get(&i).cloned().unwrap_or_else(|| format!("LAYER_{i}")));

        // Parse bindings
        let bindings_raw = extract_property(body, "bindings").unwrap_or_default();
        let bindings = parse_bindings_list(&bindings_raw)?;

        layers.push(Layer {
            name: display_name,
            index: i,
            bindings,
        });
    }

    Ok(layers)
}

/// Parse mouse behavior tuning (`&mmv` / `&msc` blocks) and `#define` speed values.
fn parse_mouse_config(content: &str) -> MouseConfig {
    let mut config = MouseConfig::default();

    // Parse #define ZMK_POINTING_DEFAULT_MOVE_VAL 1500
    let move_re = Regex::new(r"#define\s+ZMK_POINTING_DEFAULT_MOVE_VAL\s+(\d+)").unwrap();
    if let Some(cap) = move_re.captures(content) {
        config.move_speed = cap[1].parse().unwrap_or(config.move_speed);
    }

    // Parse #define ZMK_POINTING_DEFAULT_SCRL_VAL 20
    let scrl_re = Regex::new(r"#define\s+ZMK_POINTING_DEFAULT_SCRL_VAL\s+(\d+)").unwrap();
    if let Some(cap) = scrl_re.captures(content) {
        config.scroll_speed = cap[1].parse().unwrap_or(config.scroll_speed);
    }

    // Parse &mmv { time-to-max-speed-ms = <300>; acceleration-exponent = <1>; };
    let mmv_re = Regex::new(r"&mmv\s*\{([^}]*)\}").unwrap();
    if let Some(cap) = mmv_re.captures(content) {
        let body = &cap[1];
        if let Some(val) = extract_property(body, "time-to-max-speed-ms") {
            config.move_time_to_max_ms = val.parse().unwrap_or(config.move_time_to_max_ms);
        }
        if let Some(val) = extract_property(body, "acceleration-exponent") {
            config.move_accel_exponent = val.parse().unwrap_or(config.move_accel_exponent);
        }
    }

    // Parse &msc { time-to-max-speed-ms = <300>; acceleration-exponent = <0>; };
    let msc_re = Regex::new(r"&msc\s*\{([^}]*)\}").unwrap();
    if let Some(cap) = msc_re.captures(content) {
        let body = &cap[1];
        if let Some(val) = extract_property(body, "time-to-max-speed-ms") {
            config.scroll_time_to_max_ms = val.parse().unwrap_or(config.scroll_time_to_max_ms);
        }
        if let Some(val) = extract_property(body, "acceleration-exponent") {
            config.scroll_accel_exponent = val.parse().unwrap_or(config.scroll_accel_exponent);
        }
    }

    config
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_binding() {
        let tokens = tokenize_binding("hml LS(LC(LA(LGUI))) W");
        assert_eq!(tokens, vec!["hml", "LS(LC(LA(LGUI)))", "W"]);
    }

    #[test]
    fn test_parse_binding_simple() {
        let b = parse_binding("&kp B").unwrap();
        assert_eq!(b.action, "kp");
        assert_eq!(b.params, vec!["B"]);
    }

    #[test]
    fn test_parse_binding_no_params() {
        let b = parse_binding("&trans").unwrap();
        assert_eq!(b.action, "trans");
        assert!(b.params.is_empty());
    }

    #[test]
    fn test_parse_binding_nested_parens() {
        let b = parse_binding("&hml LS(LC(LA(LGUI))) W").unwrap();
        assert_eq!(b.action, "hml");
        assert_eq!(b.params, vec!["LS(LC(LA(LGUI)))", "W"]);
    }

    #[test]
    fn test_parse_binding_modifier() {
        let b = parse_binding("&kp LC(X)").unwrap();
        assert_eq!(b.action, "kp");
        assert_eq!(b.params, vec!["LC(X)"]);
    }

    #[test]
    fn test_parse_totem_keymap() {
        let content = std::fs::read_to_string("../../config/totem.keymap")
            .expect("Could not read keymap file");
        let keymap = parse(&content).expect("Parse failed");

        assert_eq!(keymap.layers.len(), 6);
        assert_eq!(keymap.layers[0].name, "BASE");
        assert_eq!(keymap.layers[0].bindings.len(), 38);
        assert_eq!(keymap.combos.len(), 34);

        // Check first binding
        assert_eq!(keymap.layers[0].bindings[0].action, "kp");
        assert_eq!(keymap.layers[0].bindings[0].params, vec!["B"]);

        // Check HRM binding
        assert_eq!(keymap.layers[0].bindings[10].action, "hml");
        assert_eq!(keymap.layers[0].bindings[10].params, vec!["LGUI", "N"]);

        // Check trans
        assert_eq!(keymap.layers[1].bindings[14].action, "trans");

        // Check behaviors: hml, hmr, lt_th, comma_morph, fat_arrow, dot_morph = 6
        assert_eq!(keymap.behaviors.len(), 6);

        // Check Hyper binding
        assert_eq!(keymap.layers[0].bindings[24].action, "hml");
        assert_eq!(
            keymap.layers[0].bindings[24].params,
            vec!["LS(LC(LA(LGUI)))", "W"]
        );

        // Check comma_morph (zero params)
        assert_eq!(keymap.layers[0].bindings[9].action, "comma_morph");
        assert!(keymap.layers[0].bindings[9].params.is_empty());

        // Check combo with no layers (studio unlock)
        let studio_combo = keymap
            .combos
            .iter()
            .find(|c| c.name == "combo_studio")
            .expect("combo_studio not found");
        assert!(studio_combo.layers.is_empty());
        assert_eq!(studio_combo.binding.action, "studio_unlock");

        // Check combo with layers
        let at_combo = keymap
            .combos
            .iter()
            .find(|c| c.name == "combo_at")
            .expect("combo_at not found");
        assert_eq!(at_combo.layers, vec![0]);

        // Check hold-tap behavior
        let hml = keymap
            .behaviors
            .iter()
            .find(|b| matches!(b, Behavior::HoldTap { name, .. } if name == "hml"))
            .expect("hml behavior not found");
        if let Behavior::HoldTap {
            flavor,
            tapping_term_ms,
            hold_trigger_key_positions,
            hold_trigger_on_release,
            hold_bindings,
            tap_bindings,
            ..
        } = hml
        {
            assert_eq!(flavor, "balanced");
            assert_eq!(*tapping_term_ms, 280);
            assert!(hold_trigger_key_positions.is_some());
            assert!(*hold_trigger_on_release);
            assert_eq!(hold_bindings, "&kp");
            assert_eq!(tap_bindings, "&kp");
            // KEYS_R + THUMBS
            let positions = hold_trigger_key_positions.as_ref().unwrap();
            assert_eq!(positions.len(), 22); // 16 + 6
        }

        // Check game layer has mt binding
        let game_layer = &keymap.layers[5];
        assert_eq!(game_layer.name, "GAME");
        assert_eq!(game_layer.bindings[21].action, "mt");
        assert_eq!(game_layer.bindings[21].params, vec!["LCTRL", "Z"]);
    }

    #[test]
    fn test_round_trip() {
        let content = std::fs::read_to_string("../../config/totem.keymap")
            .expect("Could not read keymap file");
        let keymap = parse(&content).expect("Parse failed");
        let serialized = super::super::serializer::serialize(&keymap);
        let reparsed = parse(&serialized).expect("Re-parse failed");

        assert_eq!(keymap.layers.len(), reparsed.layers.len());
        for (orig, re) in keymap.layers.iter().zip(reparsed.layers.iter()) {
            assert_eq!(orig.name, re.name);
            assert_eq!(orig.bindings.len(), re.bindings.len());
            for (ob, rb) in orig.bindings.iter().zip(re.bindings.iter()) {
                assert_eq!(ob.action, rb.action, "Layer '{}' binding mismatch", orig.name);
                assert_eq!(ob.params, rb.params, "Layer '{}' params mismatch", orig.name);
            }
        }
        assert_eq!(keymap.combos.len(), reparsed.combos.len());
        for (orig, re) in keymap.combos.iter().zip(reparsed.combos.iter()) {
            assert_eq!(orig.name, re.name);
            assert_eq!(orig.positions, re.positions);
            assert_eq!(orig.binding.action, re.binding.action);
            assert_eq!(orig.binding.params, re.binding.params);
            assert_eq!(orig.timeout_ms, re.timeout_ms);
            assert_eq!(orig.layers, re.layers);
        }
    }
}
