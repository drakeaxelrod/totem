use std::io::Read;
use std::time::Duration;

use btleplug::api::{
    Central, Characteristic, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Adapter, Manager, Peripheral};
use tokio::sync::mpsc;
use tokio_stream::StreamExt;
use uuid::Uuid;

use super::framing::{self, FrameDecoder};

/// ZMK Studio BLE GATT UUIDs.
const STUDIO_SERVICE_UUID: Uuid = Uuid::from_u128(0x00000000_0196_6107_c967_c5cfb1c2482a);
const STUDIO_CHAR_UUID: Uuid = Uuid::from_u128(0x00000001_0196_6107_c967_c5cfb1c2482a);

/// Standard BLE Battery Service.
const BATTERY_LEVEL_CHAR_UUID: Uuid = Uuid::from_u128(0x00002A19_0000_1000_8000_00805f9b34fb);

/// A discovered ZMK Studio device.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub transport: TransportKind,
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum TransportKind {
    Usb,
    Ble,
}

/// Abstraction over USB serial and BLE GATT transports.
pub enum Transport {
    Usb(UsbTransport),
    Ble(BleTransport),
}

impl Transport {
    /// Send a framed protobuf payload.
    pub async fn send(&mut self, payload: &[u8]) -> Result<(), String> {
        let frame = framing::encode(payload);
        match self {
            Transport::Usb(usb) => usb.send(&frame),
            Transport::Ble(ble) => ble.send(&frame).await,
        }
    }

    /// Receive the next complete protobuf payload (blocks until one arrives).
    pub async fn recv(&mut self) -> Result<Vec<u8>, String> {
        match self {
            Transport::Usb(usb) => usb.recv().await,
            Transport::Ble(ble) => ble.recv().await,
        }
    }

    /// Read battery level(s). Only available over BLE.
    pub async fn get_battery(&self) -> Result<Vec<u8>, String> {
        match self {
            Transport::Ble(ble) => ble.get_battery().await,
            Transport::Usb(_) => Err("Battery monitoring requires BLE connection".into()),
        }
    }
}

// ── USB Serial Transport ─────────────────────────────────────────────

pub struct UsbTransport {
    rx: mpsc::Receiver<Vec<u8>>,
    writer: std::sync::Mutex<Box<dyn serialport::SerialPort>>,
}

impl UsbTransport {
    /// List available USB serial ports that could be ZMK devices.
    pub fn list_ports() -> Vec<DeviceInfo> {
        let Ok(ports) = serialport::available_ports() else {
            return Vec::new();
        };
        ports
            .into_iter()
            .filter(|p| {
                matches!(
                    &p.port_type,
                    serialport::SerialPortType::UsbPort(info)
                        if is_zmk_usb_device(info)
                )
            })
            .map(|p| {
                let name = match &p.port_type {
                    serialport::SerialPortType::UsbPort(info) => info
                        .product
                        .clone()
                        .unwrap_or_else(|| p.port_name.clone()),
                    _ => p.port_name.clone(),
                };
                DeviceInfo {
                    id: p.port_name.clone(),
                    name,
                    transport: TransportKind::Usb,
                }
            })
            .collect()
    }

    /// Connect to a USB serial port.
    pub async fn connect(port_name: &str) -> Result<Self, String> {
        let port = serialport::new(port_name, 115200)
            .timeout(Duration::from_millis(100))
            .open()
            .map_err(|e| format!("Failed to open {port_name}: {e}"))?;

        let mut reader = port.try_clone().map_err(|e| e.to_string())?;
        let writer = port;

        let (tx, rx) = mpsc::channel(64);

        // Spawn a blocking read loop that feeds bytes through the frame decoder
        tokio::task::spawn_blocking(move || {
            let mut decoder = FrameDecoder::new();
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        for frame in decoder.feed(&buf[..n]) {
                            if tx.blocking_send(frame).is_err() {
                                return;
                            }
                        }
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                    Err(_) => break,
                }
            }
        });

        Ok(Self {
            rx,
            writer: std::sync::Mutex::new(writer),
        })
    }

    fn send(&self, frame: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock().map_err(|e| e.to_string())?;
        std::io::Write::write_all(&mut *writer, frame)
            .map_err(|e| format!("USB write error: {e}"))?;
        std::io::Write::flush(&mut *writer).map_err(|e| format!("USB flush error: {e}"))
    }

    async fn recv(&mut self) -> Result<Vec<u8>, String> {
        self.rx
            .recv()
            .await
            .ok_or_else(|| "USB serial connection closed".to_string())
    }
}

fn is_zmk_usb_device(info: &serialport::UsbPortInfo) -> bool {
    info.product
        .as_deref()
        .is_some_and(|p| p.contains("TOTEM") || p.contains("ZMK") || p.contains("nRF"))
        || info.manufacturer.as_deref().is_some_and(|m| {
            m.contains("GEIGEIGEIST") || m.contains("ZMK") || m.contains("Nordic")
        })
}

// ── BLE GATT Transport ───────────────────────────────────────────────

pub struct BleTransport {
    peripheral: Peripheral,
    studio_char: Characteristic,
    rx: mpsc::Receiver<Vec<u8>>,
    /// MAC address extracted from BlueZ D-Bus path, for sysfs battery reading.
    mac_address: String,
}

impl BleTransport {
    /// Scan for BLE devices advertising the ZMK Studio GATT service.
    pub async fn scan(timeout: Duration) -> Result<Vec<DeviceInfo>, String> {
        let manager = Manager::new().await.map_err(|e| e.to_string())?;
        let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
        let adapter = adapters
            .into_iter()
            .next()
            .ok_or("No Bluetooth adapter found")?;

        adapter
            .start_scan(ScanFilter {
                services: vec![STUDIO_SERVICE_UUID],
            })
            .await
            .map_err(|e| format!("BLE scan failed: {e}"))?;

        tokio::time::sleep(timeout).await;

        adapter
            .stop_scan()
            .await
            .map_err(|e| format!("BLE stop scan failed: {e}"))?;

        let peripherals = adapter.peripherals().await.map_err(|e| e.to_string())?;
        let mut devices = Vec::new();
        for p in peripherals {
            if let Ok(Some(props)) = p.properties().await {
                if props.services.contains(&STUDIO_SERVICE_UUID) {
                    devices.push(DeviceInfo {
                        id: p.id().to_string(),
                        name: props.local_name.unwrap_or_else(|| "ZMK Keyboard".into()),
                        transport: TransportKind::Ble,
                    });
                }
            }
        }
        Ok(devices)
    }

    /// Connect to a BLE peripheral by ID.
    pub async fn connect(device_id: &str) -> Result<Self, String> {
        let manager = Manager::new().await.map_err(|e| e.to_string())?;
        let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
        let adapter = adapters
            .into_iter()
            .next()
            .ok_or("No Bluetooth adapter found")?;

        let peripheral = find_peripheral(&adapter, device_id).await?;

        peripheral
            .connect()
            .await
            .map_err(|e| format!("BLE connect failed: {e}"))?;

        peripheral
            .discover_services()
            .await
            .map_err(|e| format!("Service discovery failed: {e}"))?;

        let studio_char = peripheral
            .characteristics()
            .into_iter()
            .find(|c| c.uuid == STUDIO_CHAR_UUID)
            .ok_or("ZMK Studio characteristic not found")?;

        // Subscribe to indications for responses
        peripheral
            .subscribe(&studio_char)
            .await
            .map_err(|e| format!("BLE subscribe failed: {e}"))?;

        let (tx, rx) = mpsc::channel(64);

        // Spawn notification listener
        let mut notification_stream = peripheral
            .notifications()
            .await
            .map_err(|e| format!("BLE notification stream failed: {e}"))?;

        let char_uuid = studio_char.uuid;
        tokio::spawn(async move {
            let mut decoder = FrameDecoder::new();
            while let Some(notif) = notification_stream.next().await {
                if notif.uuid == char_uuid {
                    for frame in decoder.feed(&notif.value) {
                        if tx.send(frame).await.is_err() {
                            return;
                        }
                    }
                }
            }
        });

        // Extract MAC address for sysfs/D-Bus battery reading.
        // Primary: D-Bus path (matches sysfs naming). Fallback: peripheral properties.
        let mac_address = extract_mac_from_dbus_path(device_id).unwrap_or_else(|| {
            String::new()
        });
        let mac_address = if mac_address.is_empty() {
            match peripheral.properties().await {
                Ok(Some(props)) => {
                    let addr = props.address.to_string().to_lowercase();
                    if addr != "00:00:00:00:00:00" { addr } else { String::new() }
                }
                _ => String::new(),
            }
        } else {
            mac_address
        };
        eprintln!("[battery] Device ID: {device_id}");
        eprintln!("[battery] MAC address for battery lookup: {:?}", mac_address);

        Ok(Self {
            peripheral,
            studio_char,
            rx,
            mac_address,
        })
    }

    async fn send(&self, frame: &[u8]) -> Result<(), String> {
        self.peripheral
            .write(&self.studio_char, frame, WriteType::WithoutResponse)
            .await
            .map_err(|e| format!("BLE write failed: {e}"))
    }

    async fn recv(&mut self) -> Result<Vec<u8>, String> {
        self.rx
            .recv()
            .await
            .ok_or_else(|| "BLE connection closed".to_string())
    }

    /// Read battery level(s).
    /// Prefers Linux sysfs (BlueZ power_supply) which correctly handles split keyboards
    /// with multiple Battery Service instances. Falls back to GATT characteristic reading.
    async fn get_battery(&self) -> Result<Vec<u8>, String> {
        // Try sysfs first — matches what the system (KDE, GNOME) reports
        if !self.mac_address.is_empty() {
            let levels = read_battery_sysfs(&self.mac_address);
            if !levels.is_empty() {
                return Ok(levels);
            }
            eprintln!(
                "[battery] No sysfs entries for MAC {}; trying D-Bus GATT",
                self.mac_address
            );
        } else {
            eprintln!("[battery] No MAC address available; trying D-Bus GATT");
        }

        // Try reading battery via BlueZ D-Bus GATT characteristic paths.
        // btleplug deduplicates characteristics with the same UUID, so for split
        // keyboards with two Battery Service instances we must go through D-Bus.
        if !self.mac_address.is_empty() {
            let levels = read_battery_dbus(&self.mac_address);
            if !levels.is_empty() {
                return Ok(levels);
            }
        }

        // Last resort: btleplug GATT (returns only 1 level for split keyboards
        // due to btleplug deduplicating characteristics with the same UUID)
        let chars: Vec<_> = self
            .peripheral
            .characteristics()
            .into_iter()
            .filter(|c| c.uuid == BATTERY_LEVEL_CHAR_UUID)
            .collect();

        eprintln!("[battery] btleplug found {} battery characteristic(s)", chars.len());
        let mut levels = Vec::new();
        for c in &chars {
            match self.peripheral.read(c).await {
                Ok(data) if !data.is_empty() => {
                    eprintln!("[battery] GATT read: {}%", data[0]);
                    levels.push(data[0]);
                }
                Ok(data) => {
                    eprintln!("[battery] GATT read returned empty data ({} bytes)", data.len());
                }
                Err(e) => {
                    eprintln!("[battery] GATT read failed: {e}");
                }
            }
        }
        Ok(levels)
    }
}

async fn find_peripheral(adapter: &Adapter, device_id: &str) -> Result<Peripheral, String> {
    let peripherals = adapter.peripherals().await.map_err(|e| e.to_string())?;
    peripherals
        .into_iter()
        .find(|p| p.id().to_string() == device_id)
        .ok_or_else(|| format!("Device {device_id} not found"))
}

/// Extract MAC address from btleplug's BlueZ D-Bus peripheral path.
/// e.g., "/org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF" -> "aa:bb:cc:dd:ee:ff"
fn extract_mac_from_dbus_path(path: &str) -> Option<String> {
    let marker = "dev_";
    let pos = path.rfind(marker)?;
    let mac_part = path[pos + marker.len()..].split('/').next()?;
    if mac_part.len() == 17 {
        Some(mac_part.to_lowercase().replace('_', ":"))
    } else {
        None
    }
}

/// Read battery level(s) from Linux sysfs (BlueZ power_supply entries).
/// BlueZ creates entries like `/sys/class/power_supply/hid-aa:bb:cc:dd:ee:ff-battery/`
/// for each Battery Service instance, correctly handling split keyboards.
fn read_battery_sysfs(mac: &str) -> Vec<u8> {
    let Ok(entries) = std::fs::read_dir("/sys/class/power_supply/") else {
        return Vec::new();
    };
    let mut found: Vec<(String, u8)> = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name.contains(mac) {
            let capacity = entry.path().join("capacity");
            if let Ok(content) = std::fs::read_to_string(&capacity) {
                if let Ok(level) = content.trim().parse::<u8>() {
                    found.push((name, level));
                }
            }
        }
    }
    if !found.is_empty() {
        eprintln!("[battery] sysfs entries found: {:?}", found);
    }
    // Sort by name for consistent ordering:
    // "hid-...-battery" (central/left) before "hid-...-battery-0" (peripheral/right)
    found.sort_by(|a, b| a.0.cmp(&b.0));
    found.into_iter().map(|(_, level)| level).collect()
}

/// Read battery level(s) via BlueZ D-Bus GATT characteristics.
/// Unlike btleplug (which deduplicates characteristics by UUID), D-Bus exposes
/// each Battery Level characteristic under its own object path, so split keyboards
/// with two Battery Service instances both appear.
fn read_battery_dbus(mac: &str) -> Vec<u8> {
    let mac_upper = mac.replace(':', "_").to_uppercase();
    let dev_prefix = format!("/org/bluez/hci0/dev_{mac_upper}");

    // Use busctl to introspect the BlueZ object tree for this device.
    // We're looking for GattCharacteristic1 objects with UUID = 00002a19-... (Battery Level).
    let Ok(output) = std::process::Command::new("busctl")
        .args([
            "tree",
            "--no-pager",
            "-M",
            "org.bluez",
        ])
        .output()
    else {
        return Vec::new();
    };

    let tree = String::from_utf8_lossy(&output.stdout);

    // Collect all characteristic paths under this device
    let char_paths: Vec<&str> = tree
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim().trim_start_matches(['├', '└', '│', '─', ' ']);
            if trimmed.starts_with(&dev_prefix) && trimmed.contains("/char") {
                Some(trimmed)
            } else {
                None
            }
        })
        .collect();

    // For each characteristic, check if it's a Battery Level char (UUID 2a19)
    // and read its value
    let mut levels = Vec::new();
    for path in &char_paths {
        // Read the UUID property
        let Ok(uuid_out) = std::process::Command::new("busctl")
            .args([
                "get-property",
                "org.bluez",
                path,
                "org.bluez.GattCharacteristic1",
                "UUID",
            ])
            .output()
        else {
            continue;
        };
        let uuid_str = String::from_utf8_lossy(&uuid_out.stdout);
        if !uuid_str.contains("00002a19") {
            continue;
        }

        // Read the battery value
        let Ok(val_out) = std::process::Command::new("busctl")
            .args([
                "call",
                "org.bluez",
                path,
                "org.bluez.GattCharacteristic1",
                "ReadValue",
                "a{sv}",
                "0",
            ])
            .output()
        else {
            continue;
        };
        let val_str = String::from_utf8_lossy(&val_out.stdout);
        // busctl output: "ay 1 <byte>" e.g. "ay 1 64" for 100%
        // Parse the last number as the battery level
        if let Some(level) = parse_busctl_byte_array(&val_str) {
            levels.push(level);
        }
    }

    if !levels.is_empty() {
        eprintln!("[battery] D-Bus GATT battery levels: {:?}", levels);
    }
    levels
}

/// Parse busctl byte array output like "ay 1 64\n" -> Some(64)
fn parse_busctl_byte_array(s: &str) -> Option<u8> {
    // Format: "ay <count> <byte1> [<byte2> ...]"
    let parts: Vec<&str> = s.trim().split_whitespace().collect();
    if parts.len() >= 3 && parts[0] == "ay" {
        parts[2].parse::<u8>().ok()
    } else {
        None
    }
}
