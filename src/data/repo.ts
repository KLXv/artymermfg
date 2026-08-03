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
  Object.keys(s.invoices).length === 0 &&
  Object.keys(s.prospects).length === 0 &&
  Object.keys(s.candidates).length === 0 &&
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
    invoices: fill(remote.invoices, local.invoices),
    prospects: fill(remote.prospects, local.prospects),
    candidates: fill(remote.candidates, local.candidates),
    expenses: remote.expenses.length ? remote.expenses : local.expenses,
  };
}

/** Load the full workspace for the signed-in owner. Throws on a hard error. */
export async function loadWorkspace(): Promise<WorkspaceState> {
  const sb = client();
  const [company, accounts, suppliers, projects, tasks, expenses, content, invoices, prospects, candidates] =
    await Promise.all([
      sb.from("company").select("*").maybeSingle(),
      sb.from("accounts").select("*"),
      sb.from("suppliers").select("*"),
      sb.from("projects").select("*"),
      sb.from("tasks").select("*"),
      sb.from("expenses").select("*"),
      sb.from("content").select("*"),
      sb.from("invoices").select("*"),
      sb.from("prospects").select("*"),
      sb.from("discovery_candidates").select("*"),
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
    invoices: indexById((invoices.data ?? []).map((r) => M.rowToInvoice(r as M.Row))),
    prospects: indexById((prospects.data ?? []).map((r) => M.rowToProspect(r as M.Row))),
    candidates: indexById((candidates.data ?? []).map((r) => M.rowToCandidate(r as M.Row))),
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
 * Await a batch of PostgREST calls and throw if any of them reported an error.
 *
 * supabase-js resolves — it does not reject — when the database refuses a write
 * (RLS denial, constraint violation, unknown column). The error arrives as
 * `{ error }` on the resolved value. Without this check a failed write looked
 * like a successful one: the caller advanced its synced baseline and the UI
 * showed "synced" while the row never reached the cloud, and the diff engine
 * never retried it. Every write below must go through here.
 */
async function settle(ops: PromiseLike<unknown>[]): Promise<void> {
  const results = await Promise.all(ops);
  for (const r of results) {
    const err = (r as { error?: unknown } | null)?.error;
    if (err) throw err;
  }
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
  const invs = diffMap(prev.invoices, next.invoices);
  const pros = diffMap(prev.prospects, next.prospects);
  const cand = diffMap(prev.candidates, next.candidates);

  // Phase 1 — parents (and the singleton company).
  const phase1: PromiseLike<unknown>[] = [];
  if (changed(prev.company, next.company)) phase1.push(sb.from("company").upsert(M.companyToRow(next.company, ownerId)));
  if (accts.upserts.length) phase1.push(sb.from("accounts").upsert(accts.upserts.map((a) => M.accountToRow(a, ownerId))));
  if (sups.upserts.length) phase1.push(sb.from("suppliers").upsert(sups.upserts.map((s) => M.supplierToRow(s, ownerId))));
  await settle(phase1);

  // Phase 2 — projects (depend on accounts/suppliers).
  //
  // A project can still point at a client or supplier that has since been
  // deleted locally; that id is gone from the workspace but survives on the
  // project, and upserting it violates the foreign key. Drop references that no
  // longer resolve — the same outcome the schema's `on delete set null` gives.
  if (projs.upserts.length) {
    const accountIds = new Set(Object.keys(next.accounts));
    const supplierIds = new Set(Object.keys(next.suppliers));
    const rows = projs.upserts.map((p) => {
      const row = M.projectToRow(p, ownerId);
      if (row.account_id && !accountIds.has(String(row.account_id))) row.account_id = null;
      if (row.supplier_id && !supplierIds.has(String(row.supplier_id))) row.supplier_id = null;
      return row;
    });
    await settle([sb.from("projects").upsert(rows)]);
  }

  // Phase 3 — tasks + expenses (expenses have no stable id → replace wholesale).
  const phase3: PromiseLike<unknown>[] = [];
  if (tasks.upserts.length) phase3.push(sb.from("tasks").upsert(tasks.upserts.map((t) => M.taskToRow(t, ownerId))));
  if (cont.upserts.length) phase3.push(sb.from("content").upsert(cont.upserts.map((c) => M.contentToRow(c, ownerId))));
  if (invs.upserts.length) phase3.push(sb.from("invoices").upsert(invs.upserts.map((i) => M.invoiceToRow(i, ownerId))));
  // Prospects reference accounts by id (no DB FK); accounts are already upserted in phase 1.
  if (pros.upserts.length) phase3.push(sb.from("prospects").upsert(pros.upserts.map((p) => M.prospectToRow(p, ownerId))));
  if (cand.upserts.length)
    phase3.push(sb.from("discovery_candidates").upsert(cand.upserts.map((c) => M.candidateToRow(c, ownerId))));
  if (changed(prev.expenses, next.expenses)) {
    // Expenses have no stable id, so the ledger is replaced wholesale. Both legs
    // are checked: a delete that succeeds followed by a silently-failed insert
    // would otherwise empty the cloud ledger while reporting success.
    phase3.push(
      (async () => {
        await settle([sb.from("expenses").delete().eq("owner_id", ownerId)]);
        if (next.expenses.length) await settle([sb.from("expenses").insert(M.expensesToRows(next.expenses, ownerId))]);
        return null;
      })(),
    );
  }
  await settle(phase3);

  // Phase 4 — deletes, children before parents.
  if (projs.deletes.length) await settle([sb.from("projects").delete().in("id", projs.deletes)]);
  if (tasks.deletes.length) await settle([sb.from("tasks").delete().in("id", tasks.deletes)]);
  if (cont.deletes.length) await settle([sb.from("content").delete().in("id", cont.deletes)]);
  if (invs.deletes.length) await settle([sb.from("invoices").delete().in("id", invs.deletes)]);
  if (pros.deletes.length) await settle([sb.from("prospects").delete().in("id", pros.deletes)]);
  if (cand.deletes.length) await settle([sb.from("discovery_candidates").delete().in("id", cand.deletes)]);
  const phase5: PromiseLike<unknown>[] = [];
  if (accts.deletes.length) phase5.push(sb.from("accounts").delete().in("id", accts.deletes));
  if (sups.deletes.length) phase5.push(sb.from("suppliers").delete().in("id", sups.deletes));
  await settle(phase5);
}
