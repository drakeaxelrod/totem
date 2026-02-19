mod build;
mod keymap;

use keymap::types::Keymap;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![load_keymap, save_keymap, build::start_build])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
