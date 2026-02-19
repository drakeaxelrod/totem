pub mod framing;
pub mod transport;

use std::sync::atomic::{AtomicU32, Ordering};
use std::time::Duration;

use prost::Message;
use tokio::sync::Mutex;

use transport::{DeviceInfo, Transport, TransportKind};

// Generated protobuf types
pub mod proto {
    pub mod zmk {
        pub mod studio {
            include!(concat!(env!("OUT_DIR"), "/zmk.studio.rs"));
        }
        pub mod core {
            include!(concat!(env!("OUT_DIR"), "/zmk.core.rs"));
        }
        pub mod keymap {
            include!(concat!(env!("OUT_DIR"), "/zmk.keymap.rs"));
        }
        pub mod behaviors {
            include!(concat!(env!("OUT_DIR"), "/zmk.behaviors.rs"));
        }
        pub mod meta {
            include!(concat!(env!("OUT_DIR"), "/zmk.meta.rs"));
        }
    }
}

use proto::zmk::{behaviors, core, keymap, studio};

/// Client for the ZMK Studio RPC protocol.
pub struct StudioClient {
    transport: Mutex<Transport>,
    next_request_id: AtomicU32,
}

/// Device info returned after connecting.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectedDeviceInfo {
    pub name: String,
    pub serial_number: String,
    pub transport: TransportKind,
}

/// Battery levels (one per half for split keyboards).
#[derive(Debug, Clone, serde::Serialize)]
pub struct BatteryInfo {
    pub levels: Vec<u8>,
}

impl StudioClient {
    pub fn new(transport: Transport) -> Self {
        Self {
            transport: Mutex::new(transport),
            next_request_id: AtomicU32::new(1),
        }
    }

    /// Send a request and wait for the matching response.
    async fn request(&self, req: studio::Request) -> Result<studio::RequestResponse, String> {
        let mut transport = self.transport.lock().await;

        let payload = req.encode_to_vec();
        transport.send(&payload).await?;

        // Read responses until we get a RequestResponse matching our request_id
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        loop {
            if tokio::time::Instant::now() > deadline {
                return Err("Request timed out".into());
            }
            let data = tokio::time::timeout(Duration::from_secs(5), transport.recv())
                .await
                .map_err(|_| "Receive timed out".to_string())?
                .map_err(|e| format!("Receive error: {e}"))?;

            let response = studio::Response::decode(data.as_slice())
                .map_err(|e| format!("Decode error: {e}"))?;

            match response.r#type {
                Some(studio::response::Type::RequestResponse(rr)) => {
                    if rr.request_id == req.request_id {
                        return Ok(rr);
                    }
                    // Wrong request_id — keep reading
                }
                Some(studio::response::Type::Notification(_)) => {
                    // Notifications are ignored for now (could be forwarded to a channel)
                    continue;
                }
                None => continue,
            }
        }
    }

    fn make_request(&self, subsystem: studio::request::Subsystem) -> studio::Request {
        let id = self.next_request_id.fetch_add(1, Ordering::Relaxed);
        studio::Request {
            request_id: id,
            subsystem: Some(subsystem),
        }
    }

    // ── Core subsystem ───────────────────────────────────────────────

    /// Get device info (name + serial number).
    pub async fn get_device_info(&self) -> Result<core::GetDeviceInfoResponse, String> {
        let req = self.make_request(studio::request::Subsystem::Core(core::Request {
            request_type: Some(core::request::RequestType::GetDeviceInfo(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Core(core::Response {
                response_type: Some(core::response::ResponseType::GetDeviceInfo(info)),
            })) => Ok(info),
            _ => Err("Unexpected response for get_device_info".into()),
        }
    }

    /// Get lock state.
    pub async fn get_lock_state(&self) -> Result<core::LockState, String> {
        let req = self.make_request(studio::request::Subsystem::Core(core::Request {
            request_type: Some(core::request::RequestType::GetLockState(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Core(core::Response {
                response_type: Some(core::response::ResponseType::GetLockState(state)),
            })) => core::LockState::try_from(state).map_err(|_| "Invalid lock state".into()),
            _ => Err("Unexpected response for get_lock_state".into()),
        }
    }

    // ── Behaviors subsystem ──────────────────────────────────────────

    /// List all behavior IDs.
    pub async fn list_behaviors(&self) -> Result<Vec<u32>, String> {
        let req =
            self.make_request(studio::request::Subsystem::Behaviors(behaviors::Request {
                request_type: Some(behaviors::request::RequestType::ListAllBehaviors(true)),
            }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Behaviors(behaviors::Response {
                response_type:
                    Some(behaviors::response::ResponseType::ListAllBehaviors(
                        behaviors::ListAllBehaviorsResponse { behaviors },
                    )),
            })) => Ok(behaviors),
            _ => Err("Unexpected response for list_behaviors".into()),
        }
    }

    /// Get details for a specific behavior.
    #[allow(dead_code)]
    pub async fn get_behavior_details(
        &self,
        behavior_id: u32,
    ) -> Result<behaviors::GetBehaviorDetailsResponse, String> {
        let req =
            self.make_request(studio::request::Subsystem::Behaviors(behaviors::Request {
                request_type: Some(behaviors::request::RequestType::GetBehaviorDetails(
                    behaviors::GetBehaviorDetailsRequest { behavior_id },
                )),
            }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Behaviors(behaviors::Response {
                response_type: Some(behaviors::response::ResponseType::GetBehaviorDetails(details)),
            })) => Ok(details),
            _ => Err("Unexpected response for get_behavior_details".into()),
        }
    }

    // ── Keymap subsystem ─────────────────────────────────────────────

    /// Get the full live keymap from the device.
    pub async fn get_keymap(&self) -> Result<keymap::Keymap, String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::GetKeymap(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::GetKeymap(km)),
            })) => Ok(km),
            _ => Err("Unexpected response for get_keymap".into()),
        }
    }

    /// Get physical layouts from the device.
    #[allow(dead_code)]
    pub async fn get_physical_layouts(&self) -> Result<keymap::PhysicalLayouts, String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::GetPhysicalLayouts(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::GetPhysicalLayouts(layouts)),
            })) => Ok(layouts),
            _ => Err("Unexpected response for get_physical_layouts".into()),
        }
    }

    // ── Battery (BLE only) ───────────────────────────────────────────

    /// Read battery levels from BLE Battery Service.
    /// Returns one level per battery characteristic found (one per half for split keyboards).
    pub async fn get_battery(&self) -> Result<BatteryInfo, String> {
        let transport = self.transport.lock().await;
        let levels = transport.get_battery().await?;
        Ok(BatteryInfo { levels })
    }

    /// Lock or unlock the device. `lock=true` locks, `lock=false` requests unlock
    /// (user must confirm on the physical keyboard).
    pub async fn set_lock_state(&self, lock: bool) -> Result<(), String> {
        let req = self.make_request(studio::request::Subsystem::Core(core::Request {
            request_type: Some(core::request::RequestType::Lock(lock)),
        }));
        let _rr = self.request(req).await?;
        Ok(())
    }

    // ── Live keymap editing ───────────────────────────────────────────

    /// Set a single binding on the device's live keymap.
    pub async fn set_layer_binding(
        &self,
        layer_id: u32,
        key_position: i32,
        behavior_id: i32,
        param1: u32,
        param2: u32,
    ) -> Result<(), String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::SetLayerBinding(
                keymap::SetLayerBindingRequest {
                    layer_id,
                    key_position,
                    binding: Some(keymap::BehaviorBinding {
                        behavior_id,
                        param1,
                        param2,
                    }),
                },
            )),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::SetLayerBinding(code)),
            })) => {
                if code == keymap::SetLayerBindingResponse::SetLayerBindingRespOk as i32 {
                    Ok(())
                } else {
                    Err(format!("set_layer_binding error code: {code}"))
                }
            }
            _ => Err("Unexpected response for set_layer_binding".into()),
        }
    }

    /// Check if the device has unsaved changes.
    pub async fn check_unsaved_changes(&self) -> Result<bool, String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::CheckUnsavedChanges(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::CheckUnsavedChanges(has)),
            })) => Ok(has),
            _ => Err("Unexpected response for check_unsaved_changes".into()),
        }
    }

    /// Save changes on the device to persistent storage.
    pub async fn save_changes(&self) -> Result<(), String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::SaveChanges(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::SaveChanges(resp)),
            })) => match resp.result {
                Some(keymap::save_changes_response::Result::Ok(_)) => Ok(()),
                Some(keymap::save_changes_response::Result::Err(code)) => {
                    Err(format!("save_changes error code: {code}"))
                }
                None => Err("Empty save_changes response".into()),
            },
            _ => Err("Unexpected response for save_changes".into()),
        }
    }

    /// Discard all unsaved changes on the device.
    pub async fn discard_changes(&self) -> Result<(), String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::DiscardChanges(true)),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::DiscardChanges(_)),
            })) => Ok(()),
            _ => Err("Unexpected response for discard_changes".into()),
        }
    }

    /// Rename a layer on the device.
    pub async fn set_layer_props(&self, layer_id: u32, name: &str) -> Result<(), String> {
        let req = self.make_request(studio::request::Subsystem::Keymap(keymap::Request {
            request_type: Some(keymap::request::RequestType::SetLayerProps(
                keymap::SetLayerPropsRequest {
                    layer_id,
                    name: name.to_string(),
                },
            )),
        }));
        let rr = self.request(req).await?;
        match rr.subsystem {
            Some(studio::request_response::Subsystem::Keymap(keymap::Response {
                response_type: Some(keymap::response::ResponseType::SetLayerProps(code)),
            })) => {
                if code == keymap::SetLayerPropsResponse::SetLayerPropsRespOk as i32 {
                    Ok(())
                } else {
                    Err(format!("set_layer_props error code: {code}"))
                }
            }
            _ => Err("Unexpected response for set_layer_props".into()),
        }
    }
}

/// Discover all available devices (USB + BLE).
pub async fn discover_devices() -> Result<Vec<DeviceInfo>, String> {
    let mut devices = transport::UsbTransport::list_ports();

    match transport::BleTransport::scan(Duration::from_secs(3)).await {
        Ok(ble_devices) => devices.extend(ble_devices),
        Err(e) => {
            // BLE scan failure is non-fatal (adapter might not be available)
            eprintln!("BLE scan failed: {e}");
        }
    }

    Ok(devices)
}

/// Connect to a device by ID and transport type.
pub async fn connect_device(
    device_id: &str,
    transport_kind: TransportKind,
) -> Result<StudioClient, String> {
    let transport = match transport_kind {
        TransportKind::Usb => {
            let usb = transport::UsbTransport::connect(device_id).await?;
            Transport::Usb(usb)
        }
        TransportKind::Ble => {
            let ble = transport::BleTransport::connect(device_id).await?;
            Transport::Ble(ble)
        }
    };
    Ok(StudioClient::new(transport))
}

// ── Serializable types for Tauri IPC (prost types don't impl Serialize) ──

#[derive(Debug, Clone, serde::Serialize)]
pub struct LiveKeymap {
    pub layers: Vec<LiveLayer>,
    pub available_layers: u32,
    pub max_layer_name_length: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LiveLayer {
    pub id: u32,
    pub name: String,
    pub bindings: Vec<LiveBinding>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LiveBinding {
    pub behavior_id: i32,
    pub param1: u32,
    pub param2: u32,
}

impl LiveKeymap {
    pub fn from_proto(km: keymap::Keymap) -> Self {
        Self {
            layers: km
                .layers
                .into_iter()
                .map(|l| LiveLayer {
                    id: l.id,
                    name: l.name,
                    bindings: l
                        .bindings
                        .into_iter()
                        .map(|b| LiveBinding {
                            behavior_id: b.behavior_id,
                            param1: b.param1,
                            param2: b.param2,
                        })
                        .collect(),
                })
                .collect(),
            available_layers: km.available_layers,
            max_layer_name_length: km.max_layer_name_length,
        }
    }
}
