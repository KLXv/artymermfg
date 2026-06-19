import { describe, expect, it } from "vitest";
import { blankAccount, blankProject, blankTask, type Project } from "@/domain";
import {
  accountToRow,
  companyToRow,
  projectToRow,
  rowToAccount,
  rowToCompany,
  rowToProject,
  rowToTask,
  taskToRow,
} from "./mappers";
import { blankCompany } from "@/domain";

const OWNER = "00000000-0000-0000-0000-000000000000";

describe("project mapper", () => {
  it("round-trips a fully-populated project through columns + JSONB groups", () => {
    const p: Project = {
      ...blankProject("acc1"),
      id: "p1",
      name: "Falcon",
      servicePath: "Private label",
      stage: "QC",
      supplierId: "sup1",
      caseRef: "CB-42",
      cal: "NH35",
      dialMat: "German silver",
      tex: "Sunburst",
      engTxt: "Per aspera",
      center: "0.05",
      pieceName: "The Falcon",
      story: "A story.",
      cMovement: "22",
      deposit: "40",
      colors: [{ name: "Midnight", ref: "PMS 5395" }],
      images: { hero: "https://x/h.jpg", dial: "", caseImg: "", back: "", clientLogo: "", movementImg: "" },
      depositPaid: true,
      depositDate: "2026-06-01",
      qc: { received: true, results: { 1: { caliber: "pass" } }, signed: false, signedDate: "", disabled: [] },
    };
    const back = rowToProject(projectToRow(p, OWNER));
    expect(back).toEqual(p);
  });

  it("nulls empty date columns on write and restores them on read", () => {
    const p = { ...blankProject("a1"), id: "p1", deadline: "", depositExpected: "2026-07-01" };
    const row = projectToRow(p, OWNER);
    expect(row.deadline).toBeNull();
    expect(row.deposit_expected).toBe("2026-07-01");
    expect(row.owner_id).toBe(OWNER);
    expect(rowToProject(row).deadline).toBe("");
  });

  it("groups commercial controls into the controls JSONB", () => {
    const p = { ...blankProject("a1"), id: "p1", deposit: "35", lotFail: "8", rework: "3", window: "5" };
    const row = projectToRow(p, OWNER);
    expect(row.controls).toEqual({ deposit: "35", lotFail: "8", rework: "3", window: "5" });
  });
});

describe("account mapper", () => {
  it("round-trips and nulls empty dates", () => {
    const a = { ...blankAccount(), id: "a1", name: "LóFő", lastContact: "", nextDate: "2026-08-01" };
    const row = accountToRow(a, OWNER);
    expect(row.last_contact).toBeNull();
    expect(row.next_date).toBe("2026-08-01");
    expect(rowToAccount(row)).toEqual(a);
  });
});

describe("task mapper", () => {
  it("maps link fields to snake_case and back", () => {
    const t = { ...blankTask({ type: "project", id: "p1" }), id: "t1", title: "Send proposal", due: "2026-06-20" };
    const row = taskToRow(t, OWNER);
    expect(row.link_type).toBe("project");
    expect(row.link_id).toBe("p1");
    expect(rowToTask(row)).toEqual(t);
  });
});

describe("company mapper", () => {
  it("round-trips the singleton with its snake_case columns", () => {
    const c = { ...blankCompany(), migrated: true };
    const row = companyToRow(c, OWNER);
    expect(row.id).toBe("company");
    expect(row.weekly_outreach).toBe(c.weeklyOutreach);
    expect(rowToCompany(row)).toEqual(c);
  });
});
