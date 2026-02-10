import type { FunctionComponent } from "preact";
import type { KeyLabel } from "../lib/keyLabels";

interface KeyboardSvgProps {
  keys: KeyLabel[];
  darkMode?: boolean;
}

interface KeyGroupProps {
  transform: string;
  keypos: number;
  label: KeyLabel;
  isTransKey?: boolean;
}

function tapSizeClass(text: string, hasHold: boolean): string {
  const len = text.length;
  if (len <= 1) return "";
  if (len <= 2) return hasHold ? " sm" : "";
  if (len <= 4) return " sm";
  return " xs";
}

const KeyGroup: FunctionComponent<KeyGroupProps> = ({
  transform,
  keypos,
  label,
  isTransKey,
}) => {
  const rectClass = `key${isTransKey ? " trans" : ""}`;
  const hasHold = !!label.hold;
  const sizeClass = tapSizeClass(label.tap, hasHold);
  const tapClass = `key tap${sizeClass}${label.isTransparent ? " trans" : ""}`;
  const tapY = hasHold ? -6 : 0;

  return (
    <g transform={transform} class={`key keypos-${keypos}`}>
      <rect rx="6" ry="6" x="-28" y="-26" width="55" height="52" class={rectClass} />
      <text x="0" y={tapY} class={tapClass}>
        {label.tap}
      </text>
      {hasHold && (
        <text x="0" y="12" class="key hold">
          {label.hold}
        </text>
      )}
    </g>
  );
};

// Key position data extracted from blank.svg
const KEY_POSITIONS: {
  transform: string;
  keypos: number;
  isTransKey?: boolean;
}[] = [
  // Row 0: top
  { transform: "translate(78, 113) rotate(-10.0)", keypos: 0 },
  { transform: "translate(144, 62) rotate(-4.0)", keypos: 1 },
  { transform: "translate(212, 28)", keypos: 2 },
  { transform: "translate(271, 56)", keypos: 3 },
  { transform: "translate(330, 65)", keypos: 4 },
  { transform: "translate(520, 65)", keypos: 5 },
  { transform: "translate(580, 56)", keypos: 6 },
  { transform: "translate(639, 28)", keypos: 7 },
  { transform: "translate(706, 62) rotate(4.0)", keypos: 8 },
  { transform: "translate(773, 113) rotate(10.0)", keypos: 9 },
  // Row 1: home
  { transform: "translate(87, 168) rotate(-10.0)", keypos: 10 },
  { transform: "translate(148, 118) rotate(-4.0)", keypos: 11 },
  { transform: "translate(212, 84)", keypos: 12 },
  { transform: "translate(271, 112)", keypos: 13 },
  { transform: "translate(330, 121)", keypos: 14 },
  { transform: "translate(520, 121)", keypos: 15 },
  { transform: "translate(580, 112)", keypos: 16 },
  { transform: "translate(639, 84)", keypos: 17 },
  { transform: "translate(703, 118) rotate(4.0)", keypos: 18 },
  { transform: "translate(764, 168) rotate(10.0)", keypos: 19 },
  // Row 2: bottom (with pinky extras)
  { transform: "translate(34, 209) rotate(-10.0)", keypos: 20 },
  { transform: "translate(97, 223) rotate(-10.0)", keypos: 21 },
  { transform: "translate(152, 174) rotate(-4.0)", keypos: 22 },
  { transform: "translate(212, 140)", keypos: 23 },
  { transform: "translate(271, 168)", keypos: 24 },
  { transform: "translate(330, 177)", keypos: 25 },
  { transform: "translate(520, 177)", keypos: 26 },
  { transform: "translate(580, 168)", keypos: 27 },
  { transform: "translate(639, 140)", keypos: 28 },
  { transform: "translate(699, 174) rotate(4.0)", keypos: 29 },
  { transform: "translate(754, 223) rotate(10.0)", keypos: 30 },
  { transform: "translate(817, 209) rotate(10.0)", keypos: 31 },
  // Row 3: thumbs
  { transform: "translate(255, 236)", keypos: 32, isTransKey: true },
  { transform: "translate(320, 245) rotate(15.0)", keypos: 33 },
  { transform: "translate(381, 270) rotate(30.0)", keypos: 34 },
  { transform: "translate(470, 270) rotate(-30.0)", keypos: 35 },
  { transform: "translate(531, 245) rotate(-15.0)", keypos: 36 },
  { transform: "translate(596, 236)", keypos: 37, isTransKey: true },
];

const KeyboardSvg: FunctionComponent<KeyboardSvgProps> = ({ keys, darkMode }) => {
  // Light: crisp white keys, strong contrast
  // Dark: subtle raised keys from dark background
  const grad = darkMode
    ? { start: "#293548", end: "#1e293b" }
    : { start: "#ffffff", end: "#f8fafc" };
  const combo = darkMode
    ? { start: "#1e3a5f", end: "#172554" }
    : { start: "#dbeafe", end: "#bfdbfe" };
  const held = darkMode
    ? { start: "#5f1e1e", end: "#4a1616" }
    : { start: "#fee2e2", end: "#fecaca" };
  const textFill = darkMode ? "#e2e8f0" : "#1e293b";
  const stroke = darkMode ? "#3e4c5e" : "#c8d1dc";
  const holdFill = darkMode ? "#94a3b8" : "#64748b";
  const transFill = darkMode ? "#4b5e73" : "#a0aec0";
  const shadow = darkMode
    ? "drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
    : "drop-shadow(0 2px 6px rgba(0,0,0,0.12)) drop-shadow(0 1px 2px rgba(0,0,0,0.06))";

  return (
    <svg
      viewBox="-5 30 900 345"
      class="keymap pointer-events-none select-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id="keyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color={grad.start} stop-opacity="1" />
          <stop offset="100%" stop-color={grad.end} stop-opacity="1" />
        </linearGradient>
        <linearGradient id="keyGradientCombo" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color={combo.start} stop-opacity="1" />
          <stop offset="100%" stop-color={combo.end} stop-opacity="1" />
        </linearGradient>
        <linearGradient id="keyGradientHeld" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color={held.start} stop-opacity="1" />
          <stop offset="100%" stop-color={held.end} stop-opacity="1" />
        </linearGradient>
      </defs>
      <style>{`
        svg.keymap {
          font-family: 'Lilex Nerd Font', 'LilexNerdFont', SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
          font-size: 12px;
          font-kerning: normal;
          text-rendering: optimizeLegibility;
          fill: ${textFill};
          font-variant-ligatures: none;
        }

        rect.key {
          fill: url(#keyGradient);
          filter: ${shadow};
          stroke: ${stroke};
          stroke-width: 1;
        }

        rect.combo { stroke: #7dd3fc; stroke-width: 1; }
        rect.combo, rect.combo-separate { fill: url(#keyGradientCombo); }
        rect.held, rect.combo.held { fill: url(#keyGradientHeld); }
        rect.ghost, rect.combo.ghost { stroke-dasharray: 4, 4; stroke-width: 1; }

        text {
          text-anchor: middle;
          dominant-baseline: middle;
        }

        text.tap {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        text.tap.sm { font-size: 11px; }
        text.tap.xs { font-size: 9px; }

        text.hold {
          font-size: 9px;
          font-weight: 600;
          fill: ${holdFill};
          text-anchor: middle;
          dominant-baseline: middle;
        }

        text.trans { fill: ${transFill}; }

        text.layer-activator {
          font-weight: 700;
          opacity: 0.9;
        }
      `}</style>
      <g transform="translate(30, 0)">
        <g transform="translate(0, 56)">
          {KEY_POSITIONS.map((pos) => (
            <KeyGroup
              key={pos.keypos}
              transform={pos.transform}
              keypos={pos.keypos}
              label={keys[pos.keypos] ?? { tap: "" }}
              isTransKey={pos.isTransKey}
            />
          ))}
        </g>
      </g>
    </svg>
  );
};

export default KeyboardSvg;
