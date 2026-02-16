import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";

interface BatteryLevels {
  left: number | null;
  right: number | null;
}

function batteryColor(level: number | null): string {
  if (level === null) return "text-slate-400 dark:text-slate-600";
  if (level >= 50) return "text-emerald-500 dark:text-emerald-400";
  if (level >= 20) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function batteryFill(level: number | null): number {
  if (level === null) return 0;
  return Math.max(0, Math.min(100, level)) / 100;
}

const BatteryIcon: FunctionComponent<{
  label: string;
  level: number | null;
}> = ({ label, level }) => {
  const fill = batteryFill(level);
  const color = batteryColor(level);
  const text = level !== null ? `${level}%` : "--";

  return (
    <div class={`flex items-center gap-0.5 ${color}`} title={`${label}: ${text}`}>
      <span class="text-[9px] font-bold opacity-60">{label}</span>
      <svg viewBox="0 0 20 10" class="w-4 h-2.5" fill="none">
        {/* Battery outline */}
        <rect
          x="0.5"
          y="0.5"
          width="16"
          height="9"
          rx="1.5"
          stroke="currentColor"
          stroke-width="1"
        />
        {/* Terminal nub */}
        <rect x="17" y="2.5" width="2.5" height="5" rx="0.75" fill="currentColor" opacity="0.4" />
        {/* Fill level */}
        {fill > 0 && (
          <rect
            x="2"
            y="2"
            width={Math.round(13 * fill)}
            height="6"
            rx="0.5"
            fill="currentColor"
          />
        )}
      </svg>
      <span class="text-[9px] font-semibold tabular-nums">{text}</span>
    </div>
  );
};

const BatteryIndicator: FunctionComponent = () => {
  const [battery, setBattery] = useState<BatteryLevels>({
    left: null,
    right: null,
  });

  useEffect(() => {
    const poll = async () => {
      try {
        const levels = await invoke<BatteryLevels>("get_battery_levels");
        setBattery(levels);
      } catch {
        setBattery({ left: null, right: null });
      }
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  // Don't render if both sides are disconnected
  if (battery.left === null && battery.right === null) return null;

  return (
    <div class="flex items-center gap-2">
      <BatteryIcon label="L" level={battery.left} />
      <BatteryIcon label="R" level={battery.right} />
    </div>
  );
};

export default BatteryIndicator;
