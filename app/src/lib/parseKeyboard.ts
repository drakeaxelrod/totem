export interface ComboConfig {
  actions: string[]; // raw action strings (e.g. "L", "MT(R,LAlt,HRM)")
  output: string; // raw output string (e.g. "WM(Kc2, LShift)")
}

export interface KeyboardConfig {
  layers: string[][][]; // [layerIndex][row][col]
  layerCount: number;
  rows: number;
  cols: number;
  morses: { tap: string; hold: string; hold_after_tap?: string }[];
  combos: ComboConfig[];
}

/** Extract keyboard config from a pre-parsed TOML object (parsed at build time by vite-plugin-toml) */
export function parseKeyboardConfig(config: Record<string, unknown>): KeyboardConfig {
  const layout = config.layout as {
    rows: number;
    cols: number;
    layers: number;
    keymap: string[][][];
  };

  const morses: KeyboardConfig["morses"] = [];
  const behavior = config.behavior as
    | {
        morse?: { morses?: { tap: string; hold: string; hold_after_tap?: string }[] };
        combo?: { combos?: { actions: string[]; output: string }[] };
      }
    | undefined;
  if (behavior?.morse?.morses) {
    morses.push(...behavior.morse.morses);
  }

  const combos: ComboConfig[] = (behavior?.combo?.combos ?? []).map((c) => ({
    actions: c.actions,
    output: c.output,
  }));

  return {
    layers: layout.keymap,
    layerCount: layout.layers,
    rows: layout.rows,
    cols: layout.cols,
    morses,
    combos,
  };
}
