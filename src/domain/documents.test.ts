import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { qcSignoff, specText, termsText } from "./documents";
import type { Account, Supplier } from "./types";

const accounts: Record<string, Account> = {
  a1: { ...blankAccount(), id: "a1", name: "LóFő" },
};
const suppliers: Record<string, Supplier> = {};
const company = blankCompany();
const base = () => ({ ...blankProject("a1"), name: "The Harghita Chronometer", qty: "30", rev: "1.0" });

describe("specText", () => {
  it("carries the governing rule and conformance chain", () => {
    const out = specText(base(), accounts, suppliers);
    expect(out).toContain("Σ  ARTYMER — PRODUCTION SPECIFICATION");
    expect(out).toContain("GOVERNING RULE");
    expect(out).toContain("approved first-off sample under D65 light");
    expect(out).toContain("5. CONFORMANCE REFERENCE CHAIN");
    expect(out).toContain("6. PRE-SHIPMENT QC MEDIA");
    expect(out).toContain("Client: LóFő");
  });

  it("omits the lume tolerance line when lume is none, includes it otherwise", () => {
    expect(specText(base(), accounts, suppliers)).not.toContain("Lume              ");
    const lumed = { ...base(), lume: "Super-LumiNova C3" };
    expect(specText(lumed, accounts, suppliers)).toContain("Lume              ");
  });

  it("formats dimensions with tolerance and blanks missing values", () => {
    const p = { ...base(), caseDia: "40", caseDiaT: "0.10" };
    const out = specText(p, accounts, suppliers);
    expect(out).toContain("Ø 40 ± 0.10 mm");
    // an unset value renders as the underscored blank
    expect(out).toContain("________");
  });

  it("flows per-component free-text notes into the right sections", () => {
    const p = { ...base(), caseNote: "drilled lugs", dialNote: "sandwich dial", engNote: "serial per unit" };
    const out = specText(p, accounts, suppliers);
    expect(out).toContain("drilled lugs");
    expect(out).toContain("sandwich dial");
    expect(out).toContain("serial per unit");
    // a blank note adds no line
    expect(specText(base(), accounts, suppliers)).not.toContain("Notes");
  });

  it("calls out a non-solid dial finish only when set", () => {
    expect(specText(base(), accounts, suppliers)).not.toContain("dial — colour transition");
    const fume = { ...base(), dialGrad: "Fumé" };
    expect(specText(fume, accounts, suppliers)).toContain("Fumé dial — colour transition");
  });
});

describe("termsText", () => {
  it("splits payment as deposit% / (100-deposit)% and pulls thresholds", () => {
    const out = termsText(base(), accounts, company);
    expect(out).toContain("30% deposit on order + sample approval; 70% after Buyer approves");
    expect(out).toContain("> 5% non-conforming");
    expect(out).toContain("max 2 reworks");
    expect(out).toContain("within 3 business days");
  });

  it("honours a project-level deposit override", () => {
    const out = termsText({ ...base(), deposit: "40" }, accounts, company);
    expect(out).toContain("40% deposit on order + sample approval; 60% after Buyer approves");
  });

  it("opens with the responsibility & authority section", () => {
    const out = termsText(base(), accounts, company);
    expect(out).toContain("1. RESPONSIBILITY & AUTHORITY");
    expect(out).toContain("Artymer holds sole design + quality authority");
    expect(out).toContain("full liability for manufacturing");
    // existing sections still present, just renumbered
    expect(out).toContain("2. PAYMENT");
    expect(out).toContain("7. DISPUTE");
  });
});

describe("qcSignoff", () => {
  it("reports the verdict and the watchmaker-founder credential", () => {
    const out = qcSignoff(base(), accounts, company);
    expect(out).toContain("Verdict: PENDING");
    expect(out).toContain("Watchmaker & Founder");
    expect(out).not.toContain("Master Watchmaker");
  });
});
