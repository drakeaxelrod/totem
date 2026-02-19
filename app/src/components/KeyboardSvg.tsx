import type { KeyPosition } from "../lib/layout.ts";
import { LAYOUT } from "../lib/layout.ts";
import { getKeyLabel } from "../lib/keyLabels.ts";

interface KeyboardSvgProps {
  layer: {
    name: string;
    bindings: Array<{ action: string; params: string[] }>;
  };
  onKeyClick?: (pos: number) => void;
  highlightedKeys?: Set<number>;
}

const ACTION_COLORS: Record<string, string> = {
  kp: "#45475a",
  hml: "#89b4fa",
  hmr: "#89b4fa",
  lt_th: "#a6e3a1",
  comma_morph: "#fab387",
  dot_morph: "#fab387",
  mt: "#89b4fa",
  trans: "#313244",
  none: "#181825",
  bt: "#74c7ec",
  out: "#74c7ec",
  mmv: "#f9e2af",
  msc: "#f9e2af",
  mkp: "#f9e2af",
  tog: "#cba6f7",
  caps_word: "#f38ba8",
  studio_unlock: "#f38ba8",
  fat_arrow: "#f38ba8",
  sk: "#cba6f7",
  mo: "#a6e3a1",
  key_repeat: "#f5c2e7",
  bootloader: "#f38ba8",
  sys_reset: "#f38ba8",
  ext_power: "#74c7ec",
};

function getKeyColor(action: string): string {
  return ACTION_COLORS[action] ?? "#45475a";
}

// Dark backgrounds get light text, bright backgrounds get dark text
const DARK_BG_ACTIONS = new Set(["kp", "trans", "none"]);

function getTextColor(action: string): { main: string; sub: string } {
  if (DARK_BG_ACTIONS.has(action)) {
    return { main: "#cdd6f4", sub: "#a6adc8" };
  }
  return { main: "#1e1e2e", sub: "#313244" };
}

const PADDING = 2;
const VIEWBOX = `${-PADDING} ${-PADDING} ${150.3 + PADDING * 2} ${53.3 + PADDING * 2}`;

function Key({
  keyPos,
  binding,
  onClick,
}: {
  keyPos: KeyPosition;
  binding: { action: string; params: string[] };
  onClick?: () => void;
}) {
  const { x, y, w, h, rot, rx, ry } = keyPos;
  const color = getKeyColor(binding.action);
  const textColor = getTextColor(binding.action);
  const label = getKeyLabel(binding);
  const isTransparent = binding.action === "trans";
  const hasRotation = rot !== 0;
  const transform = hasRotation ? `rotate(${rot}, ${rx}, ${ry})` : undefined;

  // Gap between keys: shrink the rect slightly
  const gap = 0.4;
  const rectX = x + gap;
  const rectY = y + gap;
  const rectW = w - gap * 2;
  const rectH = h - gap * 2;

  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <g
      transform={transform}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      class="key-group"
    >
      <rect
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        rx={0.8}
        ry={0.8}
        fill={color}
        stroke="#585b70"
        stroke-width={0.2}
        opacity={isTransparent ? 0.4 : 1}
      />
      {label.top ? (
        <>
          <text
            x={cx}
            y={cy - 1.4}
            text-anchor="middle"
            dominant-baseline="central"
            fill={textColor.sub}
            font-size="2.4"
            font-family="system-ui, sans-serif"
          >
            {label.top}
          </text>
          <text
            x={cx}
            y={cy + 2.2}
            text-anchor="middle"
            dominant-baseline="central"
            fill={textColor.main}
            font-size="3"
            font-family="system-ui, sans-serif"
            font-weight="500"
          >
            {label.main}
          </text>
        </>
      ) : (
        <text
          x={cx}
          y={cy}
          text-anchor="middle"
          dominant-baseline="central"
          fill={isTransparent ? "#585b70" : textColor.main}
          font-size={label.main.length > 3 ? "2.4" : "3"}
          font-family="system-ui, sans-serif"
          font-weight="500"
        >
          {label.main}
        </text>
      )}
    </g>
  );
}

export function KeyboardSvg({ layer, onKeyClick, highlightedKeys }: KeyboardSvgProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      class="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        .key-group:hover rect {
          filter: brightness(1.2);
        }
        .key-highlight rect {
          stroke: #f9e2af;
          stroke-width: 0.5;
        }
      `}</style>
      {LAYOUT.map((keyPos) => {
        const binding = layer.bindings[keyPos.index];
        if (!binding) return null;
        const isHighlighted = highlightedKeys?.has(keyPos.index) ?? false;
        return (
          <g key={keyPos.index} class={isHighlighted ? "key-highlight" : ""}>
            <Key
              keyPos={keyPos}
              binding={binding}
              onClick={onKeyClick ? () => onKeyClick(keyPos.index) : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
