import { useState, useMemo, useCallback, useEffect } from "preact/hooks";
import {
  KEYCODES,
  CATEGORY_LABELS,
  ALL_KEYCODES,
  ACTIONS,
  ACTION_LABELS,
  NO_PARAM_ACTIONS,
  HOLD_TAP_ACTIONS,
} from "../lib/keycodes.ts";
import type { KeycodeCategory, Action } from "../lib/keycodes.ts";
import type { Binding } from "../lib/types.ts";

interface BindingPickerProps {
  binding: Binding;
  position: number;
  layerNames: string[];
  onSave: (binding: Binding) => void;
  onClose: () => void;
}

// ── Pill Select (replaces native <select> — broken in WebKitGTK) ─────

function PillSelect({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div class="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          class={`px-3 py-1.5 rounded text-sm transition-colors
            ${o.value === value
              ? "bg-primary text-surface"
              : "bg-surface text-text hover:bg-overlay/50"}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Keycode Grid ──────────────────────────────────────────────────────

function KeycodeGrid({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (code: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<KeycodeCategory | "all">("all");

  const filtered = useMemo(() => {
    const query = search.toUpperCase().trim();
    if (activeCategory === "all") {
      return query ? ALL_KEYCODES.filter((k) => k.includes(query)) : ALL_KEYCODES;
    }
    const codes = KEYCODES[activeCategory] as readonly string[];
    return query ? codes.filter((k) => k.includes(query)) : [...codes];
  }, [search, activeCategory]);

  return (
    <div class="flex flex-col gap-2">
      {/* Search */}
      <input
        type="text"
        placeholder="Search keycodes..."
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        style="background:#1e1e2e;color:#cdd6f4"
        class="px-3 py-1.5 rounded text-sm text-text
               border border-overlay/50 outline-none focus:border-primary
               placeholder:text-subtext/50"
      />
      {/* Category tabs */}
      <div class="flex flex-wrap gap-1">
        <CategoryTab
          label="All"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {(Object.keys(KEYCODES) as KeycodeCategory[]).map((cat) => (
          <CategoryTab
            key={cat}
            label={CATEGORY_LABELS[cat]}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>
      {/* Keycode buttons — pure flex-wrap, no inline styles (WebKitGTK compat) */}
      <div class="flex flex-wrap gap-1">
        {filtered.map((code) => (
          <button
            key={code}
            class={`px-2 py-1.5 rounded text-sm font-mono text-center transition-colors
              ${code === selected
                ? "bg-primary text-surface"
                : "bg-surface text-text hover:bg-overlay/50"}`}
            onClick={() => onSelect(code)}
          >
            {code}
          </button>
        ))}
        {filtered.length === 0 && (
          <div class="text-subtext text-sm py-4">
            No matching keycodes
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      class={`px-2 py-0.5 rounded text-xs transition-colors
        ${active
          ? "bg-primary/20 text-primary"
          : "text-subtext hover:text-text hover:bg-overlay/30"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ── Constants ─────────────────────────────────────────────────────────

const MODIFIER_OPTIONS = [
  { label: "LSHFT", value: "LSHFT" },
  { label: "RSHFT", value: "RSHFT" },
  { label: "LCTRL", value: "LCTRL" },
  { label: "RCTRL", value: "RCTRL" },
  { label: "LALT", value: "LALT" },
  { label: "RALT", value: "RALT" },
  { label: "LGUI", value: "LGUI" },
  { label: "RGUI", value: "RGUI" },
];

// ── BT Selector ───────────────────────────────────────────────────────

function BtSelector({
  params,
  onChange,
}: {
  params: string[];
  onChange: (params: string[]) => void;
}) {
  return (
    <div class="flex flex-wrap gap-2">
      {[0, 1, 2, 3, 4].map((n) => (
        <button
          key={n}
          class={`px-3 py-1.5 rounded text-sm transition-colors
            ${params[0] === "BT_SEL" && params[1] === String(n)
              ? "bg-primary text-surface"
              : "bg-surface text-text hover:bg-overlay/50"}`}
          onClick={() => onChange(["BT_SEL", String(n)])}
        >
          BT {n}
        </button>
      ))}
      <button
        class={`px-3 py-1.5 rounded text-sm transition-colors
          ${params[0] === "BT_CLR"
            ? "bg-primary text-surface"
            : "bg-surface text-text hover:bg-overlay/50"}`}
        onClick={() => onChange(["BT_CLR"])}
      >
        BT CLR
      </button>
      <button
        class={`px-3 py-1.5 rounded text-sm transition-colors
          ${params[0] === "BT_CLR_ALL"
            ? "bg-primary text-surface"
            : "bg-surface text-text hover:bg-overlay/50"}`}
        onClick={() => onChange(["BT_CLR_ALL"])}
      >
        CLR ALL
      </button>
      <button
        class={`px-3 py-1.5 rounded text-sm transition-colors
          ${params[0] === "BT_NXT"
            ? "bg-primary text-surface"
            : "bg-surface text-text hover:bg-overlay/50"}`}
        onClick={() => onChange(["BT_NXT"])}
      >
        BT NXT
      </button>
      <button
        class={`px-3 py-1.5 rounded text-sm transition-colors
          ${params[0] === "BT_PRV"
            ? "bg-primary text-surface"
            : "bg-surface text-text hover:bg-overlay/50"}`}
        onClick={() => onChange(["BT_PRV"])}
      >
        BT PRV
      </button>
      <button
        class={`px-3 py-1.5 rounded text-sm transition-colors
          ${params[0] === "BT_DISC"
            ? "bg-primary text-surface"
            : "bg-surface text-text hover:bg-overlay/50"}`}
        onClick={() => onChange(["BT_DISC", params[0] === "BT_DISC" ? (params[1] ?? "0") : "0"])}
      >
        BT DISC
      </button>
      {params[0] === "BT_DISC" && (
        <div class="flex gap-1 w-full">
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              class={`px-2.5 py-1 rounded text-xs transition-colors
                ${params[1] === String(n)
                  ? "bg-primary text-surface"
                  : "bg-surface text-text hover:bg-overlay/50"}`}
              onClick={() => onChange(["BT_DISC", String(n)])}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────

function bindingPreview(action: string, params: string[]): string {
  if (params.length === 0) return `&${action}`;
  return `&${action} ${params.join(" ")}`;
}

// ── Main Component ────────────────────────────────────────────────────

export function BindingPicker({ binding, position, layerNames, onSave, onClose }: BindingPickerProps) {
  const [action, setAction] = useState<Action>(binding.action as Action);
  const [params, setParams] = useState<string[]>([...binding.params]);

  // Reset params when action changes
  const handleActionChange = useCallback((newAction: Action) => {
    setAction(newAction);
    if (NO_PARAM_ACTIONS.has(newAction)) {
      setParams([]);
    } else if (newAction === "kp") {
      setParams([params[params.length - 1] ?? "A"]);
    } else if (HOLD_TAP_ACTIONS.has(newAction)) {
      setParams([params[0] ?? "LSHFT", params[1] ?? params[params.length - 1] ?? "A"]);
    } else if (newAction === "lt_th" || newAction === "lt") {
      setParams([params[0] ?? "0", params[1] ?? params[params.length - 1] ?? "A"]);
    } else if (newAction === "tog" || newAction === "mo" || newAction === "sl" || newAction === "to") {
      setParams([params[0] ?? "0"]);
    } else if (newAction === "kt") {
      setParams([params[params.length - 1] ?? "A"]);
    } else if (newAction === "bt") {
      setParams(["BT_SEL", "0"]);
    } else if (newAction === "out") {
      setParams(["OUT_TOG"]);
    } else if (newAction === "mmv" || newAction === "msc") {
      setParams([params[0] ?? "MOVE_UP"]);
    } else if (newAction === "mkp") {
      setParams([params[0] ?? "LCLK"]);
    } else if (newAction === "sk") {
      setParams([params[0] ?? "LSHFT"]);
    } else if (newAction === "ext_power") {
      setParams(["EP_TOG"]);
    } else {
      setParams([]);
    }
  }, [params]);

  const handleSave = useCallback(() => {
    onSave({ action, params });
  }, [action, params, onSave]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
    >
      {/* Modal — sized via top/bottom/left/right (WebKitGTK: width/max-width broken) */}
      <div
        class="fixed z-[51] bg-surface-alt rounded-lg shadow-2xl flex flex-col"
        style="top:20vh;bottom:20vh;left:30vw;right:30vw"
      >
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-overlay/30">
          <h2 class="text-sm font-medium text-text">
            Edit Key <span class="text-subtext">#{position}</span>
          </h2>
          <button
            class="text-subtext hover:text-text text-2xl leading-none px-1"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Action selector */}
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-subtext font-medium">Action</label>
            <div class="flex flex-wrap gap-1">
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  class={`px-2 py-1 rounded text-xs transition-colors
                    ${a === action
                      ? "bg-primary text-surface"
                      : "bg-surface text-subtext hover:text-text hover:bg-overlay/30"}`}
                  onClick={() => handleActionChange(a)}
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          {/* Params UI based on action type */}
          <ActionParams
            action={action}
            params={params}
            setParams={setParams}
            layerNames={layerNames}
          />
        </div>

        {/* Footer: preview + buttons */}
        <div class="px-4 py-3 border-t border-overlay/30 flex items-center justify-between gap-3">
          <code class="text-xs text-subtext font-mono truncate">
            {bindingPreview(action, params)}
          </code>
          <div class="flex gap-2 shrink-0">
            <button
              class="px-4 py-1.5 rounded text-sm text-subtext hover:text-text
                     hover:bg-overlay/30 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              class="px-4 py-1.5 rounded text-sm bg-primary text-surface
                     font-medium hover:brightness-110 transition-all"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Params panel per action type ──────────────────────────────────────

function ActionParams({
  action,
  params,
  setParams,
  layerNames,
}: {
  action: Action;
  params: string[];
  setParams: (p: string[]) => void;
  layerNames: string[];
}) {
  const layerOptions = layerNames.map((name, i) => ({ label: `${name} (${i})`, value: String(i) }));

  // No-param actions
  if (NO_PARAM_ACTIONS.has(action)) {
    return (
      <div class="text-sm text-subtext italic">
        No additional parameters needed.
      </div>
    );
  }

  // Simple keypress
  if (action === "kp" || action === "kt") {
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Keycode</label>
        <KeycodeGrid
          selected={params[0] ?? ""}
          onSelect={(code) => setParams([code])}
        />
      </div>
    );
  }

  // Hold-tap: modifier + keycode
  if (HOLD_TAP_ACTIONS.has(action)) {
    return (
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-subtext font-medium">Hold (Modifier)</label>
          <PillSelect
            options={MODIFIER_OPTIONS}
            value={params[0] ?? "LSHFT"}
            onChange={(v) => setParams([v, params[1] ?? "A"])}
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-subtext font-medium">Tap (Keycode)</label>
          <KeycodeGrid
            selected={params[1] ?? ""}
            onSelect={(code) => setParams([params[0] ?? "LSHFT", code])}
          />
        </div>
      </div>
    );
  }

  // Layer-tap: layer + keycode
  if (action === "lt_th" || action === "lt") {
    return (
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-subtext font-medium">Hold (Layer)</label>
          <PillSelect
            options={layerOptions}
            value={params[0] ?? "0"}
            onChange={(v) => setParams([v, params[1] ?? "A"])}
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-subtext font-medium">Tap (Keycode)</label>
          <KeycodeGrid
            selected={params[1] ?? ""}
            onSelect={(code) => setParams([params[0] ?? "0", code])}
          />
        </div>
      </div>
    );
  }

  // Layer toggle / momentary layer
  if (action === "tog" || action === "mo" || action === "sl" || action === "to") {
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Layer</label>
        <PillSelect
          options={layerOptions}
          value={params[0] ?? "0"}
          onChange={(v) => setParams([v])}
        />
      </div>
    );
  }

  // Sticky key
  if (action === "sk") {
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Modifier</label>
        <PillSelect
          options={MODIFIER_OPTIONS}
          value={params[0] ?? "LSHFT"}
          onChange={(v) => setParams([v])}
        />
      </div>
    );
  }

  // Bluetooth
  if (action === "bt") {
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Bluetooth Action</label>
        <BtSelector params={params} onChange={setParams} />
      </div>
    );
  }

  // Output toggle
  if (action === "out") {
    return (
      <div class="text-sm text-subtext italic">
        Toggles between USB and Bluetooth output.
      </div>
    );
  }

  // External power
  if (action === "ext_power") {
    const options = [
      { label: "EP_ON", value: "EP_ON" },
      { label: "EP_OFF", value: "EP_OFF" },
      { label: "EP_TOG", value: "EP_TOG" },
    ];
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Power Action</label>
        <PillSelect
          options={options}
          value={params[0] ?? "EP_TOG"}
          onChange={(v) => setParams([v])}
        />
      </div>
    );
  }

  // Mouse move / scroll
  if (action === "mmv" || action === "msc") {
    const options = (action === "mmv"
      ? ["MOVE_UP", "MOVE_DOWN", "MOVE_LEFT", "MOVE_RIGHT"]
      : ["SCRL_UP", "SCRL_DOWN", "SCRL_LEFT", "SCRL_RIGHT"]
    ).map((o) => ({ label: o, value: o }));
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Direction</label>
        <PillSelect
          options={options}
          value={params[0] ?? options[0].value}
          onChange={(v) => setParams([v])}
        />
      </div>
    );
  }

  // Mouse button
  if (action === "mkp") {
    const options = ["LCLK", "RCLK", "MCLK", "MB4", "MB5"].map((b) => ({ label: b, value: b }));
    return (
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-subtext font-medium">Mouse Button</label>
        <PillSelect
          options={options}
          value={params[0] ?? "LCLK"}
          onChange={(v) => setParams([v])}
        />
      </div>
    );
  }

  return null;
}
