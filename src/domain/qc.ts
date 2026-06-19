/**
 * QC verdict engine — ported verbatim from ArtymerCockpit.jsx.
 *
 * Per-unit checklist → unit status (pass / fail / pending) → lot verdict.
 * A unit fails on any failed check; passes only when every check passes;
 * otherwise pending. The lot REJECTs when the fail rate exceeds the lot-fail
 * threshold, is PENDING while any unit is unresolved, and ACCEPTs only when
 * every inspected unit passes within threshold.
 */
import { QC_CHECKS } from "./constants";
import { cfg } from "./finance";
import { num } from "./format";
import type { Company, Project } from "./types";

export type UnitStatus = "pass" | "fail" | "pending";
export type Verdict = "ACCEPT" | "REJECT" | "PENDING";

export interface ProjVerdict {
  qtyN: number;
  passU: number;
  failU: number;
  pendU: number;
  failRate: number;
  verdict: Verdict;
  statusOf: (n: number) => UnitStatus;
}

export const projVerdict = (pr: Project, company: Company): ProjVerdict => {
  const qtyN = Math.max(0, parseInt(pr.qty) || 0);
  const results = pr.qc?.results || {};
  const disabled = new Set(pr.qc?.disabled || []);
  const checks = QC_CHECKS.filter(([id]) => !disabled.has(id));
  const statusOf = (n: number): UnitStatus => {
    const u = results[n] || {};
    const v = checks.map(([id]) => u[id]);
    if (v.some((x) => x === "fail")) return "fail";
    if (v.length > 0 && v.every((x) => x === "pass")) return "pass";
    return "pending";
  };
  let passU = 0;
  let failU = 0;
  for (let i = 1; i <= qtyN; i++) {
    const s = statusOf(i);
    if (s === "pass") passU++;
    else if (s === "fail") failU++;
  }
  const pendU = qtyN - passU - failU;
  const failRate = qtyN ? (failU / qtyN) * 100 : 0;
  const verdict: Verdict =
    qtyN === 0
      ? "PENDING"
      : failRate > num(cfg(pr, "lotFail", company))
        ? "REJECT"
        : pendU > 0
          ? "PENDING"
          : "ACCEPT";
  return { qtyN, passU, failU, pendU, failRate, verdict, statusOf };
};
