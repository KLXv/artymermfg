/**
 * Document generators — the core IP, ported verbatim from ArtymerCockpit.jsx.
 *
 *  - specText():   the production specification (measured tolerances, approved
 *                  sample governance, QC media requirements).
 *  - termsText():  the trade-assurance contract terms (payment split,
 *                  conformance, rejection, QC-media release gate, dispute).
 *  - qcSignoff():  the QC sign-off record.
 *
 * Output is byte-for-byte identical to the original given the same inputs;
 * the generic-text test fixtures pin this. Do not "improve" the wording — the
 * exact language is debugged domain content.
 */
import { acctName, cfg } from "./finance";
import { D, RULE, V, num } from "./format";
import { today } from "./factories";
import { projVerdict } from "./qc";
import type { Account, Company, Project, Supplier } from "./types";

type AccountMap = Record<string, Account>;
type SupplierMap = Record<string, Supplier>;

/** A free-text note rendered as an indented, wrapped block under a section. */
const noteLines = (label: string, val: string): string[] => {
  const t = (val || "").trim();
  if (!t) return [];
  const rows = t.split(/\r?\n/);
  return rows.map((r, i) => `   ${(i === 0 ? label : "").padEnd(10)}${r}`);
};

export const specText = (p: Project, accounts: AccountMap, suppliers: SupplierMap): string => {
  const L: string[] = [];
  L.push("Σ  ARTYMER — PRODUCTION SPECIFICATION");
  L.push(
    `Project: ${V(p.name)}   Client: ${V(acctName(p, accounts))}   Qty: ${V(p.qty)} pc   Rev: ${V(p.rev)}   ${today()}`,
  );
  L.push(
    `Manufacturer: ${V(suppliers[p.supplierId]?.name || p.maker)}   Authority: Artymer (design + QC sign-off)`,
  );
  L.push(
    RULE,
    "GOVERNING RULE",
    "Every parameter is a measured value within tolerance OR a match to the",
    "approved first-off sample under D65 light. No subjective term is a pass",
    "criterion. No component substitution without prior written approval.",
    RULE,
  );
  L.push("1. SELECTED BUILD  (pinned — selected, not designed)");
  L.push(`   Case      ref ${V(p.caseRef)} · ${V(p.caseMat)}`);
  L.push(
    `             Ø ${D(p.caseDia, p.caseDiaT, "mm")} · L2L ${V(p.l2l)} mm · H ${V(p.thick)} mm · lug ${V(p.lugW)} mm`,
  );
  L.push(`             finish ${V(p.caseFin)} · WR ${V(p.wr)}`);
  L.push(...noteLines("Notes", p.caseNote));
  L.push(`   Movement  genuine ${V(p.cal)} (${V(p.calFn)}) · ${V(p.acc)} s/${p.accUnit === "month" ? "month" : "day"}`);
  L.push("             VERIFY: backplate caliber-marking macro BEFORE casing");
  L.push(`   Hands     ${V(p.handRef)} · ${V(p.handLen)} · ${V(p.handFin)} · lume ${V(p.lume)}`);
  L.push(...noteLines("Notes", p.movementNote));
  L.push(`   Crystal   ${V(p.crysMat)} · ${V(p.crysShape)} · AR ${V(p.ar)} · Ø ${D(p.crysDia, p.crysDiaT, "mm")}`);
  L.push(`   Crown ${V(p.crown)} · Caseback ${V(p.back)} · Strap ${V(p.strap)}`);
  L.push(...noteLines("Notes", p.crystalNote));
  L.push(RULE, "2. DIAL  (designed by Artymer)");
  L.push(`   Base      ${V(p.dialMat)} · Ø ${D(p.dialDia, p.dialDiaT, "mm")} · thickness ${D(p.dialThk, p.dialThkT, "mm")}`);
  L.push(`   Feet      ${V(p.feet)}  (must match movement ${V(p.cal)})`);
  L.push(`   Texture   ${V(p.tex)} · depth ${D(p.texDepth, p.texDepthT, "mm")} · gloss ${V(p.gloss)} GU`);
  L.push("   Colours   (locked to approved first-off sample under D65; pre-sample refs:)");
  p.colors.forEach((c, i) => L.push(`             ${String(i + 1).padStart(2, "0")}  ${V(c.name)} — ref ${V(c.ref)}`));
  L.push(`   Printing  ${V(p.print)} · registration ≤ ${V(p.reg)} mm to datum`);
  L.push("             NO pad print over textured zones — appliqué only on texture");
  L.push(`   Markers   ${V(p.marker)} · placement ≤ ${V(p.markerPos)} mm from datum · ${V(p.markerAtt)}`);
  L.push(`   Date      ${p.date === "none" ? "none" : V(p.date)}`);
  if ((p.dialGrad || "Solid") !== "Solid") L.push(`   Finish    ${V(p.dialGrad)} dial — colour transition per approved sample`);
  L.push(...noteLines("Notes", p.dialNote));
  L.push(RULE, "3. ENGRAVING", `   ${V(p.engLoc)} · "${V(p.engTxt)}" · ${V(p.engMethod)} · depth ${V(p.engDepth)} mm`);
  L.push(...noteLines("Notes", p.engNote));
  L.push(RULE, "4. ASSEMBLY & FINISHED-WATCH TOLERANCES  (verify vs factory)");
  L.push(`   Dial centering    ≤ ${V(p.center)} mm concentricity`);
  L.push(`   Hand alignment    indices ≤ ${V(p.align)}° ; coincident at 12:00:00`);
  L.push(`   Hand-to-crystal   ≥ ${V(p.clear)} mm, no contact through travel`);
  L.push(`   Bezel/chapter     ≤ ${V(p.bezel)} mm to datum`);
  L.push(`   Water resistance  ${V(p.wrTest)}`);
  L.push(`   Cleanliness       ${V(p.clean)}`);
  if (p.lume !== "none") L.push(`   Lume              ${V(p.lumeStd)}`);
  L.push(RULE, "5. CONFORMANCE REFERENCE CHAIN");
  L.push("   1) CAD + artwork + render approved (pre-tooling) — design locked");
  L.push("   2) First-off units on production tooling = APPROVED SAMPLE");
  L.push("   3) Full batch matches sample WITHIN the tolerances above");
  L.push("   4) Approved samples retained by Artymer to govern repeats");
  L.push(RULE, "6. PRE-SHIPMENT QC MEDIA  (before balance release)");
  L.push("   • One CONTINUOUS, UNEDITED video — no cuts (splicing voids acceptance)");
  L.push("   • Opens on order no. + date sheet, pans + counts the full batch");
  L.push("   • Per unit, numbered, macro: dial, hands, date, crystal (no debris),");
  L.push("     caseback engraving, running seconds sweep");
  L.push("   • Separate clip: caliber marking BEFORE caseback sealed");
  L.push("   • Neutral 5000–6500 K, neutral background, ≥ 1080p; plus per-unit stills");
  return L.join("\n");
};

export const termsText = (p: Project, accounts: AccountMap, company: Company): string => {
  const bal2 = 100 - num(cfg(p, "deposit", company));
  const L: string[] = [];
  L.push("Σ  ARTYMER — TRADE ASSURANCE CONTRACT TERMS");
  L.push(
    `Order: ${V(p.name)} / ${V(acctName(p, accounts))}   Qty: ${V(p.qty)} pc   Unit ${V(p.unitPrice)} ${p.currency}   Rev ${V(p.rev)}`,
  );
  L.push(`Quality is defined by the attached Production Specification (Rev ${V(p.rev)}) and`);
  L.push("the approved first-off sample. Both are part of this contract.", RULE);
  L.push("1. RESPONSIBILITY & AUTHORITY");
  L.push("   • Artymer holds sole design + quality authority: artwork, CAD, tolerances,");
  L.push("     the approved first-off sample, and final QC sign-off. No component");
  L.push("     substitution or deviation without Artymer's prior written approval.");
  L.push("   • The Supplier manufactures strictly to this Specification and the approved");
  L.push("     sample, and bears full liability for manufacturing defects, non-conforming");
  L.push("     materials, and any undisclosed component substitution.");
  L.push("   • Genuine components only; counterfeit or unauthorised parts void acceptance");
  L.push("     and place all resulting cost and liability on the Supplier.", RULE);
  L.push("2. PAYMENT");
  L.push(`   • ${V(cfg(p, "deposit", company))}% deposit on order + sample approval; ${bal2}% after Buyer approves`);
  L.push("     the pre-shipment QC media, before shipment.");
  L.push("   • All payment via the Alibaba.com designated channel — only channel-paid amounts are protected.");
  L.push("   • Deposit funds tooling + materials; non-refundable on Buyer cancellation once tooling is cut.", RULE);
  L.push("3. CONFORMANCE");
  L.push("   Conforms only if every measured parameter is within Specification tolerance");
  L.push("   AND matches the approved sample under 5000–6500 K light.");
  L.push(`   Movement genuine ${V(p.cal)}, proven by backplate macro before casing.`, RULE);
  L.push("4. REJECTION");
  L.push("   • Unit: out of tolerance, or visibly deviates from the approved sample.");
  L.push(`   • Lot: > ${V(cfg(p, "lotFail", company))}% non-conforming = whole batch may be rejected.`);
  L.push(`   • Supplier reworks/replaces at own cost or refunds in full; max ${V(cfg(p, "rework", company))} reworks.`);
  L.push("   • Failure evidenced pre-shipment = no shipment, no balance release.", RULE);
  L.push("5. SHIPPING & RETURNS");
  L.push("   • Non-conforming shipped goods: Supplier bears 100% return freight and replaces or refunds in full.");
  L.push("   • Where return is impractical vs order value, refund without return on evidence of non-conformance.", RULE);
  L.push("6. QC MEDIA (release gate)");
  L.push("   Continuous unedited video; order+date sheet; full-batch count; numbered per-unit macro;");
  L.push("   caliber clip before casing; neutral light; per-unit stills.");
  L.push(`   Delivered before balance release. Buyer approves/rejects within ${V(cfg(p, "window", company))} business days.`, RULE);
  L.push("7. DISPUTE");
  L.push("   References Specification + approved sample + QC media. Unresolved within the Trade");
  L.push("   Assurance window (5-day response / 15-day settlement) → Buyer escalates to Alibaba.com.");
  return L.join("\n");
};

export const qcSignoff = (p: Project, accounts: AccountMap, company: Company): string => {
  const vv = projVerdict(p, company);
  return `Σ ARTYMER — QC SIGN-OFF
Order: ${V(p.name)} / ${V(acctName(p, accounts))}   Rev ${V(p.rev)}   ${p.qc.signedDate || today()}
Inspected ${vv.passU + vv.failU} of ${V(p.qty)} units against Specification + approved sample.
Pass: ${vv.passU}   Fail: ${vv.failU}   Fail rate: ${vv.failRate.toFixed(1)}% (lot threshold ${V(cfg(p, "lotFail", company))}%)
Verdict: ${vv.verdict}
Inspected and signed by Artymer — Watchmaker & Founder.`;
};
