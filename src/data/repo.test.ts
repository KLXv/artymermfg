import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "@/domain";
import type { WorkspaceState } from "@/state/store";
import { mergeWorkspaces } from "./repo";

const ws = (over: Partial<WorkspaceState> = {}): WorkspaceState => ({
  company: blankCompany(),
  accounts: {},
  projects: {},
  suppliers: {},
  tasks: {},
  expenses: [],
  content: {},
  ...over,
});

describe("mergeWorkspaces (data-loss safety net)", () => {
  it("keeps local-only records the cloud is missing", () => {
    const remote = ws({ accounts: { a1: { ...blankAccount(), id: "a1", name: "Cloud" } } });
    const local = ws({
      accounts: { a1: { ...blankAccount(), id: "a1", name: "Stale" } },
      projects: { p1: { ...blankProject("a1"), id: "p1", name: "Unsynced" } },
    });
    const merged = mergeWorkspaces(remote, local);
    // Remote wins for records it has...
    expect(merged.accounts.a1.name).toBe("Cloud");
    // ...but the local-only project survives instead of vanishing.
    expect(merged.projects.p1.name).toBe("Unsynced");
  });

  it("falls back to local expenses only when the cloud has none", () => {
    const local = ws({ expenses: [{ label: "Rent", amount: "400" }] });
    expect(mergeWorkspaces(ws(), local).expenses).toHaveLength(1);
    const remote = ws({ expenses: [{ label: "Tools", amount: "90" }] });
    expect(mergeWorkspaces(remote, local).expenses).toEqual(remote.expenses);
  });
});
