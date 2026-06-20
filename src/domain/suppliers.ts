/**
 * Supplier ranking — scores OEM partners by the attributes you record about them
 * (quality, communication, price/value, lead time, MOQ) and surfaces who's best
 * for what. This is judgement on the data you enter, not delivery history.
 *
 * Composite score is a weighted blend; lead time and MOQ are normalized across
 * the set (lower is better). Unset ratings count as neutral so a half-filled
 * card isn't unfairly buried. Pure + tested.
 */
import { num } from "./format";
import type { Supplier } from "./types";

export interface SupplierScore {
  supplier: Supplier;
  score: number; // 0–100 composite
  quality: number;
  comm: number;
  value: number;
  speed: number;
  moqFit: number;
}

export interface SupplierBests {
  overall?: Supplier;
  quality?: Supplier;
  fast?: Supplier;
  value?: Supplier;
  lowMoq?: Supplier;
}

export interface SupplierRanking {
  ranked: SupplierScore[];
  bests: SupplierBests;
}

/** Common watch-OEM capabilities — suggestions for the capabilities field. */
export const CAPABILITY_SUGGESTIONS = [
  "dials",
  "cases",
  "hands",
  "assembly",
  "engraving",
  "PVD/coating",
  "sapphire",
  "bracelets",
  "straps",
  "packaging",
];

export const supplierCaps = (s: Supplier): string[] =>
  (s.capabilities || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

const WEIGHTS = { quality: 0.35, value: 0.2, speed: 0.2, comm: 0.15, moqFit: 0.1 };

/** A 1–5 rating to a 0–100 percent; unset (0) → neutral 60. */
const ratingPct = (r: string): number => {
  const n = num(r);
  return n > 0 ? Math.round((Math.min(5, n) / 5) * 100) : 60;
};

/** Lower-is-better normalization across the set; unknown → neutral 60. */
const invNorm = (vals: number[], v: number): number => {
  if (v <= 0) return 60;
  const present = vals.filter((x) => x > 0);
  if (!present.length) return 60;
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (max === min) return 100;
  return Math.round((1 - (v - min) / (max - min)) * 100);
};

/**
 * Rank suppliers by composite score. Pass a `capability` to rank only those who
 * list it. "Best for" picks skip Retired suppliers (you wouldn't reach for one).
 */
export function rankSuppliers(list: Supplier[], capability = ""): SupplierRanking {
  const cap = capability.trim().toLowerCase();
  const pool = cap ? list.filter((s) => supplierCaps(s).some((c) => c.toLowerCase().includes(cap))) : list;
  const leadVals = pool.map((s) => num(s.leadTime));
  const moqVals = pool.map((s) => num(s.moq));

  const ranked: SupplierScore[] = pool
    .map((s) => {
      const quality = ratingPct(s.quality);
      const comm = ratingPct(s.communication);
      const value = ratingPct(s.price);
      const speed = invNorm(leadVals, num(s.leadTime));
      const moqFit = invNorm(moqVals, num(s.moq));
      const score = Math.round(
        quality * WEIGHTS.quality +
          value * WEIGHTS.value +
          speed * WEIGHTS.speed +
          comm * WEIGHTS.comm +
          moqFit * WEIGHTS.moqFit,
      );
      return { supplier: s, score, quality, comm, value, speed, moqFit };
    })
    .sort((a, b) => b.score - a.score);

  const active = ranked.filter((r) => r.supplier.status !== "Retired");
  const topBy = (key: "quality" | "comm" | "value" | "speed" | "moqFit") =>
    active.length ? [...active].sort((a, b) => b[key] - a[key])[0].supplier : undefined;

  const bests: SupplierBests = {
    overall: active[0]?.supplier,
    quality: topBy("quality"),
    fast: topBy("speed"),
    value: topBy("value"),
    lowMoq: topBy("moqFit"),
  };
  return { ranked, bests };
}
