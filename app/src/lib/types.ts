// ── Shared types for the Keysmith keyboard configurator ──────────────

// ── Device & connection ─────────────────────────────────────────────

export interface DeviceInfo {
  id: string;
  name: string;
  transport: "Usb" | "Ble";
}

export interface ConnectedDeviceInfo {
  name: string;
  serial_number: string;
  transport: "Usb" | "Ble";
}

export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "scanning" }
  | { state: "connecting"; device: DeviceInfo }
  | { state: "connected"; info: ConnectedDeviceInfo; locked: boolean };

// ── Binding ─────────────────────────────────────────────────────────

export interface Binding {
  action: string;
  params: string[];
}

// ── Behavior types ───────────────────────────────────────────────────

export interface HoldTapBehavior {
  type: "HoldTap";
  name: string;
  label: string;
  flavor: string;
  tapping_term_ms: number;
  quick_tap_ms: number;
  require_prior_idle_ms: number | null;
  hold_trigger_key_positions: number[] | null;
  hold_trigger_on_release: boolean;
  hold_bindings: string;
  tap_bindings: string;
}

export interface ModMorphBehavior {
  type: "ModMorph";
  name: string;
  label: string;
  normal: Binding;
  shifted: Binding;
  mods: string;
}

export interface MacroBehavior {
  type: "Macro";
  name: string;
  label: string;
  wait_ms: number;
  tap_ms: number;
  bindings: Binding[];
}

export interface TapDanceBehavior {
  type: "TapDance";
  name: string;
  label: string;
  tapping_term_ms: number;
  bindings: Binding[];
}

export type Behavior = HoldTapBehavior | ModMorphBehavior | MacroBehavior | TapDanceBehavior;

// ── Combo ────────────────────────────────────────────────────────────

export interface Combo {
  name: string;
  positions: number[];
  binding: Binding;
  timeout_ms: number;
  layers: number[];
  require_prior_idle_ms: number | null;
  slow_release: boolean;
}

// ── Mouse config ─────────────────────────────────────────────────────

export interface MouseConfig {
  move_speed: number;
  scroll_speed: number;
  move_time_to_max_ms: number;
  move_accel_exponent: number;
  scroll_time_to_max_ms: number;
  scroll_accel_exponent: number;
}

// ── Physical layout (from ZMK Studio protocol) ──────────────────────

export interface PhysicalLayouts {
  active_layout_index: number;
  layouts: PhysicalLayout[];
}

export interface PhysicalLayout {
  name: string;
  keys: KeyPhysicalAttrs[];
}

export interface KeyPhysicalAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  r: number;
  rx: number;
  ry: number;
}

// ── Layer & Keymap ───────────────────────────────────────────────────

export interface Layer {
  name: string;
  index: number;
  bindings: Binding[];
}

export interface Keymap {
  layers: Layer[];
  combos: Combo[];
  behaviors: Behavior[];
  mouse_config: MouseConfig;
}
