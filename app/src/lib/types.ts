// ── Shared types for the TOTEM keyboard configurator ─────────────────

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

export type Behavior = HoldTapBehavior | ModMorphBehavior | MacroBehavior;

// ── Combo ────────────────────────────────────────────────────────────

export interface Combo {
  name: string;
  positions: number[];
  binding: Binding;
  timeout_ms: number;
  layers: number[];
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
