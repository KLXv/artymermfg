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
  type Expense,
  type Invoice,
  type Project,
  type Supplier,
  type Task,
  blankCompany,
  buildBackup,
  buyerSnapshot,
  migrateLegacy,
  nextInvoiceNumber,
  parseBackup,
  planAdvance,
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
      version: 1,
    },
  ),
);
