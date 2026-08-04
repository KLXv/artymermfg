import { describe, expect, it } from "vitest";
import { blankAccount, blankCandidate, blankProject, blankProspect, blankTask, type Project } from "@/domain";
import {
  accountToRow,
  candidateToRow,
  companyToRow,
  projectToRow,
  prospectToRow,
  rowToAccount,
  rowToCandidate,
  rowToCompany,
  rowToProject,
  rowToProspect,
  rowToTask,
  taskToRow,
} from "./mappers";
import { blankCompany } from "@/domain";

const OWNER = "00000000-0000-0000-0000-000000000000";

describe("project mapper", () => {
  // The only two foreign keys in the schema. Writing "" for an unset one is a
  // foreign key violation that rejects the whole project upsert, so an
  // unassigned client/supplier has to reach Postgres as NULL.
  it("writes NULL, not \"\", for an unset client or supplier", () => {
    const row = projectToRow({ ...blankProject(""), currency: "EUR", costCurrency: "EUR", id: "p1", supplierId: "" }, OWNER);
    expect(row.account_id).toBeNull();
    expect(row.supplier_id).toBeNull();
  });

  it("keeps a client and supplier that are set", () => {
    const row = projectToRow({ ...blankProject("acc1"), currency: "EUR", costCurrency: "EUR", id: "p1", supplierId: "sup1" }, OWNER);
    expect(row.account_id).toBe("acc1");
    expect(row.supplier_id).toBe("sup1");
  });

  it("restores an unset client/supplier as \"\" when reading NULL back", () => {
    const back = rowToProject(projectToRow({ ...blankProject(""), currency: "EUR", costCurrency: "EUR", id: "p1", supplierId: "" }, OWNER));
    expect(back.accountId).toBe("");
    expect(back.supplierId).toBe("");
  });

  it("round-trips a fully-populated project through columns + JSONB groups", () => {
    const p: Project = {
      ...blankProject("acc1"), currency: "EUR", costCurrency: "EUR",
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
      qc: {
        received: true,
        results: { 1: { caliber: "pass" } },
        signed: false,
        signedDate: "",
        disabled: [],
        sample: { decision: "approved", date: "2026-06-10", reviewer: "Bence", notes: "looks clean", media: "https://x/v.mp4" },
      },
    };
    const back = rowToProject(projectToRow(p, OWNER));
    expect(back).toEqual(p);
  });

  it("nulls empty date columns on write and restores them on read", () => {
    const p = { ...blankProject("a1"), currency: "EUR", costCurrency: "EUR", id: "p1", deadline: "", depositExpected: "2026-07-01" };
    const row = projectToRow(p, OWNER);
    expect(row.deadline).toBeNull();
    expect(row.deposit_expected).toBe("2026-07-01");
    expect(row.owner_id).toBe(OWNER);
    expect(rowToProject(row).deadline).toBe("");
  });

  it("groups commercial controls into the controls JSONB", () => {
    const p = { ...blankProject("a1"), currency: "EUR", costCurrency: "EUR", id: "p1", deposit: "35", lotFail: "8", rework: "3", window: "5" };
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

  it("carries the ICP config through as a JSONB blob", () => {
    const c = blankCompany();
    const row = companyToRow(c, OWNER);
    expect(row.icp).toEqual(c.icp);
    expect(rowToCompany(row).icp.segments.map((s) => s.name)).toEqual(c.icp.segments.map((s) => s.name));
  });

  it("restores a default ICP when the column is missing (pre-0011 rows)", () => {
    const row = companyToRow(blankCompany(), OWNER);
    delete row.icp;
    expect(rowToCompany(row).icp.segments.length).toBeGreaterThan(0);
  });
});

describe("prospect mapper", () => {
  it("round-trips a fully-populated prospect through columns + JSONB", () => {
    const p = {
      ...blankProspect(),
      id: "pr1",
      name: "Anna",
      org: "Lófő SE",
      role: "club president",
      segment: "Sports Club",
      city: "Miercurea Ciuc",
      market: "RO" as const,
      lang: "HU" as const,
      channel: "Email",
      email: "anna@lofo.ro",
      phone: "+40",
      signal: "Promoted in 2026",
      sourceUrl: "https://example.org/news",
      status: "Contacted" as const,
      notes: "warm",
      accountId: "a1",
      createdAt: "2026-07-01",
      touches: ["2026-07-02", "", "", "", ""],
      drafts: [
        {
          touch: 1,
          channel: "Email",
          subject: "S",
          body: "B",
          lang: "HU" as const,
          status: "approved" as const,
          approvedDate: "2026-07-02",
          sentDate: "",
        },
      ],
    };
    expect(rowToProspect(prospectToRow(p, OWNER))).toEqual(p);
  });

  it("nulls the empty account link and created date on write", () => {
    const p = { ...blankProspect(), id: "pr1", accountId: "", createdAt: "" };
    const row = prospectToRow(p, OWNER);
    expect(row.account_id).toBeNull();
    expect(row.created_at).toBeNull();
    expect(row.owner_id).toBe(OWNER);
    const back = rowToProspect(row);
    expect(back.accountId).toBe("");
    expect(back.createdAt).toBe("");
  });

  it("keeps the five touch slots and defaults drafts to an empty list", () => {
    const back = rowToProspect(prospectToRow({ ...blankProspect(), id: "pr1" }, OWNER));
    expect(back.touches).toHaveLength(5);
    expect(back.drafts).toEqual([]);
  });
});

describe("discovery candidate mapper", () => {
  it("round-trips a candidate and maps its snake_case columns", () => {
    const c = {
      ...blankCandidate(),
      id: "dc1",
      org: "Acme Kft",
      segment: "Company/HR",
      city: "Budapest",
      market: "HU" as const,
      signal: "125th anniversary in 2026",
      signalType: "anniversary",
      sourceUrl: "https://example.org/about",
      contactHint: "HR Director",
      rationale: "Milestone worth marking",
      status: "pending" as const,
      createdAt: "2026-07-01",
    };
    const row = candidateToRow(c, OWNER);
    expect(row.signal_type).toBe("anniversary");
    expect(row.source_url).toBe("https://example.org/about");
    expect(row.contact_hint).toBe("HR Director");
    expect(row.source).toBe("discovery");
    expect(rowToCandidate(row)).toEqual(c);
  });

  it("round-trips an imported PROSPECTOR lead with its scoring blob", () => {
    const c = {
      ...blankCandidate(),
      id: "dc2",
      org: "Sportklub",
      source: "prospector" as const,
      score: 87,
      prospector: {
        score: 87,
        path: "Commission" as const,
        category: "Sports club",
        county: "Harghita",
        language: "Hungarian",
        revenueRon: 6200000,
        employees: 40,
        foundingYear: 1976,
        anniversaryYears: 50,
        cashTimingRisk: "LOW" as const,
        decisionStructure: "Small leadership team (2–4)",
        identityScore: 5,
        designHours: "LOW" as const,
        logoVectorAvailable: true,
        logoSourceUrl: "https://x/logo.svg",
        projectValueEur: 7500,
        suggestedUnits: 50,
        contactRoute: "office@club.ro",
        website: "https://club.ro",
        social: "https://fb.com/club",
        disqualified: false,
        breakdown: { affordability: 30, trigger: 25 },
        brief: "## Sportklub\n\nbrief",
      },
    };
    const row = candidateToRow(c, OWNER);
    expect(row.score).toBe(87);
    expect((row.prospector as { revenueRon: number }).revenueRon).toBe(6200000);
    expect(rowToCandidate(row)).toEqual(c);
  });
});
