/**
 * Project financial derivations — ported verbatim from ArtymerCockpit.jsx.
 *
 * The original defined these as closures over component state. Here they are
 * pure functions taking their dependencies (accounts map, company) explicitly,
 * so behaviour is identical but the logic is testable in isolation.
 */
import { STAGES } from "./constants";
import { num } from "./format";
import type { Account, Company, Project } from "./types";

type AccountMap = Record<string, Account>;

export const acctName = (pr: Project | undefined, accounts: AccountMap): string =>
  accounts[pr?.accountId ?? ""]?.name || "Unassigned";

export const svcOf = (pr: Project, accounts: AccountMap): string =>
  pr.servicePath || accounts[pr.accountId]?.servicePath || "Commission";

/** A project commercial control, falling back to the company default when blank. */
export const cfg = (pr: Project, key: "deposit" | "lotFail" | "rework" | "window", company: Company): string =>
  pr[key] === "" || pr[key] == null ? company[key] : pr[key];

export const rateOf = (cur: string, company: Company): number =>
  cur === "EUR" ? 1 : num(company?.fx?.[cur]) || 1;

/**
 * How the build cost is captured.
 *
 * Nearly always the factory quotes one price for a finished watch, and the only
 * other real numbers are freight and customs — so "simple" is the default and
 * `cUnit` carries the quote. The per-part build-up is for the rare job that is
 * actually costed component by component; it stays available and, when used,
 * feeds exactly the same total.
 */
export type CostMode = "simple" | "itemised";

/** The seven component lines — only meaningful in itemised mode. */
export const PART_COST_FIELDS = [
  "cMovement", "cCase", "cDial", "cHands", "cCrystal", "cStrap", "cAssembly",
] as const satisfies readonly (keyof Project)[];

/** Landed costs that apply either way: they sit on top of the build cost. */
export const EXTRA_COST_FIELDS = ["cPack", "cShip", "cDuty", "cOther"] as const satisfies readonly (keyof Project)[];

/**
 * The mode for a project. Unset (every project that predates the choice) is
 * inferred from the data: if any component line is filled it was costed
 * itemised, otherwise simple — so existing numbers keep computing as before.
 */
export const costModeOf = (pr: Project): CostMode => {
  if (pr.costMode === "simple" || pr.costMode === "itemised") return pr.costMode;
  return PART_COST_FIELDS.some((k) => num(pr[k]) > 0) ? "itemised" : "simple";
};

const sum = (pr: Project, keys: readonly (keyof Project)[]): number =>
  keys.reduce((a, k) => a + num(pr[k]), 0);

/** What one finished watch costs before freight/customs — the factory's number. */
export const unitBuild = (pr: Project): number =>
  costModeOf(pr) === "itemised" ? sum(pr, PART_COST_FIELDS) : num(pr.cUnit);

/** Per-unit landed cost (no tooling, no channel fee). */
export const unitMaterial = (pr: Project): number => unitBuild(pr) + sum(pr, EXTRA_COST_FIELDS);

/** True when nothing has been costed yet — margin figures are meaningless. */
export const hasCosts = (pr: Project): boolean => unitMaterial(pr) > 0 || num(pr.tooling) > 0;

/** Payment-channel fee per unit (% of the sale price). */
export const feePerUnit = (pr: Project): number => num(pr.unitPrice) * (num(pr.feePct) / 100);

/** Full per-unit cost: material + amortized tooling + channel fee. */
export const unitCOGS = (pr: Project): number =>
  unitMaterial(pr) + (num(pr.qty) ? num(pr.tooling) / num(pr.qty) : 0) + feePerUnit(pr);

export interface FinanceBreakdown {
  rate: number;
  qtyN: number;
  unitPrice: number; // € per unit
  unitMaterial: number; // € per unit
  toolingPerUnit: number; // € per unit
  fee: number; // € per unit
  unitCost: number; // € full per-unit cost
  unitProfit: number; // €
  contribution: number; // € per unit toward one-offs (price − material − fee)
  toolingTotal: number; // €
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  /** Units needed to cover one-off tooling; null when contribution ≤ 0. */
  breakEvenUnits: number | null;
}

/**
 * The full money picture for a project, in euros. Builds on projFin but breaks
 * cost into material / tooling / channel fee and adds per-unit profit, the
 * contribution margin, and break-even.
 */
export const projFinance = (pr: Project, company: Company): FinanceBreakdown => {
  const rate = rateOf(pr.currency, company);
  const costRate = rateOf(costCurrencyOf(pr), company);
  const qtyN = num(pr.qty);
  const fin = projFin(pr, company);
  const mat = unitMaterial(pr) * costRate;
  const fee = feePerUnit(pr) * rate;
  const price = num(pr.unitPrice) * rate;
  const toolingTotal = num(pr.tooling) * costRate;
  const toolingPerUnit = qtyN ? toolingTotal / qtyN : 0;
  const unitCost = mat + fee + toolingPerUnit;
  const contribution = price - mat - fee;
  return {
    rate,
    qtyN,
    unitPrice: price,
    unitMaterial: mat,
    toolingPerUnit,
    fee,
    unitCost,
    unitProfit: price - unitCost,
    contribution,
    toolingTotal,
    revenue: fin.rev,
    cost: fin.cost,
    profit: fin.profit,
    margin: fin.margin,
    breakEvenUnits: contribution > 0 ? Math.ceil(toolingTotal / contribution) : null,
  };
};

export interface ProjFin {
  rev: number;
  cost: number;
  profit: number;
  margin: number;
}

/**
 * The currency the supplier quotes in, which is rarely the one you sell in —
 * factory prices arrive in USD while the job is sold in RON or EUR. Falls back
 * to the project currency, so a project from before the split is unchanged.
 */
export const costCurrencyOf = (pr: Project): string => pr.costCurrency || pr.currency;

export const projFin = (pr: Project, company: Company): ProjFin => {
  const priceRate = rateOf(pr.currency, company);
  const costRate = rateOf(costCurrencyOf(pr), company);
  const q = num(pr.qty);
  const rev = num(pr.unitPrice) * q * priceRate;
  // Build and landed costs convert at the supplier's rate; the channel fee is a
  // percentage of the sale price, so it converts at the price rate.
  const cost = unitMaterial(pr) * costRate * q + feePerUnit(pr) * priceRate * q + num(pr.tooling) * costRate;
  return { rev, cost, profit: rev - cost, margin: rev ? ((rev - cost) / rev) * 100 : 0 };
};

export const stageIdx = (pr: Project): number => STAGES.indexOf(pr.stage);

export const committed = (pr: Project): boolean =>
  !pr.lost && stageIdx(pr) >= STAGES.indexOf("Won");

export const dep = (pr: Project, company: Company): number =>
  projFin(pr, company).rev * (num(cfg(pr, "deposit", company)) / 100);

export const bal = (pr: Project, company: Company): number =>
  projFin(pr, company).rev - dep(pr, company);

export const owed = (pr: Project, company: Company): number =>
  committed(pr)
    ? (pr.depositPaid ? 0 : dep(pr, company)) + (pr.balancePaid ? 0 : bal(pr, company))
    : 0;
