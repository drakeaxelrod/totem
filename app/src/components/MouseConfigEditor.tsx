import type { MouseConfig } from "../lib/types.ts";
import { NumberField } from "./NumberField.tsx";

interface MouseConfigEditorProps {
  config: MouseConfig;
  onChange: (config: MouseConfig) => void;
}

export function MouseConfigEditor({ config, onChange }: MouseConfigEditorProps) {
  const update = <K extends keyof MouseConfig>(key: K, value: MouseConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div class="flex flex-col gap-4 p-3">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-semibold text-text tracking-wide uppercase">Move</span>
        <div class="h-px bg-overlay/30" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label="Default speed"
          value={config.move_speed}
          onChange={(v) => update("move_speed", v)}
        />
        <NumberField
          label="Time to max"
          value={config.move_time_to_max_ms}
          onChange={(v) => update("move_time_to_max_ms", v)}
          suffix="ms"
        />
        <NumberField
          label="Accel exponent"
          value={config.move_accel_exponent}
          onChange={(v) => update("move_accel_exponent", v)}
        />
      </div>

      <div class="flex flex-col gap-1 mt-2">
        <span class="text-xs font-semibold text-text tracking-wide uppercase">Scroll</span>
        <div class="h-px bg-overlay/30" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label="Default speed"
          value={config.scroll_speed}
          onChange={(v) => update("scroll_speed", v)}
        />
        <NumberField
          label="Time to max"
          value={config.scroll_time_to_max_ms}
          onChange={(v) => update("scroll_time_to_max_ms", v)}
          suffix="ms"
        />
        <NumberField
          label="Accel exponent"
          value={config.scroll_accel_exponent}
          onChange={(v) => update("scroll_accel_exponent", v)}
        />
      </div>
    </div>
  );
}
