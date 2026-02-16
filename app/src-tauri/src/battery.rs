use serde::Serialize;
use zbus::Connection;
use zbus::names::InterfaceName;
use zvariant::OwnedValue;

const BATTERY_LEVEL_UUID: &str = "00002a19-0000-1000-8000-00805f9b34fb";
const BLUEZ_SERVICE: &str = "org.bluez";
const DEVICE_IFACE: &str = "org.bluez.Device1";
const GATT_CHAR_IFACE: &str = "org.bluez.GattCharacteristic1";

#[derive(Debug, Clone, Serialize)]
pub struct BatteryLevels {
    pub left: Option<u8>,
    pub right: Option<u8>,
}

pub async fn read_battery_levels() -> Result<BatteryLevels, String> {
    let connection = Connection::system()
        .await
        .map_err(|e| format!("DBus connection failed: {e}"))?;

    let proxy = zbus::fdo::ObjectManagerProxy::builder(&connection)
        .destination(BLUEZ_SERVICE)
        .map_err(|e| format!("Bad destination: {e}"))?
        .path("/")
        .map_err(|e| format!("Bad path: {e}"))?
        .build()
        .await
        .map_err(|e| format!("ObjectManager proxy failed: {e}"))?;

    let objects = proxy
        .get_managed_objects()
        .await
        .map_err(|e| format!("GetManagedObjects failed: {e}"))?;

    // Find the TOTEM device path
    let mut device_path: Option<String> = None;
    for (path, ifaces) in &objects {
        for (iface_name, props) in ifaces {
            if iface_name.as_str() != DEVICE_IFACE {
                continue;
            }
            if let Some(name_val) = props.get("Name") {
                if let Ok(name) = <&str>::try_from(name_val) {
                    if name == "TOTEM" {
                        device_path = Some(path.to_string());
                    }
                }
            }
        }
    }

    let device_path = device_path.ok_or_else(|| "TOTEM device not found on BlueZ".to_string())?;

    // Find battery level GATT characteristics under this device
    let mut battery_levels: Vec<(String, u8)> = Vec::new();

    for (path, ifaces) in &objects {
        let path_str = path.to_string();
        if !path_str.starts_with(&device_path) {
            continue;
        }

        for (iface_name, props) in ifaces {
            if iface_name.as_str() != GATT_CHAR_IFACE {
                continue;
            }

            let uuid = props
                .get("UUID")
                .and_then(|v| <&str>::try_from(v).ok())
                .unwrap_or("");

            if uuid != BATTERY_LEVEL_UUID {
                continue;
            }

            // Try cached Value property first
            if let Some(value) = props.get("Value") {
                if let Ok(bytes) = <Vec<u8>>::try_from(value.clone()) {
                    if let Some(&level) = bytes.first() {
                        battery_levels.push((path_str.clone(), level));
                        continue;
                    }
                }
            }

            // Fallback: read via Properties proxy
            if let Ok(level) = read_gatt_value(&connection, &path_str).await {
                battery_levels.push((path_str.clone(), level));
            }
        }
    }

    // Sort by path to get consistent ordering (central first, peripheral second)
    battery_levels.sort_by(|a, b| a.0.cmp(&b.0));

    Ok(BatteryLevels {
        left: battery_levels.first().map(|(_, l)| *l),
        right: battery_levels.get(1).map(|(_, l)| *l),
    })
}

async fn read_gatt_value(connection: &Connection, path: &str) -> Result<u8, String> {
    let proxy = zbus::fdo::PropertiesProxy::builder(connection)
        .destination(BLUEZ_SERVICE)
        .map_err(|e| format!("{e}"))?
        .path(path)
        .map_err(|e| format!("{e}"))?
        .build()
        .await
        .map_err(|e| format!("{e}"))?;

    let iface_name = InterfaceName::from_static_str_unchecked(GATT_CHAR_IFACE);
    let value: OwnedValue = proxy
        .get(iface_name, "Value")
        .await
        .map_err(|e| format!("ReadValue failed: {e}"))?;

    let bytes = <Vec<u8>>::try_from(value).map_err(|e| format!("Unexpected value type: {e}"))?;

    bytes
        .first()
        .copied()
        .ok_or_else(|| "Empty battery value".to_string())
}
