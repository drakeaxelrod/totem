use hidapi::HidApi;
use serde::Serialize;

const VID: u16 = 0x4C4B;
const PID: u16 = 0x544D;
const VIAL_USAGE_PAGE: u16 = 0xFF60;

// VIA protocol commands
#[allow(dead_code)]
const CMD_GET_PROTOCOL_VERSION: u8 = 0x01;
#[allow(dead_code)]
const CMD_GET_KEYCODE: u8 = 0x04;
const CMD_GET_LAYER_COUNT: u8 = 0x11;
const CMD_GET_BUFFER: u8 = 0x12;

const PACKET_SIZE: usize = 32;
// Max payload per get_buffer request: 32 - 4 (cmd + offset_hi + offset_lo + size) = 28
const BUFFER_CHUNK: usize = 28;

#[derive(Debug, Clone, Serialize)]
pub struct VialKeymap {
    pub rows: usize,
    pub cols: usize,
    pub layers: usize,
    /// keymap[layer][row][col] = QMK 2-byte keycode
    pub keymap: Vec<Vec<Vec<u16>>>,
}

pub fn is_device_present() -> bool {
    let Ok(api) = HidApi::new() else {
        return false;
    };
    let found = api.device_list().any(|info| {
        info.vendor_id() == VID
            && info.product_id() == PID
            && info.usage_page() == VIAL_USAGE_PAGE
    });
    found
}

fn find_and_open(api: &HidApi) -> Result<hidapi::HidDevice, String> {
    let info = api
        .device_list()
        .find(|info| {
            info.vendor_id() == VID
                && info.product_id() == PID
                && info.usage_page() == VIAL_USAGE_PAGE
        })
        .ok_or_else(|| "TOTEM keyboard not found on USB".to_string())?;

    info.open_device(api)
        .map_err(|e| format!("Failed to open HID device: {e}"))
}

pub fn read_keymap(rows: usize, cols: usize) -> Result<VialKeymap, String> {
    let api = HidApi::new().map_err(|e| format!("HID init failed: {e}"))?;
    let device = find_and_open(&api)?;

    // Get layer count
    let layers = {
        let mut pkt = [0u8; PACKET_SIZE + 1]; // +1 for report ID
        pkt[0] = 0x00; // report ID
        pkt[1] = CMD_GET_LAYER_COUNT;
        device
            .write(&pkt)
            .map_err(|e| format!("Write failed: {e}"))?;

        let mut resp = [0u8; PACKET_SIZE];
        device
            .read_timeout(&mut resp, 1000)
            .map_err(|e| format!("Read failed: {e}"))?;
        resp[1] as usize
    };

    if layers == 0 || layers > 32 {
        return Err(format!("Invalid layer count: {layers}"));
    }

    // Bulk-read keymap via get_buffer
    // Total size = layers * rows * cols * 2 bytes
    let total_bytes = layers * rows * cols * 2;
    let mut raw = vec![0u8; total_bytes];

    let mut offset: usize = 0;
    while offset < total_bytes {
        let chunk = BUFFER_CHUNK.min(total_bytes - offset);
        let mut pkt = [0u8; PACKET_SIZE + 1];
        pkt[0] = 0x00; // report ID
        pkt[1] = CMD_GET_BUFFER;
        pkt[2] = (offset >> 8) as u8; // offset high
        pkt[3] = (offset & 0xFF) as u8; // offset low
        pkt[4] = chunk as u8; // size

        device
            .write(&pkt)
            .map_err(|e| format!("Write failed at offset {offset}: {e}"))?;

        let mut resp = [0u8; PACKET_SIZE];
        let n = device
            .read_timeout(&mut resp, 1000)
            .map_err(|e| format!("Read failed at offset {offset}: {e}"))?;

        // VIA protocol: response echoes the command header, data starts at byte 4
        let data_start = if resp[0] == CMD_GET_BUFFER { 4 } else { 0 };
        let available = n.saturating_sub(data_start).min(chunk);
        if available > 0 {
            raw[offset..offset + available]
                .copy_from_slice(&resp[data_start..data_start + available]);
        }

        offset += chunk;
    }

    // Parse 2-byte big-endian keycodes into 3D array
    let mut keymap = vec![vec![vec![0u16; cols]; rows]; layers];
    for layer in 0..layers {
        for row in 0..rows {
            for col in 0..cols {
                let idx = (layer * rows * cols + row * cols + col) * 2;
                if idx + 1 < raw.len() {
                    keymap[layer][row][col] = ((raw[idx] as u16) << 8) | (raw[idx + 1] as u16);
                }
            }
        }
    }

    Ok(VialKeymap {
        rows,
        cols,
        layers,
        keymap,
    })
}
