/**
 * The commercial + cost editor — the money instrument.
 *
 * A clear per-unit COGS build-up (material lines + one-off tooling + the
 * payment-channel fee), live economics (revenue, cost split, per-unit profit,
 * margin, break-even), a what-if price slider, and the deposit/balance schedule
 * that feeds the deck's cash events. All derivations come from the finance
 * domain (`projFinance`).
 */
import { useState } from "react";
import {
  bal,
  cfg,
  committed,
  dep,
  money,
  num,
  owed,
  projFinance,
  type Company,
  type Project,
} from "@/domain";
import { Field, Panel, SectionHead, SelectField, Stat, Toggle, Label, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { makeBind, type Patch } from "./bind";

const CURRENCIES = ["EUR", "RON", "USD"];

const COST_LINES: [keyof Project, string][] = [
  ["cMovement", "Movement"],
  ["cCase", "Case"],
  ["cDial", "Dial"],
  ["cHands", "Hands"],
  ["cCrystal", "Crystal"],
  ["cStrap", "Strap / bracelet"],
  ["cAssembly", "Assembly"],
  ["cPack", "Packaging"],
  ["cShip", "Shipping"],
  ["cDuty", "Duty / customs"],
  ["cOther", "Other"],
];

export function CommercialTab({ p, patch, company }: { p: Project; patch: Patch; company: Company }) {
  const f = makeBind(p, patch);
  const suppliers = useStore((s) => s.suppliers);
  const fb = projFinance(p, company);
  const cur = p.currency || "EUR";

  // What-if price slider (local; "Set as price" applies it).
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const previewPrice = whatIf ?? num(p.unitPrice);
  const previewProject = { ...p, unitPrice: String(previewPrice) };
  const previewFb = projFinance(previewProject, company);

  const supplierOpts = [
    { value: "", label: "— none —" },
    ...Object.values(suppliers).map((s) => ({ value: s.id, label: s.name || "Unnamed" })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-4">
        <SectionHead title="Order" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Quantity (pc)" {...f("qty")} />
          <Field label={`Unit price (${cur})`} {...f("unitPrice")} />
          <SelectField label="Currency" {...f("currency")} options={CURRENCIES} />
          <Field label="Deadline" type="date" {...f("deadline")} />
          <Field label="Revision" {...f("rev")} />
          <SelectField label="Supplier" value={p.supplierId} onChange={(v) => patch({ supplierId: v })} options={supplierOpts} />
          <Field label="Maker (if no supplier linked)" {...f("maker")} className="sm:col-span-3" />
        </div>
      </Panel>

      {/* Economics — the headline */}
      <Panel className="p-4">
        <SectionHead title="Economics" kicker={`all € · FX RON ${company.fx.RON} · USD ${company.fx.USD}`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Revenue" value={money(fb.revenue, "€")} tone="brass" />
          <Stat label="Total cost" value={money(fb.cost, "€")} />
          <Stat label="Profit" value={money(fb.profit, "€")} tone={fb.profit >= 0 ? "ok" : "bad"} />
          <Stat label="Margin" value={`${fb.margin.toFixed(0)}%`} tone={fb.margin >= 30 ? "ok" : "warn"} />
          <Stat label="Profit / unit" value={money(fb.unitProfit, "€")} tone={fb.unitProfit >= 0 ? "ok" : "bad"} />
          <Stat
            label="Break-even"
            value={fb.breakEvenUnits == null ? "—" : `${fb.breakEvenUnits} pc`}
            tone={fb.breakEvenUnits != null && fb.breakEvenUnits <= fb.qtyN ? "ok" : "warn"}
          />
        </div>
        {/* Per-unit waterfall */}
        <div className="mt-3 grid gap-2 rounded-lg border border-line bg-inset-grad p-3 font-mono text-[13px] sm:grid-cols-2">
          <Row label="Price / unit" value={money(fb.unitPrice, "€")} strong />
          <Row label="Material / unit" value={`− ${money(fb.unitMaterial, "€")}`} />
          <Row label={`Channel fee ${num(p.feePct) || 0}%`} value={`− ${money(fb.fee, "€")}`} />
          <Row label="Tooling / unit (amortized)" value={`− ${money(fb.toolingPerUnit, "€")}`} />
          <Row label="Cost / unit" value={money(fb.unitCost, "€")} />
          <Row label="Profit / unit" value={money(fb.unitProfit, "€")} strong tone={fb.unitProfit >= 0 ? "ok" : "bad"} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-faint">
          One-off tooling {money(fb.toolingTotal, "€")} · contribution {money(fb.contribution, "€")}/unit ·{" "}
          {fb.breakEvenUnits == null
            ? "price below variable cost — no break-even"
            : `clears tooling after ${fb.breakEvenUnits} of ${fb.qtyN || "—"} pc`}
        </p>
      </Panel>

      {/* What-if price */}
      <Panel className="p-4">
        <SectionHead
          title="What-if price"
          kicker="drag to test pricing"
          right={
            whatIf != null ? (
              <button
                onClick={() => {
                  patch({ unitPrice: String(previewPrice) });
                  setWhatIf(null);
                }}
                className="font-mono text-[12px] uppercase tracking-label text-brass hover:underline"
              >
                Set as price
              </button>
            ) : undefined
          }
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={Math.max(1, Math.round(fb.unitMaterial))}
            max={Math.max(50, Math.round(num(p.unitPrice) * 2.5))}
            value={previewPrice}
            onChange={(e) => setWhatIf(Number(e.target.value))}
            className="flex-1 accent-[#57A9FF]"
          />
          <div className="w-44 text-right font-mono text-[13px]">
            <span className="text-ink">{money(previewPrice, cur === "EUR" ? "€" : "")} {cur !== "EUR" ? cur : ""}</span>
            <span className="text-faint"> · </span>
            <span className={previewFb.margin >= 30 ? "text-ok" : "text-warn"}>{previewFb.margin.toFixed(0)}%</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Profit / unit" value={money(previewFb.unitProfit, "€")} tone={previewFb.unitProfit >= 0 ? "ok" : "bad"} />
          <Stat label="Total profit" value={money(previewFb.profit, "€")} tone={previewFb.profit >= 0 ? "ok" : "bad"} />
          <Stat label="Break-even" value={previewFb.breakEvenUnits == null ? "—" : `${previewFb.breakEvenUnits} pc`} />
        </div>
      </Panel>

      {/* Cost build-up */}
      <Panel className="p-4">
        <SectionHead title="Cost build-up" kicker={`per unit · ${cur}`} />
        <div className="grid gap-3 sm:grid-cols-3">
          {COST_LINES.map(([key, label]) => (
            <Field key={key} label={label} value={(p[key] as string) ?? ""} onChange={(v) => patch({ [key]: v } as Partial<Project>)} />
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 border-t border-line pt-3">
          <Field label={`Tooling — one-off (${cur})`} {...f("tooling")} />
          <Field label="Payment-channel fee %" {...f("feePct")} />
          <div className="flex items-end font-mono text-[12px] text-dim">
            Material/unit {money(fb.unitMaterial, "€")}
          </div>
        </div>
      </Panel>

      {/* Payment schedule */}
      <Panel className="p-4">
        <SectionHead title="Payment" kicker={committed(p) ? "committed" : "not yet committed"} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-inset p-3">
            <div className="flex items-center justify-between">
              <Label>Deposit · {cfg(p, "deposit", company)}%</Label>
              <span className="font-mono text-sm text-brass">{money(dep(p, company), "€")}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <Toggle label="Deposit paid" checked={p.depositPaid} onChange={(v) => patch({ depositPaid: v })} />
              <Field label="Expected date" type="date" {...f("depositExpected")} />
              {p.depositPaid && <Field label="Paid date" type="date" {...f("depositDate")} />}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-inset p-3">
            <div className="flex items-center justify-between">
              <Label>Balance</Label>
              <span className="font-mono text-sm text-brass">{money(bal(p, company), "€")}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <Toggle label="Balance paid" checked={p.balancePaid} onChange={(v) => patch({ balancePaid: v })} />
              <Field label="Expected date" type="date" {...f("balanceExpected")} />
              {p.balancePaid && <Field label="Paid date" type="date" {...f("balanceDate")} />}
            </div>
          </div>
        </div>
        <div className="mt-3 font-mono text-[13px]">
          Outstanding on this project: <span className="text-warn">{money(owed(p, company), "€")}</span>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Contract overrides" kicker="blank = inherit company default" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={`Deposit % (def ${company.deposit})`} {...f("deposit")} />
          <Field label={`Lot-fail % (def ${company.lotFail})`} {...f("lotFail")} />
          <Field label={`Max reworks (def ${company.rework})`} {...f("rework")} />
          <Field label={`QC window d (def ${company.window})`} {...f("window")} />
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : strong ? "text-ink" : "text-dim";
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{label}</span>
      <span className={cx(color, strong && "font-medium")}>{value}</span>
    </div>
  );
}
