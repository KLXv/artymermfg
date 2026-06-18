import { describe, expect, it } from "vitest";
import { QC_CHECKS } from "./constants";
import { blankCompany, blankProject } from "./factories";
import { projVerdict } from "./qc";
import type { Project, QcUnitResult } from "./types";

const passAll = (): QcUnitResult => {
  const u: QcUnitResult = {};
  QC_CHECKS.forEach(([id]) => (u[id] = "pass"));
  return u;
};

const withResults = (qty: number, results: Record<number, QcUnitResult>): Project => ({
  ...blankProject("a"),
  qty: String(qty),
  qc: { received: false, results, signed: false, signedDate: "" },
});

describe("projVerdict", () => {
  it("is PENDING with no units", () => {
    expect(projVerdict(withResults(0, {}), blankCompany()).verdict).toBe("PENDING");
  });

  it("is PENDING while any unit is unresolved", () => {
    const p = withResults(3, { 1: passAll(), 2: passAll() }); // unit 3 untouched
    const v = projVerdict(p, blankCompany());
    expect(v.passU).toBe(2);
    expect(v.pendU).toBe(1);
    expect(v.verdict).toBe("PENDING");
  });

  it("ACCEPTs when every inspected unit passes within threshold", () => {
    const results: Record<number, QcUnitResult> = {};
    for (let i = 1; i <= 4; i++) results[i] = passAll();
    const v = projVerdict(withResults(4, results), blankCompany());
    expect(v.passU).toBe(4);
    expect(v.verdict).toBe("ACCEPT");
  });

  it("REJECTs when the fail rate exceeds the lot-fail threshold", () => {
    // company default lotFail = 5%. 1 fail of 4 = 25% > 5% → REJECT.
    const results: Record<number, QcUnitResult> = { 1: passAll(), 2: passAll(), 3: passAll() };
    results[4] = { ...passAll(), caliber: "fail" };
    const v = projVerdict(withResults(4, results), blankCompany());
    expect(v.failU).toBe(1);
    expect(v.failRate).toBeCloseTo(25);
    expect(v.verdict).toBe("REJECT");
  });

  it("fails a unit on any single failed check", () => {
    const v = projVerdict(withResults(1, { 1: { ...passAll(), sweep: "fail" } }), blankCompany());
    expect(v.statusOf(1)).toBe("fail");
  });
});
