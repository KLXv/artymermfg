/**
 * Migration + JSON backup/restore — ported from ArtymerCockpit.jsx.
 *
 * This is the data vehicle into the Supabase-backed version: the existing
 * export → import JSON round-trip must keep working so real data (LóFő, HFN)
 * survives. Functions here are pure transforms; the repo layer wires them to
 * persistence.
 */
import { STAGES } from "./constants";
import { blankAccount, blankProject, today } from "./factories";
import type { Account, Company, ContentItem, Expense, Project, Supplier, Task } from "./types";

export interface Backup {
  artymer: "cockpit-backup";
  schema: number;
  exported: string;
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  suppliers: Record<string, Supplier>;
  tasks: Record<string, Task>;
  expenses: Expense[];
  company: Company;
  content?: Record<string, ContentItem>;
}

export const buildBackup = (s: {
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  suppliers: Record<string, Supplier>;
  tasks: Record<string, Task>;
  expenses: Expense[];
  company: Company;
  content?: Record<string, ContentItem>;
}): Backup => ({
  artymer: "cockpit-backup",
  schema: 3,
  exported: today(),
  accounts: s.accounts,
  projects: s.projects,
  suppliers: s.suppliers,
  tasks: s.tasks,
  expenses: s.expenses,
  company: s.company,
  content: s.content ?? {},
});

export interface ParsedBackup {
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  suppliers: Record<string, Supplier>;
  tasks: Record<string, Task>;
  expenses?: Expense[];
  company?: Company;
  content?: Record<string, ContentItem>;
}

/**
 * Parse + validate a backup payload. Throws "empty" when it carries neither
 * accounts nor projects — matching the original guard. Records merge on top of
 * existing state at the call site (matching records overwritten, rest kept).
 */
export const parseBackup = (raw: string): ParsedBackup => {
  const d = JSON.parse(raw);
  const accounts = d.accounts || {};
  const projects = d.projects || {};
  const suppliers = d.suppliers || {};
  const tasks = d.tasks || {};
  if (!Object.keys(accounts).length && !Object.keys(projects).length) throw new Error("empty");
  return {
    accounts,
    projects,
    suppliers,
    tasks,
    expenses: Array.isArray(d.expenses) ? d.expenses : undefined,
    company: d.company || undefined,
    content: d.content || undefined,
  };
};

export interface MigrationResult {
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  /** Records created/changed by the migration, for persistence. */
  changed: { accounts: Account[]; projects: Project[] };
  migrated: boolean;
}

/**
 * Legacy migration: any project lacking an `accountId` gets a synthesized
 * client (named from its old `client`/`name` field), is normalized onto the
 * current project shape, and has its stage clamped into the known set. Runs
 * once, gated by `company.migrated`. Faithful port of the original useEffect.
 */
export const migrateLegacy = (
  company: Company,
  accountsIn: Record<string, Account>,
  projectsIn: Record<string, Project>,
): MigrationResult => {
  const accounts = { ...accountsIn };
  const projects = { ...projectsIn };
  const changed = { accounts: [] as Account[], projects: [] as Project[] };

  if (!company.migrated) {
    for (const op of Object.values(projectsIn) as (Project & { client?: string; price?: string })[]) {
      if (!op.accountId) {
        const a = blankAccount();
        a.name = op.client || op.name || "Migrated client";
        a.status = "active";
        a.servicePath = "Commission";
        const np: Project = { ...blankProject(a.id), ...op, accountId: a.id, schemaV: 2 };
        np.unitPrice = op.price || op.unitPrice || np.unitPrice;
        if (!STAGES.includes(np.stage)) np.stage = "Brief";
        accounts[a.id] = a;
        projects[np.id] = np;
        changed.accounts.push(a);
        changed.projects.push(np);
      }
    }
  }

  return { accounts, projects, changed, migrated: true };
};
