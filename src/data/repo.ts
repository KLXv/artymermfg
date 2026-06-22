/**
 * The Supabase repository — loads the workspace and pushes minimal diffs.
 *
 * Best-effort cloud persistence over the local-first store: writes are ordered
 * to respect the project → account/supplier foreign keys (parents before
 * children on upsert; children before parents on delete). RLS scopes every row
 * to the owner, so reads need no explicit owner filter. Callers gate on
 * `isSupabaseConfigured()`.
 */
import { blankCompany } from "@/domain";
import type { WorkspaceState } from "@/state/store";
import { supabase } from "./supabase";
import * as M from "./mappers";

const client = () => {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
};

export const isWorkspaceEmpty = (s: WorkspaceState): boolean =>
  Object.keys(s.accounts).length === 0 &&
  Object.keys(s.projects).length === 0 &&
  Object.keys(s.suppliers).length === 0 &&
  Object.keys(s.tasks).length === 0 &&
  Object.keys(s.content).length === 0 &&
  s.expenses.length === 0;

const indexById = <T extends { id: string }>(rows: T[]): Record<string, T> =>
  Object.fromEntries(rows.map((r) => [r.id, r]));

/**
 * Merge the cloud workspace with the local one, preserving any local-only
 * records the cloud is missing. This is the safety net against silent data
 * loss: if a previous push only partially succeeded (e.g. clients saved but
 * projects didn't), loading the cloud copy must not discard the local projects.
 * Remote is the base of truth for records it has; local fills the gaps.
 */
export function mergeWorkspaces(remote: WorkspaceState, local: WorkspaceState): WorkspaceState {
  const fill = <T extends { id: string }>(r: Record<string, T>, l: Record<string, T>) => {
    const out = { ...r };
    for (const id of Object.keys(l)) if (!(id in out)) out[id] = l[id];
    return out;
  };
  return {
    company: remote.company,
    accounts: fill(remote.accounts, local.accounts),
    suppliers: fill(remote.suppliers, local.suppliers),
    projects: fill(remote.projects, local.projects),
    tasks: fill(remote.tasks, local.tasks),
    content: fill(remote.content, local.content),
    expenses: remote.expenses.length ? remote.expenses : local.expenses,
  };
}

/** Load the full workspace for the signed-in owner. Throws on a hard error. */
export async function loadWorkspace(): Promise<WorkspaceState> {
  const sb = client();
  const [company, accounts, suppliers, projects, tasks, expenses, content] = await Promise.all([
    sb.from("company").select("*").maybeSingle(),
    sb.from("accounts").select("*"),
    sb.from("suppliers").select("*"),
    sb.from("projects").select("*"),
    sb.from("tasks").select("*"),
    sb.from("expenses").select("*"),
    sb.from("content").select("*"),
  ]);

  const hard = [accounts.error, suppliers.error, projects.error, tasks.error, expenses.error].find(Boolean);
  if (hard) throw hard;

  return {
    company: company.data ? M.rowToCompany(company.data as M.Row) : blankCompany(),
    accounts: indexById((accounts.data ?? []).map((r) => M.rowToAccount(r as M.Row))),
    suppliers: indexById((suppliers.data ?? []).map((r) => M.rowToSupplier(r as M.Row))),
    projects: indexById((projects.data ?? []).map((r) => M.rowToProject(r as M.Row))),
    tasks: indexById((tasks.data ?? []).map((r) => M.rowToTask(r as M.Row))),
    expenses: (expenses.data ?? []).map((r) => M.rowToExpense(r as M.Row)),
    content: indexById((content.data ?? []).map((r) => M.rowToContent(r as M.Row))),
  };
}

const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

/** ids to upsert (new or changed) and ids to delete, comparing two id-maps. */
function diffMap<T extends { id: string }>(prev: Record<string, T>, next: Record<string, T>) {
  const upserts: T[] = [];
  const deletes: string[] = [];
  for (const id of Object.keys(next)) if (!prev[id] || changed(prev[id], next[id])) upserts.push(next[id]);
  for (const id of Object.keys(prev)) if (!next[id]) deletes.push(id);
  return { upserts, deletes };
}

/**
 * Push the difference between two workspace snapshots. Ordered in phases so
 * foreign keys never dangle. Returns nothing; throws on a hard failure so the
 * caller can mark the sync errored (and keep the local copy of record).
 */
export async function pushWorkspaceDiff(ownerId: string, prev: WorkspaceState, next: WorkspaceState): Promise<void> {
  const sb = client();

  const accts = diffMap(prev.accounts, next.accounts);
  const sups = diffMap(prev.suppliers, next.suppliers);
  const projs = diffMap(prev.projects, next.projects);
  const tasks = diffMap(prev.tasks, next.tasks);
  const cont = diffMap(prev.content, next.content);

  // Phase 1 — parents (and the singleton company).
  const phase1: PromiseLike<unknown>[] = [];
  if (changed(prev.company, next.company)) phase1.push(sb.from("company").upsert(M.companyToRow(next.company, ownerId)));
  if (accts.upserts.length) phase1.push(sb.from("accounts").upsert(accts.upserts.map((a) => M.accountToRow(a, ownerId))));
  if (sups.upserts.length) phase1.push(sb.from("suppliers").upsert(sups.upserts.map((s) => M.supplierToRow(s, ownerId))));
  await Promise.all(phase1);

  // Phase 2 — projects (depend on accounts/suppliers).
  if (projs.upserts.length) await sb.from("projects").upsert(projs.upserts.map((p) => M.projectToRow(p, ownerId)));

  // Phase 3 — tasks + expenses (expenses have no stable id → replace wholesale).
  const phase3: PromiseLike<unknown>[] = [];
  if (tasks.upserts.length) phase3.push(sb.from("tasks").upsert(tasks.upserts.map((t) => M.taskToRow(t, ownerId))));
  if (cont.upserts.length) phase3.push(sb.from("content").upsert(cont.upserts.map((c) => M.contentToRow(c, ownerId))));
  if (changed(prev.expenses, next.expenses)) {
    phase3.push(
      sb
        .from("expenses")
        .delete()
        .eq("owner_id", ownerId)
        .then(() => (next.expenses.length ? sb.from("expenses").insert(M.expensesToRows(next.expenses, ownerId)) : null)),
    );
  }
  await Promise.all(phase3);

  // Phase 4 — deletes, children before parents.
  if (projs.deletes.length) await sb.from("projects").delete().in("id", projs.deletes);
  if (tasks.deletes.length) await sb.from("tasks").delete().in("id", tasks.deletes);
  if (cont.deletes.length) await sb.from("content").delete().in("id", cont.deletes);
  const phase5: PromiseLike<unknown>[] = [];
  if (accts.deletes.length) phase5.push(sb.from("accounts").delete().in("id", accts.deletes));
  if (sups.deletes.length) phase5.push(sb.from("suppliers").delete().in("id", sups.deletes));
  await Promise.all(phase5);
}
