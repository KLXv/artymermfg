import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { referralReport, warrantyRegister } from "./strategy";

const company = blankCompany();

describe("warrantyRegister", () => {
  const delivered = (over = {}) => ({ ...blankProject("a1"), id: "p1", stage: "Delivered", ...over });

  it("only lists delivered pieces and flags status by expiry", () => {
    const active = delivered({ id: "p1", warranty: { deliveredDate: "2026-06-01", months: "12", serial: "", services: [] } });
    const expired = delivered({ id: "p2", warranty: { deliveredDate: "2000-01-01", months: "12", serial: "", services: [] } });
    const open = { ...blankProject("a1"), id: "p3", stage: "Production" };
    const rows = warrantyRegister([active, expired, open], "2026-06-20");
    expect(rows).toHaveLength(2); // the open project is excluded
    expect(rows.find((r) => r.project.id === "p1")?.status).toBe("active");
    expect(rows.find((r) => r.project.id === "p2")?.status).toBe("expired");
  });

  it("marks pieces without a delivered date as unset", () => {
    const rows = warrantyRegister([delivered({ warranty: { deliveredDate: "", months: "12", serial: "", services: [] } })]);
    expect(rows[0].status).toBe("unset");
  });
});

describe("referralReport", () => {
  it("attributes referred clients, conversions and revenue", () => {
    const a1 = { ...blankAccount(), id: "a1", name: "Won Co", referredBy: "Dan" };
    const a2 = { ...blankAccount(), id: "a2", name: "Lead Co", referredBy: "Dan" };
    const won = { ...blankProject("a1"), id: "p1", stage: "Production", qty: "10", unitPrice: "100" };
    const rows = referralReport([a1, a2], [won], company);
    expect(rows[0].referrer).toBe("Dan");
    expect(rows[0].referred).toBe(2);
    expect(rows[0].won).toBe(1);
    expect(rows[0].revenue).toBeCloseTo(1000);
  });
});
