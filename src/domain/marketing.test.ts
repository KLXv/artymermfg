import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankContent, blankProject } from "./factories";
import { marketingMetrics } from "./marketing";

const company = blankCompany();

describe("marketingMetrics", () => {
  const insta = { ...blankAccount(), id: "a1", name: "A", source: "Instagram" };
  const ref = { ...blankAccount(), id: "a2", name: "B", source: "Referral" };
  const won = { ...blankProject("a1"), id: "p1", stage: "Production", qty: "10", unitPrice: "100" }; // committed
  const lead = { ...blankProject("a2"), id: "p2", stage: "Proposal", qty: "10", unitPrice: "100" }; // open

  it("builds a funnel and lead→won conversion", () => {
    const m = marketingMetrics([insta, ref], [won, lead], company);
    expect(m.funnel.find((f) => f.label === "Leads")?.count).toBe(2);
    expect(m.funnel.find((f) => f.label === "Proposals")?.count).toBe(1);
    expect(m.funnel.find((f) => f.label === "Won")?.count).toBe(1);
    expect(m.leadToWon).toBe(50); // 1 of 2 accounts converted
  });

  it("attributes won revenue to the right channel", () => {
    const m = marketingMetrics([insta, ref], [won, lead], company);
    const ig = m.channels.find((c) => c.source === "Instagram")!;
    expect(ig.won).toBe(1);
    expect(ig.revenue).toBeCloseTo(1000);
    const rf = m.channels.find((c) => c.source === "Referral")!;
    expect(rf.won).toBe(0);
  });

  it("rolls up content by status", () => {
    const m = marketingMetrics([], [], company, [
      { ...blankContent(), id: "c1", status: "scheduled", date: "2099-01-01" },
      { ...blankContent(), id: "c2", status: "idea" },
    ]);
    expect(m.contentByStatus.scheduled).toBe(1);
    expect(m.contentByStatus.idea).toBe(1);
    expect(m.upcoming).toHaveLength(1);
  });
});
