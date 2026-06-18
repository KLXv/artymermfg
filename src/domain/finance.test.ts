import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { bal, committed, dep, owed, projFin, rateOf, stageIdx, svcOf, unitCOGS } from "./finance";
import type { Account, Company, Project } from "./types";

const company = (): Company => blankCompany();

const project = (over: Partial<Project> = {}): Project => ({
  ...blankProject("acct1"),
  qty: "30",
  unitPrice: "165",
  currency: "EUR",
  ...over,
});

describe("projFin", () => {
  it("computes batch revenue, cost, profit and margin", () => {
    const p = project({
      qty: "30",
      unitPrice: "165",
      cMovement: "40",
      cCase: "20",
      cDial: "10",
      tooling: "300",
    });
    const fin = projFin(p, company());
    // rev = 165 * 30 = 4950
    expect(fin.rev).toBe(4950);
    // unit cogs = 40+20+10 + 300/30 = 80; cost = 80*30 = 2400
    expect(fin.cost).toBe(2400);
    expect(fin.profit).toBe(2550);
    expect(Math.round(fin.margin)).toBe(52);
  });

  it("returns zero margin when there is no revenue", () => {
    expect(projFin(project({ unitPrice: "0" }), company()).margin).toBe(0);
  });
});

describe("FX conversion", () => {
  it("leaves EUR at parity and converts others by company rate", () => {
    const c = company();
    expect(rateOf("EUR", c)).toBe(1);
    expect(rateOf("RON", c)).toBe(0.2);
    expect(rateOf("USD", c)).toBe(0.92);
  });

  it("applies the rate to revenue", () => {
    const p = project({ currency: "RON", unitPrice: "1000", qty: "10" });
    // 1000 * 10 * 0.2 = 2000
    expect(projFin(p, company()).rev).toBe(2000);
  });
});

describe("unitCOGS", () => {
  it("amortizes tooling across the quantity", () => {
    expect(unitCOGS(project({ qty: "10", tooling: "100", cCase: "5" }))).toBe(15);
  });
  it("ignores tooling when qty is zero", () => {
    expect(unitCOGS(project({ qty: "0", tooling: "100", cCase: "5" }))).toBe(5);
  });
});

describe("commitment + deposit/balance/owed", () => {
  it("is committed only at Won or later and not lost", () => {
    expect(committed(project({ stage: "Proposal" }))).toBe(false);
    expect(committed(project({ stage: "Won" }))).toBe(true);
    expect(committed(project({ stage: "Production" }))).toBe(true);
    expect(committed(project({ stage: "Won", lost: true }))).toBe(false);
  });

  it("splits deposit and balance by the deposit percentage", () => {
    const c = company(); // 30% deposit
    const p = project({ stage: "Won" });
    expect(dep(p, c)).toBeCloseTo(4950 * 0.3);
    expect(bal(p, c)).toBeCloseTo(4950 * 0.7);
  });

  it("owes nothing until committed", () => {
    expect(owed(project({ stage: "Proposal" }), company())).toBe(0);
  });

  it("owes deposit + balance when committed and unpaid, less what is paid", () => {
    const c = company();
    const full = owed(project({ stage: "Won" }), c);
    expect(full).toBeCloseTo(4950);
    const depositPaid = owed(project({ stage: "Won", depositPaid: true }), c);
    expect(depositPaid).toBeCloseTo(4950 * 0.7);
  });

  it("uses the project deposit override over the company default", () => {
    const c = company();
    const p = project({ stage: "Won", deposit: "50" });
    expect(dep(p, c)).toBeCloseTo(4950 * 0.5);
  });
});

describe("svcOf", () => {
  it("prefers the project path, then the account, then Commission", () => {
    const accounts: Record<string, Account> = {
      acct1: { ...blankAccount(), id: "acct1", servicePath: "Private label" },
    };
    expect(svcOf(project({ servicePath: "Commission" }), accounts)).toBe("Commission");
    expect(svcOf(project({ servicePath: "" }), accounts)).toBe("Private label");
    expect(svcOf(project({ servicePath: "", accountId: "missing" }), accounts)).toBe("Commission");
  });
});

describe("stageIdx", () => {
  it("orders pipeline before production", () => {
    expect(stageIdx(project({ stage: "Proposal" }))).toBeLessThan(stageIdx(project({ stage: "QC" })));
  });
});
