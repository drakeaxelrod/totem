use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Keymap {
    pub layers: Vec<Layer>,
    pub combos: Vec<Combo>,
    pub behaviors: Vec<Behavior>,
    pub mouse_config: MouseConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MouseConfig {
    pub move_speed: u32,
    pub scroll_speed: u32,
    pub move_time_to_max_ms: u32,
    pub move_accel_exponent: u32,
    pub scroll_time_to_max_ms: u32,
    pub scroll_accel_exponent: u32,
}

impl Default for MouseConfig {
    fn default() -> Self {
        Self {
            move_speed: 1500,
            scroll_speed: 20,
            move_time_to_max_ms: 300,
            move_accel_exponent: 1,
            scroll_time_to_max_ms: 300,
            scroll_accel_exponent: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Layer {
    pub name: String,
    pub index: usize,
    pub bindings: Vec<Binding>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Binding {
    pub action: String,
    pub params: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Combo {
    pub name: String,
    pub positions: Vec<u8>,
    pub binding: Binding,
    pub timeout_ms: u32,
    pub layers: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum Behavior {
    HoldTap {
        name: String,
        label: String,
        flavor: String,
        tapping_term_ms: u32,
        quick_tap_ms: u32,
        require_prior_idle_ms: Option<u32>,
        hold_trigger_key_positions: Option<Vec<u8>>,
        hold_trigger_on_release: bool,
        hold_bindings: String,
        tap_bindings: String,
    },
    ModMorph {
        name: String,
        label: String,
        normal: Binding,
        shifted: Binding,
        mods: String,
    },
    Macro {
        name: String,
        label: String,
        wait_ms: u32,
        tap_ms: u32,
        bindings: Vec<Binding>,
    },
}
