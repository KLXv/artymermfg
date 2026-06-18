import { describe, expect, it } from "vitest";
import { blankCompany, blankProject } from "./factories";
import { cashFlowForecast, marginAnalysis, monthlyBurn, receivablesAging, scheduledInflows } from "./money";
import type { Expense, Project } from "./types";

const company = blankCompany();
const today = "2026-06-18";

/** ISO date `n` days from the real today (for aging, which anchors to today()). */
const rel = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const won = (over: Partial<Project>): Project => ({
  ...blankProject("a1"),
  stage: "Won",
  qty: "30",
  unitPrice: "100", // rev 3000, deposit 30% = 900, balance 2100
  ...over,
});

describe("monthlyBurn", () => {
  it("sums the overhead ledger", () => {
    const expenses: Expense[] = [
      { label: "Software", amount: "120" },
      { label: "Studio", amount: "380" },
    ];
    expect(monthlyBurn(expenses)).toBe(500);
  });
});

describe("scheduledInflows", () => {
  it("emits unpaid deposit and balance for committed projects only", () => {
    const list = [won({ id: "p1" }), blankProject("a1")]; // second is Proposal (uncommitted)
    const inflows = scheduledInflows(list, company);
    expect(inflows).toHaveLength(2);
    expect(inflows.map((i) => i.amount).sort((a, b) => a - b)).toEqual([900, 2100]);
  });

  it("omits already-paid legs", () => {
    const list = [won({ id: "p1", depositPaid: true })];
    const inflows = scheduledInflows(list, company);
    expect(inflows).toHaveLength(1);
    expect(inflows[0].amount).toBeCloseTo(2100);
  });
});

describe("cashFlowForecast", () => {
  it("buckets inflows by month against the overhead burn, cumulatively", () => {
    const list = [won({ id: "p1", depositExpected: "2026-07-15", balanceExpected: "2026-09-01" })];
    const expenses: Expense[] = [{ label: "ops", amount: "500" }];
    const f = cashFlowForecast(list, expenses, company, 6, today);

    expect(f.map((m) => m.month)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(f[0]).toMatchObject({ inflow: 0, outflow: 500, net: -500, cumulative: -500 });
    expect(f[1]).toMatchObject({ inflow: 900, net: 400, cumulative: -100 });
    expect(f[3]).toMatchObject({ inflow: 2100, net: 1600, cumulative: 1000 });
  });

  it("pulls overdue/undated inflows into the first month", () => {
    const list = [won({ id: "p1", depositExpected: "2025-01-01", balanceExpected: "" })];
    const f = cashFlowForecast(list, [], company, 3, today);
    // 900 (overdue) into June, 2100 (undated) into June too
    expect(f[0].inflow).toBeCloseTo(3000);
  });
});

describe("receivablesAging", () => {
  it("buckets outstanding receivables by overdue age", () => {
    const list = [
      won({ id: "p1", depositExpected: rel(-45), balanceExpected: rel(30) }), // dep overdue 45d, bal not due
      won({ id: "p2", depositExpected: rel(-10), depositPaid: false, balancePaid: true }), // dep overdue 10d
    ];
    const r = receivablesAging(list, company);
    expect(r.d0_30.amount).toBeCloseTo(900); // p2 deposit
    expect(r.d60plus.amount).toBe(0);
    expect(r.d31_60.amount).toBeCloseTo(900); // p1 deposit
    expect(r.notDue.amount).toBeCloseTo(2100); // p1 balance future
    expect(r.totalOverdue).toBeCloseTo(1800);
    expect(r.total).toBeCloseTo(3900);
  });

  it("treats uncommitted projects as having no receivables", () => {
    const r = receivablesAging([blankProject("a1")], company);
    expect(r.total).toBe(0);
  });
});

describe("marginAnalysis", () => {
  it("sorts worst-first and flags thin margins", () => {
    const thin = won({ id: "p1", cMovement: "80" }); // cost 80/unit → margin 20%
    const fat = won({ id: "p2", cMovement: "20" }); // margin 80%
    const a = marginAnalysis([fat, thin], company, 30);
    expect(a.rows[0].project.id).toBe("p1"); // worst first
    expect(a.rows[0].margin).toBeCloseTo(20);
    expect(a.thinCount).toBe(1);
  });

  it("computes the blended margin across projects", () => {
    const list = [won({ id: "p1", cMovement: "50" }), won({ id: "p2", cMovement: "50" })];
    const a = marginAnalysis(list, company);
    expect(a.blendedMargin).toBeCloseTo(50);
  });
});
