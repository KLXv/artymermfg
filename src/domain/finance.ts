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

export const unitCOGS = (pr: Project): number =>
  num(pr.cMovement) +
  num(pr.cCase) +
  num(pr.cDial) +
  num(pr.cAssembly) +
  num(pr.cPack) +
  num(pr.cShip) +
  num(pr.cDuty) +
  num(pr.cOther) +
  (num(pr.qty) ? num(pr.tooling) / num(pr.qty) : 0);

export interface ProjFin {
  rev: number;
  cost: number;
  profit: number;
  margin: number;
}

export const projFin = (pr: Project, company: Company): ProjFin => {
  const r = rateOf(pr.currency, company);
  const rev = num(pr.unitPrice) * num(pr.qty) * r;
  const cost = unitCOGS(pr) * num(pr.qty) * r;
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
