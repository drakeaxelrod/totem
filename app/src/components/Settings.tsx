import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { KeymapSource } from "../App";

export interface AppSettings {
  darkMode: boolean;
  transparentBg: boolean;
  showTitlebar: boolean;
  keymapSource: KeymapSource;
}

interface SettingsProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  position: { x: number; y: number };
  onClose: () => void;
  vialConnected: boolean;
}

const Toggle: FunctionComponent<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label class="flex items-center justify-between py-2 cursor-pointer">
    <span class="text-[13px] font-medium text-slate-700 dark:text-slate-200">
      {label}
    </span>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      class={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer ${
        checked ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        class={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  </label>
);

const SourceButton: FunctionComponent<{
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    class={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors ${
      active
        ? "bg-blue-500 text-white"
        : disabled
          ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
    }`}
  >
    {label}
  </button>
);

const Settings: FunctionComponent<SettingsProps> = ({
  settings,
  onChange,
  position,
  onClose,
  vialConnected,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) el.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) el.style.top = `${vh - rect.height - 8}px`;
  }, [position]);

  return (
    <>
      <div class="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        ref={ref}
        class="fixed z-50 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl px-4 py-1.5"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
      <Toggle
        label="Dark mode"
        checked={settings.darkMode}
        onChange={(darkMode) => onChange({ ...settings, darkMode })}
      />
      <div class="border-t border-slate-100 dark:border-slate-700/50" />
      <Toggle
        label="Transparent"
        checked={settings.transparentBg}
        onChange={(transparentBg) => onChange({ ...settings, transparentBg })}
      />
      <div class="border-t border-slate-100 dark:border-slate-700/50" />
      <Toggle
        label="Titlebar"
        checked={settings.showTitlebar}
        onChange={(showTitlebar) => onChange({ ...settings, showTitlebar })}
      />
      <div class="border-t border-slate-100 dark:border-slate-700/50" />
      <div class="py-2">
        <span class="text-[13px] font-medium text-slate-700 dark:text-slate-200">
          Keymap source
        </span>
        <div class="flex gap-1 mt-1.5">
          <SourceButton
            label="TOML"
            active={settings.keymapSource === "toml"}
            onClick={() => onChange({ ...settings, keymapSource: "toml" })}
          />
          <SourceButton
            label="Vial (USB)"
            active={settings.keymapSource === "vial"}
            disabled={!vialConnected}
            onClick={() => {
              if (vialConnected) onChange({ ...settings, keymapSource: "vial" });
            }}
          />
        </div>
        {!vialConnected && settings.keymapSource === "toml" && (
          <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
            Connect keyboard via USB for Vial
          </p>
        )}
      </div>
    </div>
    </>
  );
};

export default Settings;
