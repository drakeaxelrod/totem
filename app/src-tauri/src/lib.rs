mod build;
mod keymap;
mod studio;

use std::sync::Arc;

use keymap::types::Keymap;
use studio::transport::{DeviceInfo, TransportKind};
use tauri::State;
use tokio::sync::Mutex;

/// Shared state for the connected Studio client.
struct AppState {
    client: Mutex<Option<Arc<studio::StudioClient>>>,
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
    Ok(format!("{:?}", lock_state))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            client: Mutex::new(None),
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
