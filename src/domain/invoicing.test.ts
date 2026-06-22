import { describe, expect, it } from "vitest";
import { blankInvoice } from "./factories";
import { invoiceSummary, invoiceTotals, nextInvoiceNumber } from "./invoicing";

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
    const issued = inv({ status: "issued", issueDate: "2026-05-01", lines: [{ desc: "a", qty: "1", unitPrice: "100", vat: "0" }] });
    const paid = inv({ status: "paid", issueDate: "2026-05-02", lines: [{ desc: "b", qty: "1", unitPrice: "50", vat: "0" }] });
    const draft = inv({ status: "draft", lines: [{ desc: "c", qty: "1", unitPrice: "999", vat: "0" }] });
    const s = invoiceSummary([issued, paid, draft]);
    expect(s.invoiced).toBe(150);
    expect(s.outstanding).toBe(100);
    expect(s.paid).toBe(50);
  });
});
