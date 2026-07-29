/**
 * The single workspace store.
 *
 * The original cockpit derived everything from one state object held in React
 * and mirrored to localStorage. We preserve that model with Zustand: one store,
 * selector-level subscriptions, and localStorage persistence so the app is fully
 * usable offline and without auth (Supabase-backed sync arrives with auth in a
 * later phase). The JSON export/import vehicle is preserved exactly, so real
 * data (LóFő, HFN) migrates in unchanged — including the one-time legacy
 * migration of pre-account projects.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomCommand } from "@/app/commands";
import {
  type Account,
  type Company,
  type ContentItem,
  type DiscoveryCandidate,
  type Expense,
  type Invoice,
  type Project,
  type Prospect,
  type Supplier,
  type Task,
  blankAccount,
  blankCompany,
  blankProspect,
  buildBackup,
  buyerSnapshot,
  defaultIcp,
  detectLang,
  migrateLegacy,
  nextInvoiceNumber,
  parseBackup,
  planAdvance,
  promoteFields,
  rid,
  sellerSnapshot,
  today,
} from "@/domain";

export interface WorkspaceState {
  company: Company;
  accounts: Record<string, Account>;
  projects: Record<string, Project>;
  suppliers: Record<string, Supplier>;
  tasks: Record<string, Task>;
  expenses: Expense[];
  content: Record<string, ContentItem>;
  invoices: Record<string, Invoice>;
  prospects: Record<string, Prospect>;
  candidates: Record<string, DiscoveryCandidate>;
}

export interface WorkspaceActions {
  setCompany: (patch: Partial<Company>) => void;

  upsertAccount: (a: Account) => void;
  patchAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  upsertProject: (p: Project) => void;
  patchProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  /** Pipeline engine: advance one stage, applying its effects atomically. */
  advanceProject: (id: string) => string[];
  /** Clone a project as a fresh repeat order; returns the new id. */
  cloneProject: (id: string) => string | null;

  upsertSupplier: (s: Supplier) => void;
  patchSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  upsertTask: (t: Task) => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  setExpenses: (e: Expense[]) => void;

  upsertContent: (c: ContentItem) => void;
  patchContent: (id: string, patch: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;

  upsertInvoice: (inv: Invoice) => void;
  patchInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  /** Assign a series + sequential number, snapshot the parties, mark issued. */
  issueInvoice: (id: string) => void;
  setInvoicePaid: (id: string, paid: boolean) => void;

  upsertProspect: (p: Prospect) => void;
  patchProspect: (id: string, patch: Partial<Prospect>) => void;
  deleteProspect: (id: string) => void;
  /** Promote a prospect to a client Account; returns the new account id. */
  promoteProspect: (id: string) => string | null;

  upsertCandidate: (c: DiscoveryCandidate) => void;
  /** Approve a discovery candidate → creates a Prospect; returns its id. */
  approveCandidate: (id: string) => string | null;
  rejectCandidate: (id: string) => void;
  deleteCandidate: (id: string) => void;
  /** Bulk-add discovery candidates to the review queue (from the agent). */
  addCandidates: (list: DiscoveryCandidate[]) => void;
  /**
   * Import PROSPECTOR leads into the review queue, skipping any org already
   * known to Cockpit (prospect, client, or queued) so contacted leads never
   * resurface. Returns how many were added vs. skipped.
   */
  importLeads: (list: DiscoveryCandidate[]) => { imported: number; skipped: number };

  /** Replace the entire workspace (used by cloud sync on load). */
  hydrate: (state: WorkspaceState) => void;

  exportJSON: () => string;
  /** Merge a backup payload over current state, then run legacy migration. */
  importJSON: (raw: string) => { accounts: number; projects: number };
  resetAll: () => void;

  /** User-defined palette commands (persisted locally, outside cloud sync). */
  customCommands: CustomCommand[];
  addCommand: (c: CustomCommand) => void;
  deleteCommand: (id: string) => void;
}

export type Store = WorkspaceState & WorkspaceActions;

const emptyState = (): WorkspaceState => ({
  company: blankCompany(),
  accounts: {},
  projects: {},
  suppliers: {},
  tasks: {},
  expenses: [],
  content: {},
  invoices: {},
  prospects: {},
  candidates: {},
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      setCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),

      upsertAccount: (a) => set((s) => ({ accounts: { ...s.accounts, [a.id]: a } })),
      patchAccount: (id, patch) =>
        set((s) => (s.accounts[id] ? { accounts: { ...s.accounts, [id]: { ...s.accounts[id], ...patch } } } : s)),
      deleteAccount: (id) =>
        set((s) => {
          const accounts = { ...s.accounts };
          delete accounts[id];
          return { accounts };
        }),

      upsertProject: (p) => set((s) => ({ projects: { ...s.projects, [p.id]: p } })),
      patchProject: (id, patch) =>
        set((s) => (s.projects[id] ? { projects: { ...s.projects, [id]: { ...s.projects[id], ...patch } } } : s)),
      deleteProject: (id) =>
        set((s) => {
          const projects = { ...s.projects };
          delete projects[id];
          return { projects };
        }),

      advanceProject: (id) => {
        const s = get();
        const p = s.projects[id];
        if (!p) return [];
        const eff = planAdvance(p, Object.values(s.tasks));
        if (!eff.canAdvance) return [];
        const updated = { ...p, ...eff.patch };
        // Stamp the warranty start the moment a piece is delivered.
        if (updated.stage === "Delivered" && !updated.warranty?.deliveredDate) {
          updated.warranty = { ...updated.warranty, deliveredDate: today() };
        }
        const projects = { ...s.projects, [id]: updated };
        const tasks = eff.newTask ? { ...s.tasks, [eff.newTask.id]: eff.newTask } : s.tasks;
        set({ projects, tasks });
        return eff.notes;
      },

      cloneProject: (id) => {
        const s = get();
        const p = s.projects[id];
        if (!p) return null;
        const copy: Project = {
          ...p,
          id: rid("p"),
          name: `${p.name || "Untitled"} (repeat)`,
          stage: "Proposal",
          lost: false,
          deadline: "",
          depositExpected: "",
          balanceExpected: "",
          depositPaid: false,
          depositDate: "",
          balancePaid: false,
          balanceDate: "",
          qc: { received: false, results: {}, signed: false, signedDate: "" },
          warranty: { deliveredDate: "", months: p.warranty?.months || "12", serial: "", services: [] },
        };
        set({ projects: { ...s.projects, [copy.id]: copy } });
        return copy.id;
      },

      upsertSupplier: (sup) => set((s) => ({ suppliers: { ...s.suppliers, [sup.id]: sup } })),
      patchSupplier: (id, patch) =>
        set((s) =>
          s.suppliers[id] ? { suppliers: { ...s.suppliers, [id]: { ...s.suppliers[id], ...patch } } } : s,
        ),
      deleteSupplier: (id) =>
        set((s) => {
          const suppliers = { ...s.suppliers };
          delete suppliers[id];
          return { suppliers };
        }),

      upsertTask: (t) => set((s) => ({ tasks: { ...s.tasks, [t.id]: t } })),
      patchTask: (id, patch) =>
        set((s) => (s.tasks[id] ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], ...patch } } } : s)),
      toggleTask: (id) =>
        set((s) => (s.tasks[id] ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], done: !s.tasks[id].done } } } : s)),
      deleteTask: (id) =>
        set((s) => {
          const tasks = { ...s.tasks };
          delete tasks[id];
          return { tasks };
        }),

      setExpenses: (expenses) => set({ expenses }),

      upsertContent: (c) => set((s) => ({ content: { ...s.content, [c.id]: c } })),
      patchContent: (id, patch) =>
        set((s) => (s.content[id] ? { content: { ...s.content, [id]: { ...s.content[id], ...patch } } } : s)),
      deleteContent: (id) =>
        set((s) => {
          const content = { ...s.content };
          delete content[id];
          return { content };
        }),

      upsertInvoice: (inv) => set((s) => ({ invoices: { ...s.invoices, [inv.id]: inv } })),
      patchInvoice: (id, patch) =>
        set((s) => (s.invoices[id] ? { invoices: { ...s.invoices, [id]: { ...s.invoices[id], ...patch } } } : s)),
      deleteInvoice: (id) =>
        set((s) => {
          const invoices = { ...s.invoices };
          delete invoices[id];
          return { invoices };
        }),
      issueInvoice: (id) =>
        set((s) => {
          const inv = s.invoices[id];
          if (!inv) return s;
          const series = s.company.fiscal.series || "ART";
          const number = inv.number || nextInvoiceNumber(Object.values(s.invoices), series);
          const updated: Invoice = {
            ...inv,
            series,
            number,
            status: inv.status === "draft" ? "issued" : inv.status,
            issueDate: inv.issueDate || today(),
            seller: sellerSnapshot(s.company),
            buyer: inv.buyer.name ? inv.buyer : buyerSnapshot(s.accounts[inv.accountId]),
          };
          return { invoices: { ...s.invoices, [id]: updated } };
        }),
      setInvoicePaid: (id, paid) =>
        set((s) =>
          s.invoices[id]
            ? { invoices: { ...s.invoices, [id]: { ...s.invoices[id], status: paid ? "paid" : "issued", paidDate: paid ? today() : "" } } }
            : s,
        ),

      upsertProspect: (p) => set((s) => ({ prospects: { ...s.prospects, [p.id]: p } })),
      patchProspect: (id, patch) =>
        set((s) => (s.prospects[id] ? { prospects: { ...s.prospects, [id]: { ...s.prospects[id], ...patch } } } : s)),
      deleteProspect: (id) =>
        set((s) => {
          const prospects = { ...s.prospects };
          delete prospects[id];
          return { prospects };
        }),
      promoteProspect: (id) => {
        const s = get();
        const p = s.prospects[id];
        if (!p) return null;
        if (p.accountId && s.accounts[p.accountId]) return p.accountId; // already promoted
        const account: Account = { ...blankAccount(), ...promoteFields(p) };
        set({
          accounts: { ...s.accounts, [account.id]: account },
          prospects: { ...s.prospects, [id]: { ...p, accountId: account.id } },
        });
        return account.id;
      },

      upsertCandidate: (c) => set((s) => ({ candidates: { ...s.candidates, [c.id]: c } })),
      addCandidates: (list) =>
        set((s) => {
          const candidates = { ...s.candidates };
          for (const c of list) candidates[c.id] = c;
          return { candidates };
        }),
      importLeads: (list) => {
        const s = get();
        const known = new Set<string>();
        const norm = (name: string) => name.trim().toLowerCase();
        Object.values(s.accounts).forEach((a) => a.name && known.add(norm(a.name)));
        Object.values(s.prospects).forEach((p) => p.org && known.add(norm(p.org)));
        Object.values(s.candidates).forEach((c) => c.org && known.add(norm(c.org)));

        const candidates = { ...s.candidates };
        let imported = 0;
        let skipped = 0;
        for (const c of list) {
          if (!c.org || known.has(norm(c.org))) {
            skipped += 1;
            continue;
          }
          known.add(norm(c.org)); // dedupe within the batch too
          candidates[c.id] = c;
          imported += 1;
        }
        set({ candidates });
        return { imported, skipped };
      },
      approveCandidate: (id) => {
        const s = get();
        const c = s.candidates[id];
        if (!c) return null;
        const p: Prospect = {
          ...blankProspect(),
          org: c.org,
          segment: c.segment,
          city: c.city,
          market: c.market,
          lang: detectLang(c.market, c.city),
          signal: c.signal,
          sourceUrl: c.sourceUrl,
          role: c.contactHint,
          notes: c.rationale,
          prospector: c.prospector, // carry the score + brief onto the prospect
        };
        set({
          prospects: { ...s.prospects, [p.id]: p },
          candidates: { ...s.candidates, [id]: { ...c, status: "approved" } },
        });
        return p.id;
      },
      rejectCandidate: (id) =>
        set((s) => (s.candidates[id] ? { candidates: { ...s.candidates, [id]: { ...s.candidates[id], status: "rejected" } } } : s)),
      deleteCandidate: (id) =>
        set((s) => {
          const candidates = { ...s.candidates };
          delete candidates[id];
          return { candidates };
        }),

      hydrate: (state) => set({ ...state }),

      exportJSON: () => {
        const s = get();
        return JSON.stringify(
          buildBackup({
            accounts: s.accounts,
            projects: s.projects,
            suppliers: s.suppliers,
            tasks: s.tasks,
            expenses: s.expenses,
            company: s.company,
            content: s.content,
            invoices: s.invoices,
            prospects: s.prospects,
            candidates: s.candidates,
          }),
          null,
          2,
        );
      },

      importJSON: (raw) => {
        const parsed = parseBackup(raw);
        const s = get();
        // Merge: incoming records overwrite matching ids, the rest is kept.
        const accounts = { ...s.accounts, ...parsed.accounts };
        const projects = { ...s.projects, ...parsed.projects };
        const suppliers = { ...s.suppliers, ...parsed.suppliers };
        const tasks = { ...s.tasks, ...parsed.tasks };
        const company = parsed.company ? { ...s.company, ...parsed.company } : s.company;
        const expenses = parsed.expenses ?? s.expenses;
        const content = parsed.content ? { ...s.content, ...parsed.content } : s.content;
        const invoices = parsed.invoices ? { ...s.invoices, ...parsed.invoices } : s.invoices;
        const prospects = parsed.prospects ? { ...s.prospects, ...parsed.prospects } : s.prospects;
        const candidates = parsed.candidates ? { ...s.candidates, ...parsed.candidates } : s.candidates;

        // One-time legacy migration of pre-account projects.
        const mig = migrateLegacy(company, accounts, projects);
        set({
          accounts: mig.accounts,
          projects: mig.projects,
          suppliers,
          tasks,
          expenses,
          content,
          invoices,
          prospects,
          candidates,
          company: { ...company, migrated: true },
        });
        return { accounts: Object.keys(mig.accounts).length, projects: Object.keys(mig.projects).length };
      },

      resetAll: () => set(emptyState()),

      customCommands: [],
      addCommand: (c) => set((s) => ({ customCommands: [...s.customCommands, c] })),
      deleteCommand: (id) => set((s) => ({ customCommands: s.customCommands.filter((c) => c.id !== id) })),
    }),
    {
      name: "artymer-cockpit",
      version: 2,
      // v2 adds the Outbound Engine: ICP config on the company + the prospects
      // and discovery-candidate collections. Backfill them for existing stores.
      migrate: (persisted, version) => {
        const s = (persisted || {}) as Partial<WorkspaceState>;
        if (version < 2) {
          if (s.company && !s.company.icp) s.company = { ...s.company, icp: defaultIcp() };
          if (!s.prospects) s.prospects = {};
          if (!s.candidates) s.candidates = {};
        }
        return s as WorkspaceState;
      },
    },
  ),
);
