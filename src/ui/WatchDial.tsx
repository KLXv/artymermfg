/**
 * WatchDial — the signature visual. A refined top-down timepiece that doubles
 * as a live spec preview and a ticking brand clock.
 *
 * It genuinely reflects the spec: case metal (steel/gold/bronze/PVD/titanium),
 * marker style (applied batons / Arabic / Roman / dots), dial texture (sunburst
 * / concentric / guilloché / vertical-brushed / matte), hand style
 * (dauphine / baton), a date aperture, lume (markers + hands glow), and crystal
 * (domed glass reflection). Lugs + strap stubs make it read as a watch, with a
 * light technical-blueprint overlay.
 */
import { useEffect, useState } from "react";

export interface DialSpec {
  caseDia?: string;
  dialColor?: string;
  /** All approved dial colours (ref or name), in order — drives fumé/gradient. */
  dialColors?: string[];
  /** "Solid" | "Fumé" | "Gradient" — how the dial colours render. */
  gradient?: string;
  texture?: string;
  markers?: string;
  hasDate?: boolean;
  engraving?: string;
  lume?: boolean;
  pieceName?: string;
  caseMaterial?: string;
  caseFinish?: string;
  handStyle?: string;
  crystalShape?: string;
}

export interface WatchDialProps {
  size?: number;
  mode?: "preview" | "live";
  spec?: DialSpec;
  showConstruction?: boolean;
  showLogo?: boolean;
  className?: string;
}

/* ---- colour helpers --------------------------------------------------- */
const NAMED: Record<string, string> = {
  black: "#15171c", white: "#e9edf2", silver: "#c7cdd9", grey: "#8c95a4", gray: "#8c95a4",
  blue: "#2f6bd0", navy: "#16284e", green: "#1f5d4c", "racing green": "#123a2c",
  red: "#7a2230", burgundy: "#5a1f2a", gold: "#b9913f", champagne: "#d6c08a",
  charcoal: "#22262e", anthracite: "#2a2f38", cream: "#e7dcc3", salmon: "#d98c78",
  brass: "#b08d3c", bronze: "#7c5a32", midnight: "#0e1630", teal: "#1c5560",
  slate: "#3a4453", olive: "#4a4f2e", chocolate: "#3a2417", ivory: "#ece3cf",
};
function parseColor(s?: string): string {
  if (!s) return "#1b2230";
  const t = s.trim().toLowerCase();
  const hex = t.match(/#?([0-9a-f]{6})\b/);
  if (hex) return "#" + hex[1];
  for (const k of Object.keys(NAMED)) if (t.includes(k)) return NAMED[k];
  return "#1b2230";
}
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
/* Dial fill stops. Solid = shaded single colour (the classic look); Fumé =
 * bright centre burning to a near-black rim (smoked dial); Gradient = a true
 * blend across every approved colour, centre → rim. Returns [offset%, colour]. */
function dialStops(base: string, colors: string[], mode = "Solid"): [number, string][] {
  const m = mode.toLowerCase();
  const cs = colors.length ? colors : [base];
  if (m.startsWith("fum")) {
    const c0 = cs[0];
    return [
      [0, shade(c0, 34)],
      [45, c0],
      [82, shade(c0, -52)],
      [100, shade(c0, -84)],
    ];
  }
  if (m.startsWith("grad") && cs.length >= 2) {
    const last = cs.length - 1;
    const stops: [number, string][] = [[0, shade(cs[0], 22)]];
    cs.forEach((c, i) => stops.push([8 + (i / last) * 84, c]));
    stops.push([100, shade(cs[last], -30)]);
    return stops;
  }
  // Solid — the original three-stop shaded radial.
  return [
    [0, shade(base, 30)],
    [62, base],
    [100, shade(base, -28)],
  ];
}

/* case metal → [light, mid, dark] gradient stops */
function metalStops(material = "", finish = ""): [string, string, string] {
  const t = (material + " " + finish).toLowerCase();
  if (/gold|champagne|yellow/.test(t)) return ["#FCEAA6", "#C9A24B", "#7A5E22"];
  if (/rose|pink/.test(t)) return ["#F7D6C6", "#C98A6B", "#7A4A33"];
  if (/bronze/.test(t)) return ["#E7C49C", "#9C7038", "#553A1C"];
  if (/black|pvd|dlc|gunmetal|graphite/.test(t)) return ["#6A7480", "#2A2F38", "#101319"];
  if (/titan|grey|gray/.test(t)) return ["#D6DBE2", "#9098A4", "#525A66"];
  return ["#FFFFFF", "#C7CDD9", "#7E8796"]; // steel / 316L default
}

const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
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

  const S = size;
  const c = S / 2;
  const rCaseOut = S * 0.43;
  const bezelW = S * 0.055;
  const rCaseIn = rCaseOut - bezelW;
  const rRehaut = rCaseIn - S * 0.005;
  const rTrack = rRehaut - S * 0.03; // minute track radius
  const rMark = rTrack - S * 0.012; // hour markers sit just inside the track
  const uid = `wd${size}-${mode}-${Math.round((rCaseOut + bezelW) * 7)}`;

  const dialBase = parseColor(spec.dialColor);
  const parsedColors = (spec.dialColors ?? []).map(parseColor).filter(Boolean);
  const dialFill = dialStops(dialBase, parsedColors, spec.gradient);
  const [mL, mM, mD] = metalStops(spec.caseMaterial, spec.caseFinish);
  const lume = !!spec.lume;
  const lumeC = "#BFF7CE";
  const markerFill = lume ? lumeC : `url(#${uid}-metal)`;
  const blue = "#57A9FF";

  const tx = (spec.texture || "").toLowerCase();
  const mk = (spec.markers || "").toLowerCase();
  const isRoman = /roman|numer.*rom/.test(mk);
  const isArabic = /arab|numeral/.test(mk) && !isRoman;
  const isDot = /dot|pearl|point/.test(mk);
  const hs = (spec.handStyle || "").toLowerCase();
  const dauphine = /dauphin|leaf|feuille/.test(hs);
  const domed = /dome|box|sap.*dome|double/.test((spec.crystalShape || "").toLowerCase());

  // hand angles
  const t = now;
  const sAng = mode === "live" ? t.getSeconds() * 6 : 0;
  const mAng = mode === "live" ? t.getMinutes() * 6 + t.getSeconds() * 0.1 : 60;
  const hAng = mode === "live" ? ((t.getHours() % 12) + t.getMinutes() / 60) * 30 : 305;

  /* a tapered hand: dauphine (faceted polygon) or baton (rounded bar) */
  const Hand = ({ len, w, ang, fill, secondary = false }: { len: number; w: number; ang: number; fill: string; secondary?: boolean }) => {
    const tip = polar(c, c, len, ang);
    const baseL = polar(c, c, -len * 0.18, ang - (secondary ? 0 : 1.4));
    if (dauphine && !secondary) {
      const a = (ang * Math.PI) / 180;
      const nx = Math.cos(a); // along
      const ny = Math.sin(a);
      const px = -Math.sin((ang * Math.PI) / 180); // perpendicular
      const py = Math.cos((ang * Math.PI) / 180);
      void nx; void ny;
      const base = { x: c + px * w, y: c + py * w };
      const base2 = { x: c - px * w, y: c - py * w };
      const mid = { x: c + (tip.x - c) * 0.5 + px * w * 0.5, y: c + (tip.y - c) * 0.5 + py * w * 0.5 };
      const mid2 = { x: c + (tip.x - c) * 0.5 - px * w * 0.5, y: c + (tip.y - c) * 0.5 - py * w * 0.5 };
      return (
        <>
          <polygon points={`${base.x},${base.y} ${mid.x},${mid.y} ${tip.x},${tip.y} ${mid2.x},${mid2.y} ${base2.x},${base2.y}`} fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth={0.5} />
        </>
      );
    }
    return (
      <line
        x1={baseL.x}
        y1={baseL.y}
        x2={tip.x}
        y2={tip.y}
        stroke={fill}
        strokeWidth={w * (secondary ? 1 : 2)}
        strokeLinecap="round"
        style={secondary ? { filter: `drop-shadow(0 0 4px ${blue})` } : undefined}
      />
    );
  };

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img"
      aria-label={mode === "live" ? "Artymer studio clock" : "Watch dial preview"} className={className}>
      <defs>
        <radialGradient id={`${uid}-dial`} cx="50%" cy="36%" r="78%">
          {dialFill.map(([off, col], i) => (
            <stop key={i} offset={`${off}%`} stopColor={col} />
          ))}
        </radialGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={mL} />
          <stop offset="50%" stopColor={mM} />
          <stop offset="100%" stopColor={mD} />
        </linearGradient>
        <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mL} />
          <stop offset="28%" stopColor={mM} />
          <stop offset="52%" stopColor={mD} />
          <stop offset="72%" stopColor={mM} />
          <stop offset="100%" stopColor={mL} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx={c} cy={c} r={rRehaut} />
        </clipPath>
        <radialGradient id={`${uid}-glass`} cx="34%" cy="26%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,.22)" />
          <stop offset="40%" stopColor="rgba(255,255,255,.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* strap stubs + lugs (reads as a watch) */}
      {(() => {
        const w = S * 0.30;
        return (
          <g>
            <rect x={c - w / 2} y={0} width={w} height={c - rCaseOut + S * 0.04} rx={S * 0.03} fill="#15181f" stroke="#262d38" strokeWidth={1} />
            <rect x={c - w / 2} y={c + rCaseOut - S * 0.04} width={w} height={c - rCaseOut + S * 0.04} rx={S * 0.03} fill="#15181f" stroke="#262d38" strokeWidth={1} />
          </g>
        );
      })()}

      {/* crown */}
      {(() => {
        const p = polar(c, c, rCaseOut, 90);
        return <rect x={p.x - 2} y={p.y - S * 0.028} width={S * 0.04} height={S * 0.056} rx={2} fill={`url(#${uid}-metal)`} stroke="#2a313b" strokeWidth={0.5} />;
      })()}

      {/* case + bezel */}
      <circle cx={c} cy={c} r={(rCaseOut + rCaseIn) / 2} fill="none" stroke={`url(#${uid}-bezel)`} strokeWidth={bezelW} />
      <circle cx={c} cy={c} r={rCaseIn} fill={`url(#${uid}-dial)`} stroke="#06080c" strokeWidth={1.2} />

      {/* dial texture (clipped) */}
      <g clipPath={`url(#${uid}-clip)`}>
        {/sun|sunray|sunburst/.test(tx) &&
          Array.from({ length: 120 }).map((_, i) => {
            const o = polar(c, c, rRehaut, (i / 120) * 360);
            return <line key={i} x1={c} y1={c} x2={o.x} y2={o.y} stroke="rgba(255,255,255,.06)" strokeWidth={0.5} />;
          })}
        {/concentr|circular/.test(tx) &&
          Array.from({ length: 11 }).map((_, i) => (
            <circle key={i} cx={c} cy={c} r={rRehaut * (0.12 + i * 0.085)} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={0.6} />
          ))}
        {/vertical|brush|stripe/.test(tx) &&
          Array.from({ length: 40 }).map((_, i) => {
            const x = c - rRehaut + (i / 39) * rRehaut * 2;
            return <line key={i} x1={x} y1={c - rRehaut} x2={x} y2={c + rRehaut} stroke="rgba(255,255,255,.045)" strokeWidth={0.6} />;
          })}
        {/waffle|guilloch|clous|paris|grid|tapestry/.test(tx) && (
          <g stroke="rgba(255,255,255,.05)" strokeWidth={0.6}>
            {Array.from({ length: 28 }).map((_, i) => {
              const d = -rRehaut + (i / 27) * rRehaut * 2;
              return <line key={"a" + i} x1={c - rRehaut} y1={c + d} x2={c + rRehaut} y2={c + d + rRehaut} />;
            })}
            {Array.from({ length: 28 }).map((_, i) => {
              const d = -rRehaut + (i / 27) * rRehaut * 2;
              return <line key={"b" + i} x1={c - rRehaut} y1={c + d} x2={c + rRehaut} y2={c + d - rRehaut} />;
            })}
          </g>
        )}
      </g>

      {/* rehaut (flange) ring */}
      <circle cx={c} cy={c} r={rRehaut} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={S * 0.012} />

      {/* minute track */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = i * 6;
        const hour = i % 5 === 0;
        const o = polar(c, c, rTrack, a);
        const inn = polar(c, c, rTrack - (hour ? S * 0.03 : S * 0.014), a);
        return <line key={i} x1={o.x} y1={o.y} x2={inn.x} y2={inn.y} stroke={hour ? `url(#${uid}-metal)` : "rgba(150,170,200,.4)"} strokeWidth={hour ? 1.6 : 0.7} />;
      })}

      {/* hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        if (i === 0 && showLogo) return null; // 12 reserved for Σ
        const a = i * 30;
        const pos = polar(c, c, rMark - S * 0.045, a);
        if (isRoman || isArabic) {
          const label = isRoman ? ROMAN[i] : i === 0 ? "12" : String(i);
          return (
            <text key={i} x={pos.x} y={pos.y + S * 0.028} textAnchor="middle" fontFamily={isRoman ? "var(--serif)" : "var(--disp)"} fontSize={S * (isRoman ? 0.06 : 0.07)} fontWeight={500} fill={markerFill} style={lume ? { filter: `drop-shadow(0 0 3px ${lumeC})` } : undefined}>
              {label}
            </text>
          );
        }
        if (isDot) {
          return <circle key={i} cx={pos.x} cy={pos.y} r={S * (i % 3 === 0 ? 0.016 : 0.012)} fill={markerFill} stroke="rgba(0,0,0,.3)" strokeWidth={0.4} style={lume ? { filter: `drop-shadow(0 0 3px ${lumeC})` } : undefined} />;
        }
        // applied beveled baton
        const long = S * 0.07;
        const wide = S * 0.018;
        return (
          <g key={i} transform={`rotate(${a} ${pos.x} ${pos.y})`} style={lume ? { filter: `drop-shadow(0 0 3px ${lumeC})` } : undefined}>
            <rect x={pos.x - wide / 2} y={pos.y - long / 2} width={wide} height={long} rx={1} fill={markerFill} stroke="rgba(0,0,0,.35)" strokeWidth={0.5} />
            <rect x={pos.x - wide / 2} y={pos.y - long / 2} width={wide / 2.6} height={long} rx={1} fill="rgba(255,255,255,.35)" />
          </g>
        );
      })}

      {/* Σ logo + wordmark */}
      {showLogo && (
        <>
          <text x={c} y={c - rMark * 0.46} textAnchor="middle" fontFamily="var(--disp)" fontWeight={700} fontSize={S * 0.1} fill={`url(#${uid}-metal)`}>Σ</text>
          {S >= 150 && (
            <text x={c} y={c - rMark * 0.46 + S * 0.052} textAnchor="middle" fontFamily="var(--disp)" fontSize={S * 0.032} letterSpacing={S * 0.012} fill="rgba(220,230,245,.65)">ARTYMER</text>
          )}
        </>
      )}

      {/* engraving (lower dial) */}
      {spec.engraving && (
        <text x={c} y={c + rMark * 0.5} textAnchor="middle" fontFamily="var(--mono)" fontSize={S * 0.03} letterSpacing={S * 0.003} fill="rgba(200,215,235,.5)">
          {spec.engraving.slice(0, 26)}
        </text>
      )}

      {/* date aperture at 3 */}
      {spec.hasDate &&
        (() => {
          const p = polar(c, c, rMark - S * 0.07, 90);
          return (
            <g>
              <rect x={p.x - S * 0.038} y={p.y - S * 0.032} width={S * 0.076} height={S * 0.064} rx={1.5} fill="#0a0d12" stroke={`url(#${uid}-metal)`} strokeWidth={1} />
              <text x={p.x} y={p.y + S * 0.022} textAnchor="middle" fontFamily="var(--disp)" fontSize={S * 0.044} fill="#eef2f8">
                {mode === "live" ? String(now.getDate()).padStart(2, "0") : "08"}
              </text>
            </g>
          );
        })()}

      {/* construction overlay (subtle blueprint) */}
      {showConstruction && (
        <g stroke={blue} strokeOpacity={0.22} strokeWidth={0.6} clipPath={`url(#${uid}-clip)`}>
          <line x1={c} y1={c - rRehaut} x2={c} y2={c + rRehaut} strokeDasharray="2 5" />
          <line x1={c - rRehaut} y1={c} x2={c + rRehaut} y2={c} strokeDasharray="2 5" />
        </g>
      )}

      {/* hands */}
      <Hand len={rMark * 0.56} w={S * 0.02} ang={hAng} fill={lume ? lumeC : `url(#${uid}-metal)`} />
      <Hand len={rMark * 0.82} w={S * 0.014} ang={mAng} fill={lume ? lumeC : `url(#${uid}-metal)`} />
      <Hand len={rMark * 0.88} w={S * 0.006} ang={sAng} fill={blue} secondary />
      {/* seconds counterweight */}
      {(() => {
        const cw = polar(c, c, -rMark * 0.22, sAng);
        return <circle cx={cw.x} cy={cw.y} r={S * 0.012} fill={blue} />;
      })()}
      <circle cx={c} cy={c} r={S * 0.02} fill={`url(#${uid}-metal)`} stroke="#06080c" strokeWidth={0.6} />
      <circle cx={c} cy={c} r={S * 0.007} fill={blue} />

      {/* domed glass reflection */}
      <circle cx={c} cy={c} r={rCaseIn} fill={`url(#${uid}-glass)`} opacity={domed ? 0.9 : 0.55} clipPath={`url(#${uid}-clip)`} />

      {/* Ø annotation */}
      {showConstruction && spec.caseDia && (
        <text x={c} y={S - S * 0.012} textAnchor="middle" fontFamily="var(--mono)" fontSize={S * 0.036} fill={blue} fillOpacity={0.7}>
          ⌀ {spec.caseDia} mm
        </text>
      )}
    </svg>
  );
}
