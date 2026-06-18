/** Small formatting + date helpers — ported verbatim from ArtymerCockpit.jsx. */
import { today } from "./factories";

export const num = (x: unknown): number => parseFloat(x as string) || 0;

export const money = (n: number, c?: string): string =>
  (c || "€") + Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

/** Spec placeholder: a present value, or an underscored blank. */
export const V = (x: unknown): string => (x && String(x).trim() ? String(x) : "________");

/** Dimension with tolerance: "12 ± 0.10 mm" or an underscored blank. */
export const D = (x: unknown, t: unknown, u: string): string =>
  x && String(x).trim() ? `${x} ± ${t || "0"} ${u}` : `________ ± ___ ${u}`;

export const RULE = "──────────────────────────────────────────────";

export const parseD = (s: string): Date | null => {
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t);
};

/** Whole days from today until `s` (negative if past). */
export const dFromNow = (s: string): number | null => {
  const d = parseD(s);
  if (!d) return null;
  return Math.round((d.getTime() - new Date(today()).getTime()) / 86400000);
};

/** Whole days since `s` (negative if future). */
export const dAgo = (s: string): number | null => {
  const d = parseD(s);
  if (!d) return null;
  return Math.round((new Date(today()).getTime() - d.getTime()) / 86400000);
};
