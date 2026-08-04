/** Small formatting + date helpers — ported verbatim from ArtymerCockpit.jsx. */
import { today } from "./factories";
import type { Company } from "./types";

export const num = (x: unknown): number => parseFloat(x as string) || 0;

export const money = (n: number, c?: string): string =>
  (c || "€") + Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ---- multi-currency display ------------------------------------------- */
/** Currencies the cockpit can display. EUR is the base every figure is stored in. */
export type Ccy = "EUR" | "RON" | "USD";
export const CCY: Ccy[] = ["EUR", "RON", "USD"];

/**
 * Convert a base-EUR amount into `ccy`. The company FX map stores each unit's
 * value in EUR (e.g. RON 0.2 = 1 lei is €0.20), so EUR → ccy divides by the rate.
 */
export const fromEur = (eur: number, ccy: Ccy, fx: Record<string, number>): number =>
  ccy === "EUR" ? eur : eur / (fx[ccy] || 1);

/** Format an already-converted amount with the right symbol/placement (lei trails). */
export const fmtCcy = (v: number, ccy: Ccy): string => {
  const s = Math.round(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return ccy === "RON" ? `${s} lei` : (ccy === "USD" ? "$" : "€") + s;
};

/** Format a base-EUR amount directly in the chosen currency. */
export const moneyIn = (eur: number, ccy: Ccy, fx: Record<string, number>): string =>
  fmtCcy(fromEur(eur, ccy, fx), ccy);

/** Value of one unit of `ccy` in EUR (the FX pivot). EUR = 1. */
const eurRate = (ccy: Ccy, fx: Record<string, number>): number => (ccy === "EUR" ? 1 : fx[ccy] || 1);

/** Convert an amount between any two currencies via the EUR pivot. */
export const convertCcy = (amount: number, from: Ccy, to: Ccy, fx: Record<string, number>): number =>
  from === to ? amount : (amount * eurRate(from, fx)) / eurRate(to, fx);

/**
 * Format a base-EUR amount in the company's home currency.
 *
 * Every figure the domain produces is normalised to EUR (see `rateOf`), so this
 * has to convert. It used to only restamp the symbol, which printed euro
 * amounts under a "lei" label — the deck could say "you're owed 12,552 euros"
 * directly above a tile reading "12,552 lei" for the same money.
 */
export const baseMoney = (eur: number, company: Company): string =>
  moneyIn(eur, (company.baseCurrency as Ccy) || "EUR", company.fx);

/**
 * Amounts the operator types directly — overheads, the monthly target — are in
 * the home currency already, not the EUR the domain normalises to. These format
 * and convert them without the extra hop that would inflate them by the rate.
 */
export const homeMoney = (amount: number, company: Company): string =>
  fmtCcy(amount, (company.baseCurrency as Ccy) || "EUR");

/** A home-currency amount, converted into the EUR everything is compared in. */
export const homeToEur = (amount: number, company: Company): number => {
  const base = (company.baseCurrency as Ccy) || "EUR";
  return base === "EUR" ? amount : amount * (company.fx?.[base] || 1);
};

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
