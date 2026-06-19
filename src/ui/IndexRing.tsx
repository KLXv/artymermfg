/**
 * "The index" — the app's signature element, now machined chrome under electric
 * light. A faint bezel ring carries the stage ticks; completed ticks glint
 * silver-blue, the current tick is illuminated and blooms, future ticks recede.
 * The center value is brushed metal. Motion settles the active tick on advance.
 */
import { motion } from "framer-motion";

export interface IndexRingProps {
  stages: string[];
  current: number;
  size?: number;
  centerLabel?: string;
  centerKicker?: string;
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

export function IndexRing({ stages, current, size = 220, centerLabel, centerKicker }: IndexRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 7;
  const n = Math.max(stages.length, 1);
  const arc = 300;
  const start = -arc / 2;
  const step = arc / (n - 1 || 1);
  const uid = `ir${size}`;

  // Faint machined bezel arc (the background the ticks sit on).
  const a0 = polar(cx, cy, rOuter, start);
  const a1 = polar(cx, cy, rOuter, start + arc);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Stage ${current + 1} of ${n}: ${stages[current] ?? ""}`}
    >
      <defs>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#D6DCE6" />
          <stop offset="100%" stopColor="#9099A8" />
        </linearGradient>
      </defs>

      <path
        d={`M ${a0.x} ${a0.y} A ${rOuter} ${rOuter} 0 1 1 ${a1.x} ${a1.y}`}
        fill="none"
        stroke="rgba(54,64,78,.5)"
        strokeWidth={1}
      />

      {stages.map((label, i) => {
        const done = i < current;
        const cur = i === current;
        const angle = start + step * i;
        const tickLen = cur ? 17 : 9;
        const p1 = polar(cx, cy, rOuter, angle);
        const p2 = polar(cx, cy, rOuter - tickLen, angle);
        const color = cur ? "var(--brass)" : done ? "rgba(150,180,220,.65)" : "var(--line2)";
        return (
          <motion.line
            key={label + i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeWidth={cur ? 3 : 1.5}
            strokeLinecap="round"
            filter={cur ? `url(#${uid}-glow)` : undefined}
            initial={false}
            animate={{ opacity: cur ? 1 : done ? 0.9 : 0.45 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        );
      })}

      {centerKicker && (
        <text
          x={cx}
          y={cy - 13}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize={9}
          letterSpacing="1.6"
          fill="var(--faint)"
          style={{ textTransform: "uppercase" }}
        >
          {centerKicker}
        </text>
      )}
      <text
        x={cx}
        y={centerKicker ? cy + 9 : cy + 6}
        textAnchor="middle"
        fontFamily="var(--disp)"
        fontSize={17}
        fontWeight={600}
        fill={`url(#${uid}-metal)`}
      >
        {centerLabel ?? stages[current] ?? ""}
      </text>
    </svg>
  );
}
