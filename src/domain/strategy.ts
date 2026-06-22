/**
 * Strategy & retention — keeping the business honest and customers close.
 *
 * Pure derivations: revenue booked this month (for goals vs actuals), the
 * warranty / after-sales register over delivered pieces, and referral
 * attribution (who sends business, and the revenue it brings).
 */
import { today } from "./factories";
import { committed, projFin } from "./finance";
import { invoiceTotals } from "./invoicing";
import type { Account, Company, Invoice, Project } from "./types";

/** Net invoiced (issued/paid) in the current calendar month. */
export const revenueThisMonth = (invoices: Invoice[], todayStr: string = today()): number => {
  const key = todayStr.slice(0, 7);
  return invoices
    .filter((i) => i.status !== "draft" && (i.issueDate || "").slice(0, 7) === key)
    .reduce((s, i) => s + invoiceTotals(i).net, 0);
};

export type WarrantyStatus = "active" | "expiring" | "expired" | "unset";

export interface WarrantyRow {
  project: Project;
  deliveredDate: string;
  expiry: string;
  status: WarrantyStatus;
  daysLeft: number | null;
  services: number;
}

/** Delivered pieces with their warranty status (expiring = within 60 days). */
export const warrantyRegister = (projects: Project[], todayStr: string = today()): WarrantyRow[] =>
  projects
    .filter((p) => p.stage === "Delivered")
    .map((p) => {
      const w = p.warranty || { deliveredDate: "", months: "12", serial: "", services: [] };
      const serviceCount = w.services?.length || 0;
      if (!w.deliveredDate)
        return { project: p, deliveredDate: "", expiry: "", status: "unset" as WarrantyStatus, daysLeft: null, services: serviceCount };
      const months = parseInt(w.months, 10) || 12;
      const exp = new Date(w.deliveredDate + "T00:00:00");
      exp.setMonth(exp.getMonth() + months);
      const daysLeft = Math.round((exp.getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);
      const status: WarrantyStatus = daysLeft < 0 ? "expired" : daysLeft <= 60 ? "expiring" : "active";
      return { project: p, deliveredDate: w.deliveredDate, expiry: exp.toISOString().slice(0, 10), status, daysLeft, services: serviceCount };
    })
    .sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));

export interface ReferralRow {
  referrer: string;
  referred: number;
  won: number;
  revenue: number;
}

/** Group clients by who referred them; tally conversions + revenue. */
export const referralReport = (accounts: Account[], projects: Project[], company: Company): ReferralRow[] => {
  const byAcct = new Map<string, { won: boolean; revenue: number }>();
  accounts.forEach((a) => byAcct.set(a.id, { won: false, revenue: 0 }));
  projects.forEach((p) => {
    const e = byAcct.get(p.accountId);
    if (!e || !committed(p)) return;
    e.won = true;
    e.revenue += projFin(p, company).rev;
  });
  const groups = new Map<string, ReferralRow>();
  accounts.forEach((a) => {
    const ref = (a.referredBy || "").trim();
    if (!ref) return;
    const row = groups.get(ref) || { referrer: ref, referred: 0, won: 0, revenue: 0 };
    const e = byAcct.get(a.id)!;
    row.referred += 1;
    if (e.won) row.won += 1;
    row.revenue += e.revenue;
    groups.set(ref, row);
  });
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue || b.referred - a.referred);
};
