/**
 * Timezone-safety regression guard.
 *
 * The domain's date helpers must produce identical results in every timezone.
 * A previous bug parsed date strings in LOCAL time but formatted them back with
 * toISOString() (UTC), so for any operator east of London (e.g. Romania) expected
 * payment dates, task due dates, warranty expiries and the cash-flow month axis
 * all drifted by a day — while UTC-based CI stayed green and never caught it.
 *
 * This suite forces a positive-offset zone (Asia/Tokyo, UTC+9, no DST) so those
 * assertions fail loudly if the local-time pattern ever returns. Keep it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { blankCompany, blankProject } from "./factories";
import { cashFlowForecast } from "./money";
import { planAdvance } from "./pipeline";
import { warrantyRegister } from "./strategy";
import type { Project } from "./types";

const originalTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Asia/Tokyo";
});
afterAll(() => {
  process.env.TZ = originalTZ;
});

const company = blankCompany();

describe("date helpers are timezone-independent", () => {
  it("adds days to the deposit date correctly across a month boundary", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Negotiating", depositExpected: "" };
    const eff = planAdvance(p, [], "2026-08-31");
    expect(eff.patch.depositExpected).toBe("2026-09-05"); // 31 Aug + 5 days
  });

  it("sets the stage task due date correctly (today + 3)", () => {
    const p: Project = { ...blankProject("a1"), id: "p1", stage: "Negotiating" };
    const eff = planAdvance(p, [], "2026-08-30");
    expect(eff.newTask?.due).toBe("2026-09-02"); // 30 Aug + 3 days
  });

  it("starts the cash-flow forecast on the current calendar month", () => {
    const list = [{ ...blankProject("a1"), stage: "Won", qty: "1", unitPrice: "100" } as Project];
    const f = cashFlowForecast(list, [], company, 6, "2026-08-15");
    expect(f[0].month).toBe("2026-08"); // not "2026-07"
    expect(f.map((m) => m.month)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
  });

  it("computes the warranty expiry date correctly", () => {
    const p: Project = {
      ...blankProject("a1"),
      id: "p1",
      stage: "Delivered",
      warranty: { deliveredDate: "2026-01-31", months: "12", serial: "", services: [] },
    };
    const [row] = warrantyRegister([p], "2026-06-18");
    expect(row.expiry).toBe("2027-01-31"); // exactly 12 months on, not 2027-01-30
  });
});
