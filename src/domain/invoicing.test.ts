import { describe, expect, it } from "vitest";
import { blankInvoice } from "./factories";
import type { Company } from "./types";
import { blankCompany } from "./factories";
import { invoiceSummary, invoiceTotals, nextInvoiceNumber, profitTimeline } from "./invoicing";

const inv = (over = {}) => ({ ...blankInvoice(), ...over });

describe("invoiceTotals", () => {
  it("sums net and applies per-line VAT", () => {
    const t = invoiceTotals(inv({ lines: [
      { desc: "Dial", qty: "2", unitPrice: "100", vat: "19" },
      { desc: "Strap", qty: "1", unitPrice: "50", vat: "19" },
    ] }));
    expect(t.net).toBe(250);
    expect(t.vat).toBe(47.5);
    expect(t.gross).toBe(297.5);
  });

  it("is VAT-free when rates are zero", () => {
    const t = invoiceTotals(inv({ lines: [{ desc: "x", qty: "1", unitPrice: "100", vat: "0" }] }));
    expect(t.vat).toBe(0);
    expect(t.gross).toBe(100);
  });
});

describe("nextInvoiceNumber", () => {
  it("returns the next padded number in a series", () => {
    const a = inv({ series: "ART", number: "0007" });
    const b = inv({ series: "ART", number: "0008" });
    const other = inv({ series: "X", number: "0099" });
    expect(nextInvoiceNumber([a, b, other], "ART")).toBe("0009");
    expect(nextInvoiceNumber([], "ART")).toBe("0001");
  });
});

describe("invoiceSummary", () => {
  it("splits invoiced into outstanding vs paid and ignores drafts", () => {
    const issued = inv({ status: "issued", currency: "EUR", issueDate: "2026-05-01", lines: [{ desc: "a", qty: "1", unitPrice: "100", vat: "0" }] });
    const paid = inv({ status: "paid", currency: "EUR", issueDate: "2026-05-02", lines: [{ desc: "b", qty: "1", unitPrice: "50", vat: "0" }] });
    const draft = inv({ status: "draft", currency: "EUR", lines: [{ desc: "c", qty: "1", unitPrice: "999", vat: "0" }] });
    const s = invoiceSummary([issued, paid, draft], blankCompany());
    expect(s.invoiced).toBe(150);
    expect(s.outstanding).toBe(100);
    expect(s.paid).toBe(50);
  });

  it("totals invoices of different currencies in EUR rather than adding lei to euros", () => {
    const c: Company = { ...blankCompany(), fx: { RON: 0.2, USD: 0.9 } };
    const ron = inv({ status: "issued", currency: "RON", issueDate: "2026-05-01", lines: [{ desc: "a", qty: "1", unitPrice: "1000", vat: "0" }] });
    const eur = inv({ status: "paid", currency: "EUR", issueDate: "2026-05-02", lines: [{ desc: "b", qty: "1", unitPrice: "100", vat: "0" }] });
    const s = invoiceSummary([ron, eur], c);
    expect(s.outstanding).toBe(200); // 1000 lei
    expect(s.paid).toBe(100);
    expect(s.invoiced).toBe(300);
  });
});

describe("profitTimeline", () => {
  it("nets revenue against overhead burn by month", () => {
    const issued = inv({ status: "issued", currency: "EUR", issueDate: "2026-05-10", lines: [{ desc: "a", qty: "1", unitPrice: "1000", vat: "0" }] });
    const pnl = profitTimeline([issued], [], { ...blankCompany(), baseCurrency: "EUR" }, [{ label: "Studio", amount: "300" }], 8);
    expect(pnl).toHaveLength(1);
    expect(pnl[0].revenue).toBe(1000);
    expect(pnl[0].overhead).toBe(300);
    expect(pnl[0].profit).toBe(700);
  });

  it("converts an invoice in another currency into the EUR the P&L is kept in", () => {
    // Matched COGS comes from projFin in EUR, so raw lei revenue would have
    // been netted against euro costs.
    const c: Company = { ...blankCompany(), fx: { RON: 0.2, USD: 0.9 } };
    const ron = inv({ status: "issued", currency: "RON", issueDate: "2026-05-10", lines: [{ desc: "a", qty: "1", unitPrice: "1000", vat: "0" }] });
    expect(profitTimeline([ron], [], c, [], 8)[0].revenue).toBe(200); // 1000 lei = €200
  });
});
