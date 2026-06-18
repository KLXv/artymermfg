/**
 * "The index" — the app's signature element.
 *
 * A machined chapter-ring of index ticks. Each stage is a tick on the bezel;
 * completed ticks are filled brass, the current tick is illuminated and longer,
 * future ticks are faint. It's the recurring structural device of the cockpit
 * (stage trackers, QC progress, pipeline) and the thing the app is remembered
 * by — not a generic progress bar.
 *
 * Motion is restrained and purposeful: the active tick settles on stage
 * advance, and is disabled under prefers-reduced-motion (handled globally).
 */
import { motion } from "framer-motion";

export interface IndexRingProps {
  /** Ordered labels, one tick each. */
  stages: string[];
  /** Index of the current stage (0-based). Earlier ticks render as done. */
  current: number;
  /** Diameter in px. */
  size?: number;
  /** Optional center label; defaults to the current stage name. */
  centerLabel?: string;
  /** Optional small kicker above the center label. */
  centerKicker?: string;
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

export function IndexRing({ stages, current, size = 220, centerLabel, centerKicker }: IndexRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const n = Math.max(stages.length, 1);
  // Sweep across a 300° arc, opening at the bottom — reads as an instrument.
  const arc = 300;
  const start = -arc / 2;
  const step = arc / (n - 1 || 1);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Stage ${current + 1} of ${n}: ${stages[current] ?? ""}`}
    >
      {stages.map((label, i) => {
        const done = i < current;
        const cur = i === current;
        const angle = start + step * i;
        const tickLen = cur ? 16 : 9;
        const p1 = polar(cx, cy, rOuter, angle);
        const p2 = polar(cx, cy, rOuter - tickLen, angle);
        const color = cur ? "var(--brass)" : done ? "rgba(201,162,75,.55)" : "var(--line2)";
        return (
          <motion.line
            key={label + i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeWidth={cur ? 2.5 : 1.5}
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: cur ? 1 : done ? 0.85 : 0.5 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        );
      })}
      {centerKicker && (
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize={9}
          letterSpacing="1.4"
          fill="var(--faint)"
          style={{ textTransform: "uppercase" }}
        >
          {centerKicker}
        </text>
      )}
      <text
        x={cx}
        y={centerKicker ? cy + 8 : cy + 5}
        textAnchor="middle"
        fontFamily="var(--disp)"
        fontSize={16}
        fontWeight={600}
        fill="var(--ink)"
      >
        {centerLabel ?? stages[current] ?? ""}
      </text>
    </svg>
  );
}
