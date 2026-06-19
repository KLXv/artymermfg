import { describe, expect, it } from "vitest";
import { blankAccount, blankCompany, blankProject } from "./factories";
import { qcSignoffZh, specTextZh, termsTextZh } from "./documents-zh";
import type { Account, Supplier } from "./types";

const accounts: Record<string, Account> = {
  a1: { ...blankAccount(), id: "a1", name: "LóFő" },
};
const suppliers: Record<string, Supplier> = {};
const company = blankCompany();
const base = () => ({ ...blankProject("a1"), name: "The Harghita Chronometer", qty: "30", rev: "1.0" });

describe("specTextZh (supplier-language spec)", () => {
  it("carries the governing rule, conformance chain and QC media in 中文", () => {
    const out = specTextZh(base(), accounts, suppliers);
    expect(out).toContain("生产规格书");
    expect(out).toContain("主控规则");
    expect(out).toContain("5. 合格判定参照链");
    expect(out).toContain("6. 出货前品控影像");
    expect(out).toContain("客户：LóFő");
  });

  it("flows free-text notes through and omits empty ones", () => {
    const p = { ...base(), dialNote: "三明治盘面 sandwich" };
    expect(specTextZh(p, accounts, suppliers)).toContain("三明治盘面 sandwich");
    expect(specTextZh(base(), accounts, suppliers)).not.toContain("备注");
  });
});

describe("termsTextZh (supplier-language terms)", () => {
  it("opens with responsibility and keeps the payment split", () => {
    const out = termsTextZh(base(), accounts, company);
    expect(out).toContain("1. 权责与授权");
    expect(out).toContain("30% 定金");
    expect(out).toContain("余款 70%");
    expect(out).toContain("7. 争议");
  });
});

describe("qcSignoffZh", () => {
  it("reports the verdict and the founder credential in 中文", () => {
    const out = qcSignoffZh(base(), accounts, company);
    expect(out).toContain("判定：待定 (PENDING)");
    expect(out).toContain("制表师与创始人");
  });
});
