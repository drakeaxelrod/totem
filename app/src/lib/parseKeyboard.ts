import { parse } from "smol-toml";

export interface KeyboardConfig {
  layers: string[][][]; // [layerIndex][row][col]
  layerCount: number;
  rows: number;
  cols: number;
  morses: { tap: string; hold: string; hold_after_tap?: string }[];
}

export function parseKeyboardToml(raw: string): KeyboardConfig {
  const config = parse(raw);

  const layout = config.layout as {
    rows: number;
    cols: number;
    layers: number;
    keymap: string[][][];
  };

  const morses: KeyboardConfig["morses"] = [];
  const behavior = config.behavior as
    | { morse?: { morses?: { tap: string; hold: string; hold_after_tap?: string }[] } }
    | undefined;
  if (behavior?.morse?.morses) {
    morses.push(...behavior.morse.morses);
  }

  return {
    layers: layout.keymap,
    layerCount: layout.layers,
    rows: layout.rows,
    cols: layout.cols,
    morses,
  };
}
