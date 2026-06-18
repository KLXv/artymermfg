import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject, blankTask } from "./factories";
import { contactsDue, pipelineMetrics, planAdvance } from "./pipeline";
import type { Account, Project, Task } from "./types";

const company = blankCompany();
const today = "2026-06-18";

describe("planAdvance", () => {
  it("moves to the next stage and generates the canonical next-action task", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Brief" };
    const eff = planAdvance(p, [], today);
    expect(eff.canAdvance).toBe(true);
    expect(eff.nextStage).toBe("Design");
    expect(eff.patch.stage).toBe("Design");
    expect(eff.newTask?.title).toBe("Get CAD approval"); // NEXT["Design"]
    expect(eff.newTask?.linkType).toBe("project");
    expect(eff.newTask?.linkId).toBe("p1");
    expect(eff.newTask?.source).toBe("stage");
    expect(eff.newTask?.due).toBe("2026-06-21"); // today + 3
  });

  it("fills the deposit-expected date when entering Won, only if blank", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Negotiating", depositExpected: "" };
    const eff = planAdvance(p, [], today);
    expect(eff.nextStage).toBe("Won");
    expect(eff.patch.depositExpected).toBe("2026-06-23"); // today + 5

    const withDate: Project = { ...p, depositExpected: "2026-07-01" };
    expect(planAdvance(withDate, [], today).patch.depositExpected).toBeUndefined();
  });

  it("sets balance-expected to the deadline when entering QC", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Production", deadline: "2026-09-01", balanceExpected: "" };
    const eff = planAdvance(p, [], today);
    expect(eff.nextStage).toBe("QC");
    expect(eff.patch.balanceExpected).toBe("2026-09-01");
  });

  it("does not duplicate an already-open next-action task", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Brief" };
    const existing: Task = { ...blankTask({ type: "project", id: "p1" }), title: "Get CAD approval", done: false };
    const eff = planAdvance(p, [existing], today);
    expect(eff.newTask).toBeNull();
  });

  it("is a no-op at the final stage", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Delivered" };
    const eff = planAdvance(p, [], today);
    expect(eff.canAdvance).toBe(false);
    expect(eff.patch).toEqual({});
    expect(eff.newTask).toBeNull();
  });
});

describe("pipelineMetrics", () => {
  const mk = (over: Partial<Project>): Project => ({ ...blankProject("a1"), qty: "30", unitPrice: "100", ...over });

  it("separates speculative from committed value and excludes delivered/lost", () => {
    const projList = [
      mk({ id: "p1", stage: "Proposal" }), // speculative 3000
      mk({ id: "p2", stage: "Won" }), // committed 3000
      mk({ id: "p3", stage: "Delivered" }), // excluded from open value
      mk({ id: "p4", stage: "Negotiating", lost: true }), // lost
    ];
    const m = pipelineMetrics(projList, company);
    expect(m.open).toHaveLength(2); // p1, p2 (p3 delivered, p4 lost both out)
    expect(m.prospectValue).toBeCloseTo(3000);
    expect(m.committedValue).toBeCloseTo(3000);
  });

  it("weights open value by stage probability", () => {
    const projList = [mk({ id: "p1", stage: "Proposal" })]; // 3000 * 0.2
    const m = pipelineMetrics(projList, company);
    expect(m.weighted).toBeCloseTo(600);
  });

  it("computes win rate from committed vs lost", () => {
    const projList = [
      mk({ id: "p1", stage: "Delivered" }), // won (committed)
      mk({ id: "p2", stage: "Won" }), // won
      mk({ id: "p3", stage: "Proposal", lost: true }), // lost
    ];
    const m = pipelineMetrics(projList, company);
    expect(m.wonCount).toBe(2);
    expect(m.lostCount).toBe(1);
    expect(m.winRate).toBeCloseTo((2 / 3) * 100);
  });
});

describe("contactsDue", () => {
  const acct = (over: Partial<Account>): Account => ({ ...blankAccount(), ...over });

  it("flags a prospect with no contact logged", () => {
    const due = contactsDue([acct({ id: "a1", status: "prospect", lastContact: "" })]);
    expect(due).toHaveLength(1);
    expect(due[0].reason).toBe("no contact logged");
  });

  it("flags an active account gone cold past the threshold", () => {
    const due = contactsDue([acct({ id: "a1", status: "active", lastContact: "2000-01-01" })], 30);
    expect(due[0].reason).toBe("going cold");
  });

  it("flags a due follow-up regardless of recency, and skips lost accounts", () => {
    const due = contactsDue([
      acct({ id: "a1", status: "active", lastContact: "2026-06-17", nextAction: "Call back", nextDate: "2026-01-01" }),
      acct({ id: "a2", status: "lost", lastContact: "" }),
    ]);
    expect(due).toHaveLength(1);
    expect(due[0].reason).toBe("follow-up due");
  });
});
