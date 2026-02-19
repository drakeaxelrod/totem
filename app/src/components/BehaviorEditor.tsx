import { useState, useCallback } from "preact/hooks";
import type {
  Binding,
  HoldTapBehavior,
  ModMorphBehavior,
  MacroBehavior,
  TapDanceBehavior,
  Behavior,
} from "../lib/types.ts";

interface BehaviorEditorProps {
  behaviors: Behavior[];
  onChange: (behaviors: Behavior[]) => void;
}

// ── Flavor options ───────────────────────────────────────────────────

const HOLD_TAP_FLAVORS = [
  "balanced",
  "hold-preferred",
  "tap-preferred",
  "tap-unless-interrupted",
] as const;

// ── Helpers ──────────────────────────────────────────────────────────

function formatBinding(b: Binding): string {
  if (b.params.length === 0) return `&${b.action}`;
  return `&${b.action} ${b.params.join(" ")}`;
}

function behaviorTypeLabel(type: Behavior["type"]): string {
  switch (type) {
    case "HoldTap":
      return "Hold-Tap";
    case "ModMorph":
      return "Mod-Morph";
    case "Macro":
      return "Macro";
  }
}

function behaviorTypeColor(type: Behavior["type"]): string {
  switch (type) {
    case "HoldTap":
      return "text-[#89b4fa]";
    case "ModMorph":
      return "text-[#fab387]";
    case "Macro":
      return "text-[#f38ba8]";
  }
}

// ── Number Input ─────────────────────────────────────────────────────

function NumberField({
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
      <label class="text-sm text-subtext font-medium">{label}</label>
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
        {suffix && <span class="text-sm text-subtext">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Optional Number Input ────────────────────────────────────────────

function OptionalNumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
}) {
  const enabled = value !== null;

  return (
    <div class="flex flex-col gap-1">
      <label class="text-sm text-subtext font-medium">{label}</label>
      <div class="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            onChange((e.target as HTMLInputElement).checked ? 150 : null);
          }}
          class="accent-primary"
        />
        {enabled ? (
          <>
            <input
              type="number"
              value={value}
              min={0}
              onInput={(e) => {
                const v = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(v)) onChange(v);
              }}
              class="w-24 px-2 py-1 bg-surface rounded text-sm text-text font-mono
                     border border-overlay/50 outline-none focus:border-primary"
            />
            {suffix && <span class="text-sm text-subtext">{suffix}</span>}
          </>
        ) : (
          <span class="text-sm text-subtext italic">disabled</span>
        )}
      </div>
    </div>
  );
}

// ── HoldTap Editor ───────────────────────────────────────────────────

function HoldTapEditor({
  behavior,
  onChange,
}: {
  behavior: HoldTapBehavior;
  onChange: (b: HoldTapBehavior) => void;
}) {
  const update = <K extends keyof HoldTapBehavior>(
    key: K,
    value: HoldTapBehavior[K],
  ) => {
    onChange({ ...behavior, [key]: value });
  };

  return (
    <div class="flex flex-col gap-3">
      {/* Flavor */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Flavor</label>
        <select
          class="px-2 py-1 bg-surface rounded text-sm text-text
                 border border-overlay/50 outline-none focus:border-primary"
          value={behavior.flavor}
          onChange={(e) =>
            update("flavor", (e.target as HTMLSelectElement).value)
          }
        >
          {HOLD_TAP_FLAVORS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Timing parameters */}
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label="Tapping term"
          value={behavior.tapping_term_ms}
          onChange={(v) => update("tapping_term_ms", v)}
          suffix="ms"
        />
        <NumberField
          label="Quick tap"
          value={behavior.quick_tap_ms}
          onChange={(v) => update("quick_tap_ms", v)}
          suffix="ms"
        />
      </div>

      {/* Require prior idle */}
      <OptionalNumberField
        label="Require prior idle"
        value={behavior.require_prior_idle_ms}
        onChange={(v) => update("require_prior_idle_ms", v)}
        suffix="ms"
      />

      {/* Hold trigger on release */}
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          checked={behavior.hold_trigger_on_release}
          onChange={(e) =>
            update(
              "hold_trigger_on_release",
              (e.target as HTMLInputElement).checked,
            )
          }
          class="accent-primary"
        />
        <label class="text-sm text-subtext font-medium">
          Hold trigger on release
        </label>
      </div>

      {/* Hold trigger key positions */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">
          Hold trigger key positions
        </label>
        <input
          type="text"
          value={
            behavior.hold_trigger_key_positions
              ? behavior.hold_trigger_key_positions.join(", ")
              : ""
          }
          placeholder="e.g. 0, 1, 2, 3, 4"
          onInput={(e) => {
            const raw = (e.target as HTMLInputElement).value.trim();
            if (raw === "") {
              update("hold_trigger_key_positions", null);
            } else {
              const positions = raw
                .split(",")
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));
              update("hold_trigger_key_positions", positions);
            }
          }}
          class="px-2 py-1 bg-surface rounded text-sm text-text font-mono
                 border border-overlay/50 outline-none focus:border-primary"
        />
        <span class="text-sm text-subtext/70">
          Comma-separated position numbers, or empty for none
        </span>
      </div>

      {/* Hold / Tap bindings (read-only info) */}
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-subtext font-medium">Hold binding</label>
          <code class="px-2 py-1 bg-surface rounded text-sm text-text font-mono">
            {behavior.hold_bindings}
          </code>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm text-subtext font-medium">Tap binding</label>
          <code class="px-2 py-1 bg-surface rounded text-sm text-text font-mono">
            {behavior.tap_bindings}
          </code>
        </div>
      </div>
    </div>
  );
}

// ── ModMorph Editor ──────────────────────────────────────────────────

function ModMorphEditor({ behavior }: { behavior: ModMorphBehavior }) {
  return (
    <div class="flex flex-col gap-3">
      {/* Normal binding */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Normal binding</label>
        <code class="px-2 py-1 bg-surface rounded text-sm text-text font-mono">
          {formatBinding(behavior.normal)}
        </code>
      </div>

      {/* Shifted binding */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Shifted binding</label>
        <code class="px-2 py-1 bg-surface rounded text-sm text-text font-mono">
          {formatBinding(behavior.shifted)}
        </code>
      </div>

      {/* Mods */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Modifier mask</label>
        <code class="px-2 py-1 bg-surface rounded text-sm text-text font-mono">
          {behavior.mods}
        </code>
      </div>
    </div>
  );
}

// ── Macro Editor ─────────────────────────────────────────────────────

function MacroEditor({
  behavior,
  onChange,
}: {
  behavior: MacroBehavior;
  onChange: (b: MacroBehavior) => void;
}) {
  const update = <K extends keyof MacroBehavior>(
    key: K,
    value: MacroBehavior[K],
  ) => {
    onChange({ ...behavior, [key]: value });
  };

  return (
    <div class="flex flex-col gap-3">
      {/* Timing */}
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label="Wait"
          value={behavior.wait_ms}
          onChange={(v) => update("wait_ms", v)}
          suffix="ms"
        />
        <NumberField
          label="Tap"
          value={behavior.tap_ms}
          onChange={(v) => update("tap_ms", v)}
          suffix="ms"
        />
      </div>

      {/* Binding sequence */}
      <div class="flex flex-col gap-1">
        <label class="text-sm text-subtext font-medium">Binding sequence</label>
        <div class="flex flex-col gap-0.5">
          {behavior.bindings.map((b, i) => (
            <code
              key={i}
              class="px-2 py-0.5 bg-surface rounded text-sm text-text font-mono"
            >
              {formatBinding(b)}
            </code>
          ))}
          {behavior.bindings.length === 0 && (
            <span class="text-sm text-subtext italic">No bindings</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Behavior Card ────────────────────────────────────────────────────

function BehaviorCard({
  behavior,
  expanded,
  onToggle,
  onChange,
}: {
  behavior: Behavior;
  expanded: boolean;
  onToggle: () => void;
  onChange: (b: Behavior) => void;
}) {
  return (
    <div class="border border-overlay/30 rounded-lg overflow-hidden">
      {/* Card header */}
      <button
        class="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-overlay/20
               transition-colors text-left"
        onClick={onToggle}
      >
        <span
          class={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          &#9654;
        </span>
        <span class="text-sm font-medium text-text">{behavior.name}</span>
        <span class={`text-sm font-medium ${behaviorTypeColor(behavior.type)}`}>
          {behaviorTypeLabel(behavior.type)}
        </span>
        {behavior.label && (
          <span class="text-sm text-subtext ml-auto">{behavior.label}</span>
        )}
      </button>

      {/* Card body */}
      {expanded && (
        <div class="px-3 py-3 bg-surface-alt border-t border-overlay/20">
          {behavior.type === "HoldTap" && (
            <HoldTapEditor
              behavior={behavior}
              onChange={(b) => onChange(b)}
            />
          )}
          {behavior.type === "ModMorph" && (
            <ModMorphEditor behavior={behavior} />
          )}
          {behavior.type === "Macro" && (
            <MacroEditor
              behavior={behavior}
              onChange={(b) => onChange(b)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function BehaviorEditor({ behaviors, onChange }: BehaviorEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = useCallback(
    (index: number) => {
      setExpandedIndex(expandedIndex === index ? null : index);
    },
    [expandedIndex],
  );

  const handleBehaviorChange = useCallback(
    (index: number, updated: Behavior) => {
      const next = behaviors.map((b, i) => (i === index ? updated : b));
      onChange(next);
    },
    [behaviors, onChange],
  );

  return (
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {behaviors.map((b, i) => (
          <BehaviorCard
            key={b.name}
            behavior={b}
            expanded={expandedIndex === i}
            onToggle={() => handleToggle(i)}
            onChange={(updated) => handleBehaviorChange(i, updated)}
          />
        ))}
        {behaviors.length === 0 && (
          <div class="text-sm text-subtext italic text-center py-8">
            No behaviors defined
          </div>
        )}
      </div>
    </div>
  );
}
