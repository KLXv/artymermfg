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
});

describe("qcSignoff", () => {
  it("reports the verdict and the watchmaker-founder credential", () => {
    const out = qcSignoff(base(), accounts, company);
    expect(out).toContain("Verdict: PENDING");
    expect(out).toContain("Watchmaker & Founder");
    expect(out).not.toContain("Master Watchmaker");
  });
});
