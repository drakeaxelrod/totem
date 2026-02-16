mod battery;
mod vial;

#[tauri::command]
async fn get_battery_levels() -> Result<battery::BatteryLevels, String> {
    battery::read_battery_levels().await
}

#[tauri::command]
fn get_vial_keymap(rows: usize, cols: usize) -> Result<vial::VialKeymap, String> {
    vial::read_keymap(rows, cols)
}

#[tauri::command]
fn is_vial_connected() -> bool {
    vial::is_device_present()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_battery_levels,
            get_vial_keymap,
            is_vial_connected,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
