import { describe, expect, it } from "vitest";
import { QC_CHECKS } from "./constants";
import { buildDashboard } from "./dashboard";
import { blankAccount, blankCompany, blankProject, today } from "./factories";
import type { Account, CockpitState, Project, QcUnitResult } from "./types";

const passAll = (): QcUnitResult => {
  const u: QcUnitResult = {};
  QC_CHECKS.forEach(([id]) => (u[id] = "pass"));
  return u;
};

const stateOf = (accounts: Account[], projects: Project[]): CockpitState => ({
  accounts: Object.fromEntries(accounts.map((a) => [a.id, a])),
  projects: Object.fromEntries(projects.map((p) => [p.id, p])),
  suppliers: {},
  tasks: {},
  expenses: [],
  company: blankCompany(),
});

describe("buildDashboard", () => {
  it("aggregates outstanding receivables on committed work only", () => {
    const acct = { ...blankAccount(), id: "a1", name: "LóFő" };
    const won = { ...blankProject("a1"), id: "p1", stage: "Won", qty: "30", unitPrice: "165" };
    const lead = { ...blankProject("a1"), id: "p2", stage: "Proposal", qty: "30", unitPrice: "165" };
    const d = buildDashboard(stateOf([acct], [won, lead]));
    expect(d.outstanding).toBeCloseTo(4950); // only the committed project
  });

  it("queues deposit collection for a committed, unpaid project", () => {
    const acct = { ...blankAccount(), id: "a1", name: "HFN" };
    const won = { ...blankProject("a1"), id: "p1", stage: "Won", name: "Falcon" };
    const d = buildDashboard(stateOf([acct], [won]));
    const dep = d.queue.find((q) => q.lbl.startsWith("Collect deposit"));
    expect(dep).toBeDefined();
    expect(dep?.tag).toBe("Cash");
    expect(dep?.w).toBe(2);
    expect(dep?.target).toEqual({ kind: "project", id: "p1" });
  });

  it("surfaces a QC sign-off action (weight 1) when media received and batch ACCEPTs", () => {
    const acct = { ...blankAccount(), id: "a1" };
    const passed: Project = {
      ...blankProject("a1"),
      id: "p1",
      stage: "Won",
      qty: "1",
      depositPaid: true,
      qc: { received: true, results: { 1: passAll() }, signed: false, signedDate: "" },
    };
    const d = buildDashboard(stateOf([acct], [passed]));
    const sign = d.queue.find((q) => q.lbl.startsWith("Sign off QC"));
    expect(sign).toBeDefined();
    expect(sign?.w).toBe(1);
    expect(sign?.cls).toBe("go");
    // weight-1 items sort ahead of everything else
    expect(d.queue[0].w).toBe(1);
  });

  it("queues a 'changes requested' action from a client response, not an approval", () => {
    const acct = { ...blankAccount(), id: "a1" };
    const proj = { ...blankProject("a1"), id: "p1", name: "Falcon" };
    const base = stateOf([acct], [proj]);
    const changes = buildDashboard(base, [{ projectId: "p1", title: "Falcon", decision: "changes", signer: "Eve", note: "Bigger numerals" }]);
    const item = changes.queue.find((q) => q.tag === "Client");
    expect(item?.lbl).toContain("Falcon");
    expect(item?.target).toEqual({ kind: "project", id: "p1" });
    const approved = buildDashboard(base, [{ projectId: "p1", title: "Falcon", decision: "approved", signer: "Eve", note: "" }]);
    expect(approved.queue.find((q) => q.tag === "Client")).toBeUndefined();
  });

  it("counts outreach logged within the last 7 days against the weekly target", () => {
    const fresh = { ...blankAccount(), id: "a1", status: "prospect" as const, lastContact: today() };
    const stale = { ...blankAccount(), id: "a2", status: "prospect" as const, lastContact: "2000-01-01" };
    const d = buildDashboard(stateOf([fresh, stale], []));
    expect(d.outreachWk).toBe(1);
    expect(d.leads).toHaveLength(2);
    expect(d.behindOutreach).toBe(true); // target 25
  });
});
