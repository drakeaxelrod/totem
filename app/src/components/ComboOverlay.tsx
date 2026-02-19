import { LAYOUT } from "../lib/layout.ts";
import { getKeyLabel } from "../lib/keyLabels.ts";
import type { Binding, Combo } from "../lib/types.ts";

interface ComboOverlayProps {
  combos: Combo[];
  selectedCombo: number | null;
  onComboClick: (index: number) => void;
  /** When non-null, we are in position-picking mode and these are the currently selected positions */
  pickingPositions: Set<number> | null;
  onPositionClick?: (pos: number) => void;
}

const PADDING = 2;
const VIEWBOX = `${-PADDING} ${-PADDING} ${150.3 + PADDING * 2} ${53.3 + PADDING * 2}`;

/** Get the visual center of a key position */
function keyCenter(index: number): { cx: number; cy: number } {
  const kp = LAYOUT[index];
  if (!kp) return { cx: 0, cy: 0 };
  return { cx: kp.x + kp.w / 2, cy: kp.y + kp.h / 2 };
}

/** Compute the centroid of a set of key positions */
function centroid(positions: number[]): { cx: number; cy: number } {
  if (positions.length === 0) return { cx: 0, cy: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of positions) {
    const { cx, cy } = keyCenter(p);
    sx += cx;
    sy += cy;
  }
  return { cx: sx / positions.length, cy: sy / positions.length };
}

/** Build a quadratic bezier path from (x1,y1) to (x2,y2) with perpendicular offset */
function curvedPath(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular offset
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return `M${x1},${y1} L${x2},${y2}`;
  const nx = -dy / len;
  const ny = dx / len;
  const cpx = mx + nx * curvature;
  const cpy = my + ny * curvature;
  return `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`;
}

/** Simple label position de-overlapping */
function deoverlapLabels(
  labels: Array<{ cx: number; cy: number }>,
  minDist: number,
  iterations: number,
): Array<{ cx: number; cy: number }> {
  const out = labels.map((l) => ({ ...l }));
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].cx - out[i].cx;
        const dy = out[j].cy - out[i].cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.01) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          // Bias separation vertically to avoid overlapping keys
          const biasedNy = ny * 1.3;
          const biasLen = Math.sqrt(nx * nx + biasedNy * biasedNy);
          const fnx = biasLen > 0.01 ? nx / biasLen : 0;
          const fny = biasLen > 0.01 ? biasedNy / biasLen : 1;
          out[i].cx -= fnx * overlap;
          out[i].cy -= fny * overlap;
          out[j].cx += fnx * overlap;
          out[j].cy += fny * overlap;
        }
      }
    }
  }
  return out;
}

function ComboLines({
  combo,
  isSelected,
  labelPos,
  onClick,
}: {
  combo: Combo;
  isSelected: boolean;
  labelPos: { cx: number; cy: number };
  onClick: () => void;
}) {
  const color = isSelected ? "#f9e2af" : "#fab387";
  const opacity = isSelected ? 1 : 0.6;
  const strokeWidth = isSelected ? 0.5 : 0.35;
  const centers = combo.positions.map(keyCenter);
  const label = getKeyLabel(combo.binding);
  const displayText = label.top ? `${label.top} ${label.main}` : label.main;
  const pillWidth = Math.max(displayText.length * 1.8 + 2, 8);

  // Curvature amount scales with distance; alternate direction per key
  const paths = centers.map((c, i) => {
    const dx = labelPos.cx - c.cx;
    const dy = labelPos.cy - c.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sign = i % 2 === 0 ? 1 : -1;
    const curve = Math.min(dist * 0.3, 4) * sign;
    return curvedPath(c.cx, c.cy, labelPos.cx, labelPos.cy, curve);
  });

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Curved lines from each key center to label position */}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={color}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          fill="none"
          opacity={opacity}
        />
      ))}
      {/* Dots at each key center */}
      {centers.map((c, i) => (
        <circle
          key={`d${i}`}
          cx={c.cx}
          cy={c.cy}
          r={isSelected ? 1.0 : 0.7}
          fill={color}
          opacity={opacity}
        />
      ))}
      {/* Label pill */}
      <rect
        x={labelPos.cx - pillWidth / 2}
        y={labelPos.cy - 2.2}
        width={pillWidth}
        height={4.4}
        rx={1}
        fill="#1e1e2e"
        opacity={0.85}
      />
      <text
        x={labelPos.cx}
        y={labelPos.cy}
        text-anchor="middle"
        dominant-baseline="central"
        fill={color}
        font-size="2.5"
        font-family="system-ui, sans-serif"
        font-weight="600"
      >
        {displayText}
      </text>
    </g>
  );
}

export function ComboOverlay({
  combos,
  selectedCombo,
  onComboClick,
  pickingPositions,
  onPositionClick,
}: ComboOverlayProps) {
  // Compute centroids then de-overlap labels
  const centroids = combos.map((c) => centroid(c.positions));
  const labelPositions = deoverlapLabels(centroids, 9, 15);

  return (
    <svg
      viewBox={VIEWBOX}
      class="w-full h-full absolute inset-0 pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ zIndex: 10 }}
    >
      {/* Combo connection lines */}
      <g class="pointer-events-auto">
        {combos.map((combo, i) => (
          <ComboLines
            key={i}
            combo={combo}
            isSelected={selectedCombo === i}
            labelPos={labelPositions[i]}
            onClick={() => onComboClick(i)}
          />
        ))}
      </g>

      {/* Position-picking highlights */}
      {pickingPositions && (
        <g class="pointer-events-auto">
          {LAYOUT.map((kp) => {
            const isPicked = pickingPositions.has(kp.index);
            const { cx, cy } = keyCenter(kp.index);
            const hasRotation = kp.rot !== 0;
            const transform = hasRotation
              ? `rotate(${kp.rot}, ${kp.rx}, ${kp.ry})`
              : undefined;
            return (
              <g key={kp.index} transform={transform}>
                <rect
                  x={kp.x + 0.4}
                  y={kp.y + 0.4}
                  width={kp.w - 0.8}
                  height={kp.h - 0.8}
                  rx={0.8}
                  fill={isPicked ? "#fab387" : "transparent"}
                  opacity={isPicked ? 0.3 : 0}
                  stroke={isPicked ? "#fab387" : "#6c7086"}
                  stroke-width={isPicked ? 0.5 : 0.25}
                  stroke-dasharray={isPicked ? undefined : "0.8 0.4"}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPositionClick?.(kp.index);
                  }}
                />
                {isPicked && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill="#fab387"
                    opacity={0.9}
                  />
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
