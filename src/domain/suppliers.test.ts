import { describe, expect, it } from "vitest";
import { blankSupplier } from "./factories";
import { rankSuppliers, supplierCaps } from "./suppliers";
import type { Supplier } from "./types";

const sup = (over: Partial<Supplier>): Supplier => ({ ...blankSupplier(), ...over });

const fast = sup({ id: "fast", name: "Aurora", status: "Backup", leadTime: "40", moq: "50", quality: "3", communication: "5", price: "5", capabilities: "dials, PVD/coating" });
const fine = sup({ id: "fine", name: "Shengda", status: "Primary", leadTime: "90", moq: "30", quality: "5", communication: "4", price: "3", capabilities: "dials, cases, engraving" });
const retired = sup({ id: "old", name: "Old Co", status: "Retired", leadTime: "30", moq: "10", quality: "5", communication: "5", price: "5", capabilities: "cases" });

describe("rankSuppliers", () => {
  it("parses capability tags", () => {
    expect(supplierCaps(fine)).toEqual(["dials", "cases", "engraving"]);
  });

  it("ranks and picks a best-for each dimension", () => {
    const { ranked, bests } = rankSuppliers([fast, fine]);
    expect(ranked).toHaveLength(2);
    expect(bests.quality?.id).toBe("fine"); // 5 stars
    expect(bests.fast?.id).toBe("fast"); // 40 < 90 days
    expect(bests.value?.id).toBe("fast"); // price 5
    expect(bests.lowMoq?.id).toBe("fine"); // 30 < 50
  });

  it("filters by capability", () => {
    const { ranked } = rankSuppliers([fast, fine], "engraving");
    expect(ranked.map((r) => r.supplier.id)).toEqual(["fine"]);
  });

  it("excludes retired suppliers from the best-for picks", () => {
    const { bests } = rankSuppliers([fine, retired]);
    expect(bests.overall?.id).not.toBe("old");
  });
});
