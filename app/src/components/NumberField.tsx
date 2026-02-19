export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
}) {
  return (
    <div class="flex flex-col gap-1">
      <label class="text-xs text-subtext font-medium">{label}</label>
      <div class="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min ?? 0}
          onInput={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(v)) onChange(v);
          }}
          class="w-24 px-2 py-1 bg-surface rounded text-sm text-text font-mono
                 border border-overlay/50 outline-none focus:border-primary"
        />
        {suffix && <span class="text-xs text-subtext">{suffix}</span>}
      </div>
    </div>
  );
}
