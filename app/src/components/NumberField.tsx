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
    <div className="flex flex-col gap-1">
      <label className="text-xs text-subtext font-medium">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min ?? 0}
          onChange={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(v)) onChange(v);
          }}
          className="w-24 px-2 py-1 bg-surface rounded text-sm text-text font-mono
                 border border-overlay/50 outline-none focus:border-primary"
        />
        {suffix && <span className="text-xs text-subtext">{suffix}</span>}
      </div>
    </div>
  );
}
