/**
 * WatchDial — the signature visual. A top-down watch rendered as a technical
 * blueprint: thin chrome/electric strokes, construction guides, a chapter ring,
 * the Σ on the dial, and (optionally) live ticking hands.
 *
 * Two jobs from one component:
 *  - mode="preview": draws a project's spec as a watch that updates live as the
 *    spec is edited — the design studio.
 *  - mode="live": a real ticking clock, the brand motif for login / empty states.
 */
import { useEffect, useState } from "react";

export interface DialSpec {
  caseDia?: string;
  dialColor?: string; // hex, or a colour name we can map
  texture?: string; // "Sunburst" | "Concentric" | ...
  markers?: string; // "Applied" | "Arabic" | "Dot" | "Baton"
  hasDate?: boolean;
  engraving?: string;
  lume?: boolean;
  pieceName?: string;
}

export interface WatchDialProps {
  size?: number;
  mode?: "preview" | "live";
  spec?: DialSpec;
  showConstruction?: boolean;
  showLogo?: boolean;
  className?: string;
}

/* Map a colour name / hex / Pantone-ish ref to a usable hex. */
const NAMED: Record<string, string> = {
  black: "#15171c", white: "#e9edf2", silver: "#c7cdd9", grey: "#8c95a4", gray: "#8c95a4",
  blue: "#2f6bd0", navy: "#1b2b50", green: "#1f5d4c", "british racing green": "#123a2c",
  red: "#7a2230", burgundy: "#5a1f2a", gold: "#b9913f", champagne: "#d6c08a",
  charcoal: "#22262e", anthracite: "#2a2f38", cream: "#e7dcc3", salmon: "#d98c78",
  brass: "#b08d3c", bronze: "#7c5a32", "midnight": "#0e1630",
};
function parseColor(s?: string): string {
  if (!s) return "#1b2230";
  const t = s.trim().toLowerCase();
  const hex = t.match(/#?([0-9a-f]{6})\b/);
  if (hex) return "#" + hex[1];
  for (const key of Object.keys(NAMED)) if (t.includes(key)) return NAMED[key];
  return "#1b2230";
}

/* Lighten/darken a hex for gradient stops. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

export function WatchDial({
  size = 280,
  mode = "preview",
  spec = {},
  showConstruction = true,
  showLogo = true,
  className,
}: WatchDialProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  const c = size / 2;
  const rCase = size / 2 - 4;
  const rBezelIn = rCase - size * 0.05;
  const rDial = rBezelIn - 2;
  const rChapter = rDial - size * 0.045;
  const uid = `wd${size}-${mode}`;

  const dialBase = parseColor(spec.dialColor);
  const blue = "#57A9FF";
  const line = "rgba(120,150,190,.35)";

  // Hand angles
  const t = now;
  const sAng = mode === "live" ? t.getSeconds() * 6 : 0;
  const mAng = mode === "live" ? t.getMinutes() * 6 + t.getSeconds() * 0.1 : 60; // 10:10 pose
  const hAng = mode === "live" ? ((t.getHours() % 12) + t.getMinutes() / 60) * 30 : 305;

  const markerStyle = (spec.markers || "").toLowerCase();
  const arabic = markerStyle.includes("arab") || markerStyle.includes("numer");
  const dots = markerStyle.includes("dot");

  const hand = (len: number, w: number, ang: number, color: string, glow = false) => {
    const tip = polar(c, c, len, ang);
    const tail = polar(c, c, -len * 0.22, ang);
    return (
      <line
        x1={tail.x}
        y1={tail.y}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        style={glow ? { filter: `drop-shadow(0 0 4px ${blue})` } : undefined}
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={mode === "live" ? "Artymer studio clock" : "Watch dial preview"}
      className={className}
    >
      <defs>
        <radialGradient id={`${uid}-dial`} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={shade(dialBase, 26)} />
          <stop offset="70%" stopColor={dialBase} />
          <stop offset="100%" stopColor={shade(dialBase, -22)} />
        </radialGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#CfD5DF" />
          <stop offset="100%" stopColor="#828B9A" />
        </linearGradient>
        <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E7ECF3" />
          <stop offset="35%" stopColor="#9AA3B2" />
          <stop offset="65%" stopColor="#5A6473" />
          <stop offset="100%" stopColor="#C2C9D4" />
        </linearGradient>
      </defs>

      {/* crown */}
      {(() => {
        const p = polar(c, c, rCase + 1, 90);
        return <rect x={p.x - 2} y={p.y - 5} width={9} height={10} rx={2} fill={`url(#${uid}-metal)`} stroke="#3a4350" strokeWidth={0.5} />;
      })()}

      {/* case + bezel */}
      <circle cx={c} cy={c} r={rCase} fill="none" stroke={`url(#${uid}-bezel)`} strokeWidth={size * 0.045} />
      <circle cx={c} cy={c} r={rBezelIn} fill={`url(#${uid}-dial)`} stroke="#0c0f15" strokeWidth={1} />

      {/* texture */}
      {spec.texture && spec.texture.toLowerCase().includes("sun") &&
        Array.from({ length: 90 }).map((_, i) => {
          const a = (i / 90) * 360;
          const o = polar(c, c, rChapter, a);
          return <line key={i} x1={c} y1={c} x2={o.x} y2={o.y} stroke="rgba(255,255,255,.05)" strokeWidth={0.5} />;
        })}
      {spec.texture && spec.texture.toLowerCase().includes("concentr") &&
        Array.from({ length: 7 }).map((_, i) => (
          <circle key={i} cx={c} cy={c} r={rChapter * (0.25 + i * 0.11)} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={0.5} />
        ))}

      {/* construction guides (blueprint) */}
      {showConstruction && (
        <g stroke={blue} strokeOpacity={0.28} strokeWidth={0.6}>
          <line x1={c} y1={6} x2={c} y2={size - 6} strokeDasharray="2 4" />
          <line x1={6} y1={c} x2={size - 6} y2={c} strokeDasharray="2 4" />
          <circle cx={c} cy={c} r={rChapter * 0.6} fill="none" strokeDasharray="2 4" />
        </g>
      )}

      {/* chapter ring: minute ticks + hour markers */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = i * 6;
        const isHour = i % 5 === 0;
        const o = polar(c, c, rChapter, a);
        const inn = polar(c, c, rChapter - (isHour ? size * 0.055 : size * 0.025), a);
        return (
          <line
            key={i}
            x1={o.x}
            y1={o.y}
            x2={inn.x}
            y2={inn.y}
            stroke={isHour ? "url(#" + uid + "-metal)" : line}
            strokeWidth={isHour ? 2 : 0.8}
          />
        );
      })}

      {/* hour markers: applied batons / dots / arabic */}
      {!arabic &&
        Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30;
          const pos = polar(c, c, rChapter - size * 0.11, a);
          if (i === 0) return null; // 12 reserved for logo zone
          return dots ? (
            <circle key={i} cx={pos.x} cy={pos.y} r={size * 0.012} fill={`url(#${uid}-metal)`} />
          ) : (
            <rect
              key={i}
              x={pos.x - size * 0.008}
              y={pos.y - size * 0.028}
              width={size * 0.016}
              height={size * 0.056}
              rx={1}
              fill={`url(#${uid}-metal)`}
              transform={`rotate(${a} ${pos.x} ${pos.y})`}
            />
          );
        })}
      {arabic &&
        [12, 3, 6, 9].map((h) => {
          const a = (h % 12) * 30;
          const pos = polar(c, c, rChapter - size * 0.1, a);
          if (h === 12 && showLogo) return null;
          return (
            <text key={h} x={pos.x} y={pos.y + size * 0.03} textAnchor="middle" fontFamily="var(--disp)" fontSize={size * 0.075} fill={`url(#${uid}-metal)`}>
              {h}
            </text>
          );
        })}

      {/* Σ logo + wordmark */}
      {showLogo && (
        <>
          <text x={c} y={c - rChapter * 0.42} textAnchor="middle" fontFamily="var(--disp)" fontWeight={700} fontSize={size * 0.11} fill={`url(#${uid}-metal)`}>
            Σ
          </text>
          <text x={c} y={c - rChapter * 0.42 + size * 0.06} textAnchor="middle" fontFamily="var(--disp)" fontSize={size * 0.035} letterSpacing={size * 0.012} fill="rgba(220,230,245,.7)">
            ARTYMER
          </text>
        </>
      )}

      {/* engraving on lower dial */}
      {spec.engraving && (
        <text x={c} y={c + rChapter * 0.55} textAnchor="middle" fontFamily="var(--mono)" fontSize={size * 0.032} letterSpacing={size * 0.004} fill="rgba(200,215,235,.55)">
          {spec.engraving.slice(0, 28)}
        </text>
      )}

      {/* date window at 3 */}
      {spec.hasDate &&
        (() => {
          const p = polar(c, c, rChapter - size * 0.13, 90);
          return (
            <g>
              <rect x={p.x - size * 0.035} y={p.y - size * 0.03} width={size * 0.07} height={size * 0.06} rx={1.5} fill="#0c0f15" stroke={`url(#${uid}-metal)`} strokeWidth={0.8} />
              <text x={p.x} y={p.y + size * 0.02} textAnchor="middle" fontFamily="var(--mono)" fontSize={size * 0.04} fill="#e9edf2">
                {mode === "live" ? String(now.getDate()).padStart(2, "0") : "08"}
              </text>
            </g>
          );
        })()}

      {/* hands */}
      {hand(rChapter * 0.55, size * 0.018, hAng, `url(#${uid}-metal)`)}
      {hand(rChapter * 0.8, size * 0.012, mAng, `url(#${uid}-metal)`)}
      {hand(rChapter * 0.86, size * 0.006, sAng, blue, true)}
      <circle cx={c} cy={c} r={size * 0.018} fill={`url(#${uid}-metal)`} stroke="#0c0f15" strokeWidth={0.5} />
      <circle cx={c} cy={c} r={size * 0.006} fill={blue} />

      {/* case Ø annotation (blueprint) */}
      {showConstruction && spec.caseDia && (
        <text x={c} y={size - 6} textAnchor="middle" fontFamily="var(--mono)" fontSize={size * 0.038} fill={blue} fillOpacity={0.7}>
          ⌀ {spec.caseDia} mm
        </text>
      )}
    </svg>
  );
}
