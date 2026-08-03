/**
 * ArtymerWatch — a faithful rendition of the real Artymer piece, ticking live.
 *
 * This is the house watch, not a spec preview: the geometry, colours and
 * printing are fixed to the actual production dial rather than driven by a
 * project spec (that remains `WatchDial`, which must stay generic because it
 * renders whatever a client has approved).
 *
 * Dial anatomy, outside in:
 *   · slim polished steel bezel, crown at 3
 *   · minute track at the rim — 60 ticks, bolder every fifth
 *   · minute numerals 05…60, rotated to follow the ring (dive-track convention,
 *     so 30 sits inverted at 6 — that is the reference, not a bug)
 *   · applied faceted markers, wide at the rim tapering inward, each split into
 *     a lit and a shadowed half around a centre ridge; 12 is the wide one and 6
 *     is given over to the date
 *   · fumé dial — bright turquoise centre burning to near-black at the rim
 *   · Σ under 12; ARTYMΣR / 100·330ft above the date
 *   · navy spear hands with lume cores
 */
import { useEffect, useState } from "react";

export interface ArtymerWatchProps {
  size?: number;
  /** "live" ticks with the clock; "static" poses the hands at 10:09:30. */
  mode?: "live" | "static";
  showDate?: boolean;
  className?: string;
}

/* The production dial, sampled from the reference photography. The fumé is
 * aggressive on purpose: a bright turquoise core holds to roughly half the
 * radius, then falls away hard so the rim reads almost black. */
const DIAL_STOPS: [number, string][] = [
  [0, "#79EAF4"],
  [18, "#57DCEA"],
  [32, "#36C7DB"],
  [44, "#1FAAC2"],
  [55, "#12879F"],
  [66, "#0A6274"],
  [76, "#064450"],
  [85, "#032B34"],
  [93, "#02191F"],
  [100, "#010A0E"],
];

const PRINT = "#0C2033"; // the dark navy the dial is printed in
const LUME = "#EAF7F9";
const HAND = "#101E33";

const polar = (c: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
};

export function ArtymerWatch({ size = 224, mode = "live", showDate = true, className }: ArtymerWatchProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  const S = size;
  const c = S / 2;
  const uid = `aw${S}${mode}`;

  /* Radii, as fractions of the dial so every size scales cleanly. */
  const rCase = S * 0.482;
  const bezelW = S * 0.024;
  const rDial = rCase - bezelW;
  const rTick = rDial * 0.972;
  const rNum = rDial * 0.858;
  const markOut = rDial * 0.795;
  const markIn = rDial * 0.505;

  const live = mode === "live";
  const secs = live ? now.getSeconds() : 30;
  const mins = live ? now.getMinutes() : 9;
  const hrs = live ? now.getHours() % 12 : 10;
  const sAng = secs * 6;
  const mAng = mins * 6 + secs * 0.1;
  const hAng = (hrs + mins / 60) * 30;

  /** An applied marker: wide at the rim, tapering inward, ridged down the middle. */
  const Marker = ({ ang, wide }: { ang: number; wide?: boolean }) => {
    const wO = S * (wide ? 0.031 : 0.021); // half-width at the rim
    const wI = S * (wide ? 0.011 : 0.0075); // half-width inboard
    const yO = c - markOut;
    const yI = c - markIn;
    return (
      <g transform={`rotate(${ang} ${c} ${c})`}>
        {/* seat shadow, so the marker sits *on* the dial */}
        <polygon
          points={`${c - wO},${yO} ${c + wO},${yO} ${c + wI},${yI} ${c - wI},${yI}`}
          fill="rgba(0,0,0,.55)"
          transform={`translate(${S * 0.004} ${S * 0.005})`}
        />
        {/* lit facet | shadowed facet, meeting at the ridge */}
        <polygon points={`${c - wO},${yO} ${c},${yO} ${c},${yI} ${c - wI},${yI}`} fill={`url(#${uid}-steelL)`} />
        <polygon points={`${c},${yO} ${c + wO},${yO} ${c + wI},${yI} ${c},${yI}`} fill={`url(#${uid}-steelD)`} />
        <polygon
          points={`${c - wO},${yO} ${c + wO},${yO} ${c + wI},${yI} ${c - wI},${yI}`}
          fill="none"
          stroke="rgba(0,0,0,.6)"
          strokeWidth={S * 0.0035}
        />
        <line x1={c} y1={yO} x2={c} y2={yI} stroke="rgba(255,255,255,.55)" strokeWidth={S * 0.002} />
      </g>
    );
  };

  /** A spear hand with a lume core. */
  const Hand = ({ ang, len, half, z }: { ang: number; len: number; half: number; z: number }) => {
    const tip = c - len;
    const sh = c - len * 0.70; // shoulder
    const tail = c + len * 0.12;
    const i = half * 0.50; // leaves a substantial navy frame around the lume
    return (
      <g transform={`rotate(${ang} ${c} ${c})`} style={{ filter: `drop-shadow(${S * 0.004}px ${S * 0.006}px ${S * 0.006}px rgba(0,0,0,.45))` }}>
        <polygon
          points={`${c},${tip} ${c + half},${sh} ${c + half},${tail} ${c - half},${tail} ${c - half},${sh}`}
          fill={HAND}
          stroke="rgba(0,0,0,.5)"
          strokeWidth={S * 0.002}
        />
        <polygon
          points={`${c},${tip + z} ${c + half - i},${sh + z * 0.4} ${c + half - i},${tail - i} ${c - half + i},${tail - i} ${c - half + i},${sh + z * 0.4}`}
          fill={LUME}
        />
      </g>
    );
  };

  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label={live ? `Artymer studio clock, ${now.getHours()}:${String(mins).padStart(2, "0")}` : "Artymer watch"}
      className={className}
    >
      <defs>
        {/* r is in bounding-box units: 50% puts the final stop exactly on the
            dial edge, so the fumé completes instead of being cut off mid-ramp. */}
        <radialGradient id={`${uid}-dial`} cx="50%" cy="48%" r="50%">
          {DIAL_STOPS.map(([o, col]) => (
            <stop key={o} offset={`${o}%`} stopColor={col} />
          ))}
        </radialGradient>
        {/* polished steel, lit from upper-left */}
        <linearGradient id={`${uid}-steelL`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E6EBF1" />
          <stop offset="100%" stopColor="#A8B2BF" />
        </linearGradient>
        <linearGradient id={`${uid}-steelD`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#98A3B1" />
          <stop offset="55%" stopColor="#6B7684" />
          <stop offset="100%" stopColor="#455060" />
        </linearGradient>
        <linearGradient id={`${uid}-bezel`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#C9D1DB" />
          <stop offset="45%" stopColor="#79838F" />
          <stop offset="62%" stopColor="#EDF1F6" />
          <stop offset="82%" stopColor="#9AA4B1" />
          <stop offset="100%" stopColor="#E8EDF3" />
        </linearGradient>
        {/* crystal: a soft sweep across the upper-left, as in the photography */}
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0.75" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,.20)" />
          <stop offset="38%" stopColor="rgba(255,255,255,.05)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id={`${uid}-dialClip`}>
          <circle cx={c} cy={c} r={rDial} />
        </clipPath>
      </defs>

      {/* crown at 3 */}
      <g>
        <rect
          x={c + rCase - S * 0.004}
          y={c - S * 0.030}
          width={S * 0.038}
          height={S * 0.060}
          rx={S * 0.008}
          fill={`url(#${uid}-bezel)`}
          stroke="rgba(0,0,0,.45)"
          strokeWidth={S * 0.002}
        />
      </g>

      {/* case + polished bezel */}
      <circle cx={c} cy={c} r={rCase} fill="#0A0E14" />
      <circle cx={c} cy={c} r={rCase - bezelW / 2} fill="none" stroke={`url(#${uid}-bezel)`} strokeWidth={bezelW} />
      <circle cx={c} cy={c} r={rDial} fill={`url(#${uid}-dial)`} />
      {/* inner shadow where the dial meets the case */}
      <circle cx={c} cy={c} r={rDial - S * 0.008} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={S * 0.017} />

      <g clipPath={`url(#${uid}-dialClip)`}>
        {/* minute track */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = i * 6;
          const five = i % 5 === 0;
          const o = polar(c, rTick, a);
          const inn = polar(c, rTick - S * (five ? 0.030 : 0.017), a);
          return (
            <line
              key={i}
              x1={o.x}
              y1={o.y}
              x2={inn.x}
              y2={inn.y}
              stroke={five ? "rgba(226,240,244,.92)" : "rgba(200,222,229,.60)"}
              strokeWidth={S * (five ? 0.0075 : 0.004)}
              strokeLinecap="butt"
            />
          );
        })}

        {/* minute numerals, following the ring */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30;
          const label = String(i === 0 ? 60 : i * 5).padStart(2, "0");
          const p = polar(c, rNum, a);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              transform={`rotate(${a} ${p.x} ${p.y})`}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--disp)"
              fontSize={S * 0.042}
              fontWeight={500}
              letterSpacing={S * 0.0008}
              fill="rgba(226,240,244,.86)"
            >
              {label}
            </text>
          );
        })}

        {/* applied markers — 12 wide, 6 given to the date */}
        {Array.from({ length: 12 }).map((_, i) => {
          if (showDate && i === 6) return null;
          return <Marker key={i} ang={i * 30} wide={i === 0} />;
        })}

        {/* Σ under 12 */}
        <text
          x={c}
          y={c - rDial * 0.40}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--disp)"
          fontSize={S * 0.098}
          fontWeight={700}
          fill={PRINT}
        >
          Σ
        </text>

        {/* wordmark + depth rating */}
        <text
          x={c}
          y={c + rDial * 0.375}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--disp)"
          fontSize={S * 0.046}
          fontWeight={500}
          letterSpacing={S * 0.0085}
          fill={PRINT}
        >
          ARTYMΣR
        </text>
        <text
          x={c}
          y={c + rDial * 0.475}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--disp)"
          fontSize={S * 0.031}
          fontWeight={500}
          letterSpacing={S * 0.0015}
          fill={PRINT}
        >
          100/330ft
        </text>

        {/* date at 6 */}
        {showDate && (
          <g>
            <rect
              x={c - S * 0.048}
              y={c + rDial * 0.585}
              width={S * 0.096}
              height={S * 0.072}
              rx={S * 0.004}
              fill="#081521"
            />
            <rect
              x={c - S * 0.048}
              y={c + rDial * 0.585}
              width={S * 0.096}
              height={S * 0.072}
              rx={S * 0.004}
              fill="none"
              stroke={`url(#${uid}-steelL)`}
              strokeWidth={S * 0.005}
            />
            <text
              x={c}
              y={c + rDial * 0.585 + S * 0.038}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--disp)"
              fontSize={S * 0.044}
              fontWeight={500}
              fill="#F2F7FA"
            >
              {live ? now.getDate() : 9}
            </text>
          </g>
        )}

        {/* hands */}
        <Hand ang={hAng} len={rDial * 0.50} half={S * 0.019} z={S * 0.018} />
        <Hand ang={mAng} len={rDial * 0.735} half={S * 0.015} z={S * 0.015} />

        {/* seconds — a slim navy needle with a counterweight */}
        <g transform={`rotate(${sAng} ${c} ${c})`} style={{ filter: `drop-shadow(${S * 0.003}px ${S * 0.004}px ${S * 0.005}px rgba(0,0,0,.4))` }}>
          <rect x={c - S * 0.0045} y={c - rDial * 0.83} width={S * 0.009} height={rDial * 0.83 + S * 0.055} fill={HAND} />
          <circle cx={c} cy={c + S * 0.075} r={S * 0.017} fill={HAND} />
        </g>

        {/* centre cap */}
        <circle cx={c} cy={c} r={S * 0.022} fill={`url(#${uid}-steelL)`} stroke="rgba(0,0,0,.5)" strokeWidth={S * 0.003} />
        <circle cx={c} cy={c} r={S * 0.008} fill="#0A1420" />

        {/* crystal sweep */}
        <circle cx={c} cy={c} r={rDial} fill={`url(#${uid}-glass)`} />
      </g>
    </svg>
  );
}
