import { describe, expect, it } from "vitest";
import { buildDashboard } from "./dashboard";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { coFounderAnswer, coFounderBriefing, coFounderFacts } from "./cofounder";
import type { CockpitState } from "./types";

const state = (over: Partial<CockpitState> = {}): CockpitState => ({
  accounts: {},
  projects: {},
  suppliers: {},
  tasks: {},
  expenses: [],
  company: blankCompany(),
  ...over,
});

const withLead = () => {
  const a = { ...blankAccount(), id: "a1", name: "LóFő", status: "prospect" as const };
  const p = { ...blankProject("a1"), id: "p1", name: "Falcon", stage: "Production", unitPrice: "100", qty: "10" };
  return buildDashboard(state({ accounts: { a1: a }, projects: { p1: p } }));
};

describe("co-founder brain", () => {
  it("greets with a data-aware briefing that names the operator", () => {
    const out = coFounderBriefing(withLead(), "Bence");
    expect(out).toContain("Bence");
    expect(out).toMatch(/lead/);
    expect(out).toMatch(/production/);
  });

  it("routes money / leads / focus questions to local answers", () => {
    const d = withLead();
    expect(coFounderAnswer("how's the money?", d).handled).toBe(true);
    expect(coFounderAnswer("how's the money?", d).text).toMatch(/euro/);
    expect(coFounderAnswer("show me my leads", d).text).toContain("LóFő");
    expect(coFounderAnswer("what should I do today", d).handled).toBe(true);
  });

  it("hands open-ended questions off (for the AI upgrade)", () => {
    expect(coFounderAnswer("write a haiku about bronze patina", withLead()).handled).toBe(false);
  });

  it("grounds the LLM prompt with real figures", () => {
    expect(coFounderFacts(withLead())).toMatch(/Revenue booked/);
  });
});
