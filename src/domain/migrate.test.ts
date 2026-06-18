import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { buildBackup, migrateLegacy, parseBackup } from "./migrate";
import type { Project } from "./types";

describe("backup round-trip", () => {
  it("builds a schema-3 backup and parses it back", () => {
    const acct = { ...blankAccount(), id: "a1", name: "LóFő" };
    const proj = { ...blankProject("a1"), id: "p1", name: "Falcon" };
    const backup = buildBackup({
      accounts: { a1: acct },
      projects: { p1: proj },
      suppliers: {},
      tasks: {},
      expenses: [],
      company: blankCompany(),
    });
    expect(backup.schema).toBe(3);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.accounts.a1.name).toBe("LóFő");
    expect(parsed.projects.p1.name).toBe("Falcon");
  });

  it("rejects a payload with neither accounts nor projects", () => {
    expect(() => parseBackup(JSON.stringify({ suppliers: {} }))).toThrow("empty");
  });
});

describe("migrateLegacy", () => {
  it("synthesizes a client for an account-less legacy project and normalizes it", () => {
    const legacy = {
      ...blankProject(""),
      id: "old1",
      accountId: "",
      stage: "WeirdStage",
      client: "LóFő",
      price: "150",
    } as Project & { client: string; price: string };
    const res = migrateLegacy(blankCompany(), {}, { old1: legacy });
    expect(res.changed.accounts).toHaveLength(1);
    const acct = res.changed.accounts[0];
    expect(acct.name).toBe("LóFő");
    expect(acct.status).toBe("active");
    const migrated = res.projects[legacy.id];
    expect(migrated.accountId).toBe(acct.id);
    expect(migrated.unitPrice).toBe("150"); // legacy `price` mapped
    expect(migrated.stage).toBe("Brief"); // unknown stage clamped
  });

  it("does nothing once the company is already migrated", () => {
    const company = { ...blankCompany(), migrated: true };
    const legacy = { ...blankProject(""), id: "old1", accountId: "" };
    const res = migrateLegacy(company, {}, { old1: legacy });
    expect(res.changed.projects).toHaveLength(0);
  });

  it("leaves projects that already have an account untouched", () => {
    const p = { ...blankProject("a1"), id: "p1" };
    const res = migrateLegacy(blankCompany(), {}, { p1: p });
    expect(res.changed.projects).toHaveLength(0);
  });
});
