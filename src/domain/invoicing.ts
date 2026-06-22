/**
 * Invoicing domain — totals (net / VAT / gross), sequential numbering, the
 * party snapshots frozen onto an issued invoice, and a monthly roll-up for the
 * profit-over-time view. Pure + tested.
 */
import { num } from "./format";
import { projFin } from "./finance";
import { monthlyBurn } from "./money";
import type { Account, Company, Expense, Invoice, PartySnapshot, Project } from "./types";

export interface InvoiceTotals {
  net: number;
  vat: number;
  gross: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Net / VAT / gross from the lines (VAT applied per-line). */
export const invoiceTotals = (inv: Invoice): InvoiceTotals => {
  let net = 0;
  let vat = 0;
  inv.lines.forEach((l) => {
    const lineNet = num(l.qty) * num(l.unitPrice);
    net += lineNet;
    vat += lineNet * (num(l.vat) / 100);
  });
  return { net: round2(net), vat: round2(vat), gross: round2(net + vat) };
};

/** Next sequential number in a series (max existing numbered + 1, 4 digits). */
export const nextInvoiceNumber = (invoices: Invoice[], series: string): string => {
  const max = invoices
    .filter((i) => i.series === series && i.number)
    .reduce((m, i) => Math.max(m, parseInt(i.number, 10) || 0), 0);
  return String(max + 1).padStart(4, "0");
};

export const sellerSnapshot = (c: Company): PartySnapshot => ({
  name: c.fiscal.legalName || c.brand,
  taxId: c.fiscal.taxId,
  regNo: c.fiscal.regNo,
  address: c.fiscal.address,
  email: "",
});

export const buyerSnapshot = (a?: Account): PartySnapshot => ({
  name: a?.name || "",
  taxId: "",
  regNo: "",
  address: "",
  email: a?.email || "",
});

export interface InvoiceSummary {
  invoiced: number; // gross of issued + paid
  outstanding: number; // gross of issued, unpaid
  paid: number; // gross of paid
  byMonth: { month: string; net: number; gross: number }[];
}

/** Roll up issued/paid invoices for the money view. */
export const invoiceSummary = (invoices: Invoice[], monthsBack = 6): InvoiceSummary => {
  let invoiced = 0;
  let outstanding = 0;
  let paid = 0;
  const months: Record<string, { net: number; gross: number }> = {};
  invoices.forEach((inv) => {
    if (inv.status === "draft") return;
    const t = invoiceTotals(inv);
    invoiced += t.gross;
    if (inv.status === "paid") paid += t.gross;
    else outstanding += t.gross;
    const key = (inv.issueDate || "").slice(0, 7);
    if (key) {
      months[key] = months[key] || { net: 0, gross: 0 };
      months[key].net += t.net;
      months[key].gross += t.gross;
    }
  });
  const byMonth = Object.keys(months)
    .sort()
    .slice(-monthsBack)
    .map((month) => ({ month, net: Math.round(months[month].net), gross: Math.round(months[month].gross) }));
  return { invoiced: round2(invoiced), outstanding: round2(outstanding), paid: round2(paid), byMonth };
};

export interface PnlMonth {
  month: string;
  revenue: number; // net invoiced
  cost: number; // matched COGS from linked projects
  overhead: number; // monthly burn
  profit: number; // revenue − cost − overhead
}

/**
 * Monthly profit-and-loss over time. Revenue is net invoiced per month; for an
 * invoice linked to a project, a proportional share of that project's COGS is
 * matched into the same month; overhead burn is applied to every shown month.
 */
export const profitTimeline = (
  invoices: Invoice[],
  projects: Project[],
  company: Company,
  expenses: Expense[],
  monthsBack = 8,
): PnlMonth[] => {
  const burn = monthlyBurn(expenses);
  const projById: Record<string, Project> = Object.fromEntries(projects.map((p) => [p.id, p]));
  const months: Record<string, { revenue: number; cost: number }> = {};
  invoices.forEach((inv) => {
    if (inv.status === "draft") return;
    const key = (inv.issueDate || "").slice(0, 7);
    if (!key) return;
    const t = invoiceTotals(inv);
    months[key] = months[key] || { revenue: 0, cost: 0 };
    months[key].revenue += t.net;
    const p = projById[inv.projectId];
    if (p) {
      const f = projFin(p, company);
      if (f.rev > 0) months[key].cost += f.cost * (t.net / f.rev);
    }
  });
  return Object.keys(months)
    .sort()
    .slice(-monthsBack)
    .map((month) => {
      const r = months[month];
      const profit = r.revenue - r.cost - burn;
      return { month, revenue: Math.round(r.revenue), cost: Math.round(r.cost), overhead: Math.round(burn), profit: Math.round(profit) };
    });
};
