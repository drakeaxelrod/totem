mod build;
mod keymap;
mod studio;

use std::collections::HashMap;
use std::sync::Arc;

use keymap::types::Keymap;
use studio::transport::{DeviceInfo, TransportKind};
use tauri::State;
use tokio::sync::Mutex;

/// Shared state for the connected Studio client.
struct AppState {
    client: Mutex<Option<Arc<studio::StudioClient>>>,
    /// Cached mapping: behavior display_name → behavior_id (populated by discover_behaviors)
    behavior_map: Mutex<HashMap<String, i32>>,
}

#[tauri::command]
fn load_keymap() -> Result<Keymap, String> {
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let mut dir = root.as_path();
    loop {
        if dir.join("flake.nix").exists() {
            break;
        }
        dir = dir.parent().ok_or("Could not find project root")?;
    }
    let path = dir.join("config/totem.keymap");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    keymap::parser::parse(&content).map_err(|e| format!("Parse error: {e}"))
}

#[tauri::command]
fn save_keymap(keymap: Keymap) -> Result<(), String> {
    let root = std::env::current_dir().map_err(|e| e.to_string())?;
    let mut dir = root.as_path();
    loop {
        if dir.join("flake.nix").exists() {
            break;
        }
        dir = dir.parent().ok_or("Could not find project root")?;
    }
    let path = dir.join("config/totem.keymap");
    let content = keymap::serializer::serialize(&keymap);
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to write {}: {e}", path.display()))
}

// ── Studio device commands ───────────────────────────────────────────

#[tauri::command]
async fn list_devices() -> Result<Vec<DeviceInfo>, String> {
    studio::discover_devices().await
}

#[tauri::command]
async fn connect_device(
    state: State<'_, AppState>,
    device_id: String,
    transport: TransportKind,
) -> Result<studio::ConnectedDeviceInfo, String> {
    let client = studio::connect_device(&device_id, transport).await?;
    let info = client.get_device_info().await?;

    let serial_hex = info
        .serial_number
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();

    let connected_info = studio::ConnectedDeviceInfo {
        name: info.name,
        serial_number: serial_hex,
        transport,
    };

    let client = Arc::new(client);
    *state.client.lock().await = Some(client);

    Ok(connected_info)
}

#[tauri::command]
async fn disconnect_device(state: State<'_, AppState>) -> Result<(), String> {
    *state.client.lock().await = None;
    Ok(())
}

#[tauri::command]
async fn get_lock_state(state: State<'_, AppState>) -> Result<String, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    let lock_state = client.get_lock_state().await?;
    // Return a stable string rather than relying on prost Debug formatting
    use studio::proto::zmk::core::LockState;
    match lock_state {
        LockState::ZmkStudioCoreLockStateUnlocked => Ok("unlocked".to_string()),
        _ => Ok("locked".to_string()),
    }
}

#[tauri::command]
async fn set_lock_state(state: State<'_, AppState>, lock: bool) -> Result<(), String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.set_lock_state(lock).await
}

#[tauri::command]
async fn get_battery(state: State<'_, AppState>) -> Result<studio::BatteryInfo, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.get_battery().await
}

/// Get live keymap from connected device. Returns a simplified JSON representation
/// since prost types don't implement serde::Serialize.
#[tauri::command]
async fn get_live_keymap(state: State<'_, AppState>) -> Result<studio::LiveKeymap, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    let km = client.get_keymap().await?;
    Ok(studio::LiveKeymap::from_proto(km))
}

#[tauri::command]
async fn list_behaviors_live(state: State<'_, AppState>) -> Result<Vec<u32>, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.list_behaviors().await
}

#[tauri::command]
async fn set_layer_binding(
    state: State<'_, AppState>,
    layer_id: u32,
    key_position: i32,
    behavior_id: i32,
    param1: u32,
    param2: u32,
) -> Result<(), String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client
        .set_layer_binding(layer_id, key_position, behavior_id, param1, param2)
        .await
}

#[tauri::command]
async fn check_unsaved_changes(state: State<'_, AppState>) -> Result<bool, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.check_unsaved_changes().await
}

#[tauri::command]
async fn save_changes_live(state: State<'_, AppState>) -> Result<(), String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.save_changes().await
}

#[tauri::command]
async fn discard_changes_live(state: State<'_, AppState>) -> Result<(), String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.discard_changes().await
}

#[tauri::command]
async fn set_layer_props(
    state: State<'_, AppState>,
    layer_id: u32,
    name: String,
) -> Result<(), String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client.set_layer_props(layer_id, &name).await
}

// ── Behavior discovery & live binding resolution ─────────────────────

#[derive(Debug, Clone, serde::Serialize)]
struct BehaviorInfo {
    id: u32,
    display_name: String,
}

/// Discover all behaviors on the connected device. Caches the
/// display_name → behavior_id mapping for later use by set_live_binding.
#[tauri::command]
async fn discover_behaviors(state: State<'_, AppState>) -> Result<Vec<BehaviorInfo>, String> {
    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    let ids = client.list_behaviors().await?;
    let mut infos = Vec::new();
    let mut map = HashMap::new();
    for id in ids {
        match client.get_behavior_details(id).await {
            Ok(details) => {
                let name_lower = details.display_name.to_lowercase();
                println!("Behavior {id}: display_name={:?} (key={name_lower:?})", details.display_name);
                map.insert(name_lower, id as i32);
                infos.push(BehaviorInfo {
                    id,
                    display_name: details.display_name,
                });
            }
            Err(e) => {
                eprintln!("Failed to get details for behavior {id}: {e}");
            }
        }
    }
    println!("Behavior map: {map:?}");
    *state.behavior_map.lock().await = map;
    Ok(infos)
}

/// Map from frontend action names to the display_name strings the ZMK firmware reports
/// via the Studio protocol's GetBehaviorDetailsResponse.
fn action_to_display_name(action: &str) -> Option<&'static str> {
    Some(match action {
        "kp" => "key press",
        "mt" => "mod-tap",
        "lt" => "layer-tap",
        "mo" => "momentary layer",
        "to" => "to layer",
        "tog" => "toggle layer",
        "sl" => "sticky layer",
        "sk" => "sticky key",
        "kt" => "key toggle",
        "none" => "none",
        "trans" => "transparent",
        "gresc" => "grave escape",
        "caps_word" => "caps word",
        "key_repeat" => "key repeat",
        "mkp" => "mouse key press",
        "mmv" => "mouse move",
        "msc" => "mouse scroll",
        "bt" => "bluetooth",
        "out" => "output selection",
        "soft_off" => "soft off",
        "bootloader" => "bootloader",
        "sys_reset" => "reset",
        "ext_power" => "external power",
        "studio_unlock" => "studio unlock",
        _ => return None,
    })
}

/// Resolve a text-based binding (action + params) to numeric (behavior_id, param1, param2).
fn resolve_binding(
    action: &str,
    params: &[String],
    behavior_map: &HashMap<String, i32>,
) -> Result<(i32, u32, u32), String> {
    let action_lower = action.to_lowercase();

    // Try looking up by standard display name first, then fall back to direct name match
    let display_name = action_to_display_name(&action_lower);
    let behavior_id = display_name
        .and_then(|dn| behavior_map.get(dn).copied())
        .or_else(|| behavior_map.get(&action_lower).copied())
        .ok_or_else(|| {
            eprintln!("resolve_binding: no match for action={action:?}, display_name={display_name:?}");
            eprintln!("  Available behaviors: {:?}", behavior_map.keys().collect::<Vec<_>>());
            format!("Unknown behavior: {action}")
        })?;

    // No-param actions
    let no_param_actions = [
        "trans", "none", "caps_word", "key_repeat", "gresc",
        "soft_off", "bootloader", "sys_reset", "studio_unlock",
    ];
    if no_param_actions.contains(&action_lower.as_str()) {
        return Ok((behavior_id, 0, 0));
    }

    match action_lower.as_str() {
        // Single keycode: kp, sk, kt, mkp
        "kp" | "sk" | "kt" | "mkp" => {
            let param = params.first().ok_or("Missing keycode parameter")?;
            let hid = studio::hid_usage::parse_keycode_with_modifiers(param)
                .ok_or_else(|| format!("Unknown keycode: {param}"))?;
            Ok((behavior_id, hid, 0))
        }
        // Hold-tap: hml, hmr, mt — param1=modifier HID, param2=keycode HID
        "hml" | "hmr" | "mt" => {
            let hold = params.first().ok_or("Missing hold parameter")?;
            let tap = params.get(1).ok_or("Missing tap parameter")?;
            let hold_hid = studio::hid_usage::parse_keycode_with_modifiers(hold)
                .ok_or_else(|| format!("Unknown hold keycode: {hold}"))?;
            let tap_hid = studio::hid_usage::parse_keycode_with_modifiers(tap)
                .ok_or_else(|| format!("Unknown tap keycode: {tap}"))?;
            Ok((behavior_id, hold_hid, tap_hid))
        }
        // Layer-tap: lt, lt_th — param1=layer index, param2=keycode HID
        "lt" | "lt_th" => {
            let layer = params.first().ok_or("Missing layer parameter")?;
            let layer_idx: u32 = layer.parse().map_err(|_| format!("Invalid layer: {layer}"))?;
            let keycode = params.get(1).ok_or("Missing keycode parameter")?;
            let hid = studio::hid_usage::parse_keycode_with_modifiers(keycode)
                .ok_or_else(|| format!("Unknown keycode: {keycode}"))?;
            Ok((behavior_id, layer_idx, hid))
        }
        // Layer actions: mo, tog, sl, to — param1=layer index
        "mo" | "tog" | "sl" | "to" => {
            let layer = params.first().ok_or("Missing layer parameter")?;
            let layer_idx: u32 = layer.parse().map_err(|_| format!("Invalid layer: {layer}"))?;
            Ok((behavior_id, layer_idx, 0))
        }
        // Bluetooth: bt — param1 varies (profile number for BT_SEL)
        "bt" => {
            let sub = params.first().map(|s| s.as_str()).unwrap_or("");
            let val: u32 = match sub {
                "BT_CLR" => 0,
                "BT_NXT" => 1,
                "BT_PRV" => 2,
                "BT_CLR_ALL" => 5,
                s if s.starts_with("BT_SEL") || s.starts_with("BT_DISC") => {
                    // BT_SEL 0, BT_DISC 1, etc.
                    params.get(1)
                        .and_then(|n| n.parse().ok())
                        .unwrap_or(0)
                }
                _ => 0,
            };
            Ok((behavior_id, val, 0))
        }
        // Output: out — param1 = OUT_USB/OUT_BLE/OUT_TOG
        "out" => {
            let sub = params.first().map(|s| s.as_str()).unwrap_or("OUT_TOG");
            let val: u32 = match sub {
                "OUT_USB" => 0,
                "OUT_BLE" => 1,
                "OUT_TOG" => 2,
                _ => 2,
            };
            Ok((behavior_id, val, 0))
        }
        // Mod-morph and macro behaviors (comma_morph, dot_morph, fat_arrow, td)
        // These are device-defined with fixed bindings — no runtime params
        _ => {
            // Fallback: try to parse params as keycode HIDs
            let p1 = params
                .first()
                .and_then(|p| studio::hid_usage::parse_keycode_with_modifiers(p))
                .unwrap_or(0);
            let p2 = params
                .get(1)
                .and_then(|p| studio::hid_usage::parse_keycode_with_modifiers(p))
                .unwrap_or(0);
            Ok((behavior_id, p1, p2))
        }
    }
}

/// Set a binding on the device using text-based action + params.
/// Resolves the text to numeric values using the cached behavior map.
#[tauri::command]
async fn set_live_binding(
    state: State<'_, AppState>,
    layer_id: u32,
    key_position: i32,
    action: String,
    params: Vec<String>,
) -> Result<(), String> {
    let bmap = state.behavior_map.lock().await;
    if bmap.is_empty() {
        return Err("Behavior map not initialized — call discover_behaviors first".into());
    }
    let (behavior_id, param1, param2) = resolve_binding(&action, &params, &bmap)?;
    drop(bmap); // Release behavior_map lock before acquiring client lock

    let guard = state.client.lock().await;
    let client = guard.as_ref().ok_or("Not connected")?;
    client
        .set_layer_binding(layer_id, key_position, behavior_id, param1, param2)
        .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            client: Mutex::new(None),
            behavior_map: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            load_keymap,
            save_keymap,
            build::start_build,
            list_devices,
            connect_device,
            disconnect_device,
            get_lock_state,
            set_lock_state,
            get_battery,
            get_live_keymap,
            list_behaviors_live,
            set_layer_binding,
            check_unsaved_changes,
            save_changes_live,
            discard_changes_live,
            set_layer_props,
            discover_behaviors,
            set_live_binding,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
