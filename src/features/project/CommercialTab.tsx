/**
 * The commercial + cost editor — the money instrument.
 *
 * Order and cost first, because everything else is derived from them: the
 * factory's price for a finished watch (or, rarely, a per-part build-up),
 * freight and customs on top, one-off tooling and the channel fee. Then the
 * economics that follow — revenue, per-unit profit, margin, break-even — a
 * what-if price slider, and the deposit/balance schedule feeding the deck's
 * cash events. All derivations come from the finance domain (`projFinance`).
 */
import { useState } from "react";
import {
  bal,
  baseMoney,
  cfg,
  committed,
  dep,
  costCurrencyOf,
  costModeOf,
  hasCosts,
  num,
  owed,
  projFinance,
  unitBuild,
  type Company,
  type Project,
} from "@/domain";
import { Field, Panel, SectionHead, SelectField, Stat, Toggle, Label, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { makeBind, type Patch } from "./bind";

const CURRENCIES = ["EUR", "RON", "USD"];

/** Component lines — the exception, not the rule. Itemised mode only. */
const PART_LINES: [keyof Project, string][] = [
  ["cMovement", "Movement"],
  ["cCase", "Case"],
  ["cDial", "Dial"],
  ["cHands", "Hands"],
  ["cCrystal", "Crystal"],
  ["cStrap", "Strap / bracelet"],
  ["cAssembly", "Assembly"],
];

/** Landed costs on top of the build — these apply in either mode. */
const EXTRA_LINES: [keyof Project, string][] = [
  ["cShip", "Freight / shipping"],
  ["cDuty", "Duty / customs"],
  ["cPack", "Packaging"],
  ["cOther", "Other"],
];

export function CommercialTab({ p, patch, company }: { p: Project; patch: Patch; company: Company }) {
  const f = makeBind(p, patch);
  const suppliers = useStore((s) => s.suppliers);
  const fb = projFinance(p, company);
  const cur = p.currency || "EUR";
  const mode = costModeOf(p);
  const costed = hasCosts(p);
  // Suppliers quote in their own currency (usually USD) while the job is sold
  // in another, so cost carries its own currency rather than borrowing price's.
  const costCur = costCurrencyOf(p);

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

      {/* What it costs you — the input everything below depends on, so it comes
          first. One factory price per watch is the normal case; the per-part
          build-up is there for the job that is actually costed that way. */}
      <Panel className="p-4">
        <SectionHead
          title="What it costs you"
          kicker={`per unit · ${costCur}`}
          right={
            <div className="flex gap-1">
              {(["simple", "itemised"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => patch({ costMode: m })}
                  className={cx(
                    "rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-label transition-colors",
                    mode === m ? "border-brass/50 bg-brass-dim text-brass" : "border-line text-faint hover:text-dim",
                  )}
                >
                  {m === "simple" ? "One price" : "Itemised"}
                </button>
              ))}
            </div>
          }
        />

        {mode === "simple" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={`Factory price per watch (${costCur})`} {...f("cUnit")} />
            <div className="flex items-end pb-2 font-mono text-[11px] leading-snug text-faint sm:col-span-1 lg:col-span-2">
              What the finished watch costs you, landed from the maker. Freight and customs go below.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PART_LINES.map(([key, label]) => (
              <Field key={key} label={label} value={(p[key] as string) ?? ""} onChange={(v) => patch({ [key]: v } as Partial<Project>)} />
            ))}
            <div className="flex items-end pb-2 font-mono text-[12px] text-dim">
              Build {baseMoney(unitBuild(p) * fb.rate, company)}/unit
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXTRA_LINES.map(([key, label]) => (
            <Field key={key} label={label} value={(p[key] as string) ?? ""} onChange={(v) => patch({ [key]: v } as Partial<Project>)} />
          ))}
        </div>

        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-4">
          <SelectField
            label="Supplier quotes in"
            value={costCur}
            onChange={(v) => patch({ costCurrency: v })}
            options={CURRENCIES}
          />
          <Field label={`Tooling — one-off, whole order (${costCur})`} {...f("tooling")} />
          <Field label="Payment-channel fee %" {...f("feePct")} />
          <div className="flex items-end pb-2 font-mono text-[13px] text-dim">
            Landed cost <span className="ml-1.5 text-ink">{baseMoney(fb.unitMaterial, company)}</span>
            <span className="ml-1 text-faint">/unit</span>
          </div>
        </div>
      </Panel>

      {/* Economics — the headline */}
      <Panel className="p-4">
        <SectionHead title="Economics" kicker={`all ${company.baseCurrency} · FX RON ${company.fx.RON} · USD ${company.fx.USD}`} />
        {!costed && (
          <p className="mb-3 rounded-md border border-warn/30 bg-warn/[.06] px-3 py-2 font-mono text-[12px] leading-snug text-warn">
            Nothing costed yet, so every figure below treats this as pure profit. Enter what the watch costs you above.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Revenue" value={baseMoney(fb.revenue, company)} tone="brass" />
          <Stat label="Total cost" value={baseMoney(fb.cost, company)} />
          <Stat label="Profit" value={baseMoney(fb.profit, company)} tone={fb.profit >= 0 ? "ok" : "bad"} />
          <Stat label="Margin" value={`${fb.margin.toFixed(0)}%`} tone={fb.margin >= 30 ? "ok" : "warn"} />
          <Stat label="Profit / unit" value={baseMoney(fb.unitProfit, company)} tone={fb.unitProfit >= 0 ? "ok" : "bad"} />
          <Stat
            label="Break-even"
            value={fb.breakEvenUnits == null ? "—" : `${fb.breakEvenUnits} pc`}
            tone={fb.toolingTotal <= 0 ? undefined : fb.breakEvenUnits != null && fb.breakEvenUnits <= fb.qtyN ? "ok" : "warn"}
          />
        </div>
        {/* Per-unit waterfall */}
        <div className="mt-3 grid gap-2 rounded-lg border border-line bg-inset-grad p-3 font-mono text-[13px] sm:grid-cols-2">
          <Row label="Price / unit" value={baseMoney(fb.unitPrice, company)} strong />
          <Row label="Landed cost / unit" value={`− ${baseMoney(fb.unitMaterial, company)}`} />
          <Row label={`Channel fee ${num(p.feePct) || 0}%`} value={`− ${baseMoney(fb.fee, company)}`} />
          <Row label="Tooling / unit (amortized)" value={`− ${baseMoney(fb.toolingPerUnit, company)}`} />
          <Row label="Cost / unit" value={baseMoney(fb.unitCost, company)} />
          <Row label="Profit / unit" value={baseMoney(fb.unitProfit, company)} strong tone={fb.unitProfit >= 0 ? "ok" : "bad"} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-faint">
          One-off tooling {baseMoney(fb.toolingTotal, company)} · contribution {baseMoney(fb.contribution, company)}/unit ·{" "}
          {fb.toolingTotal <= 0
            ? "no tooling to clear"
            : fb.breakEvenUnits == null
              ? "price below variable cost — tooling never clears"
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
          {/* The slider works in the sale currency, because that is what a price
              is typed in. Its floor is the landed cost expressed in that same
              currency (fb.unitMaterial is EUR), and the readout converts back
              out of it — otherwise the price is shown having been converted
              twice, which made a 674 lei price read as 3,536 lei at 2%. */}
          <input
            type="range"
            min={Math.max(1, Math.round(fb.unitMaterial / (fb.rate || 1)))}
            max={Math.max(50, Math.round(num(p.unitPrice) * 2.5))}
            value={previewPrice}
            onChange={(e) => setWhatIf(Number(e.target.value))}
            className="flex-1 accent-[#2FE8AC]"
          />
          <div className="w-44 text-right font-mono text-[13px]">
            <span className="text-ink">{baseMoney(previewPrice * fb.rate, company)}</span>
            <span className="text-faint"> · </span>
            <span className={previewFb.margin >= 30 ? "text-ok" : "text-warn"}>{previewFb.margin.toFixed(0)}%</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Profit / unit" value={baseMoney(previewFb.unitProfit, company)} tone={previewFb.unitProfit >= 0 ? "ok" : "bad"} />
          <Stat label="Total profit" value={baseMoney(previewFb.profit, company)} tone={previewFb.profit >= 0 ? "ok" : "bad"} />
          <Stat label="Break-even" value={previewFb.breakEvenUnits == null ? "—" : `${previewFb.breakEvenUnits} pc`} />
        </div>
      </Panel>

      {/* Payment schedule */}
      <Panel className="p-4">
        <SectionHead title="Payment" kicker={committed(p) ? "committed" : "not yet committed"} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-inset p-3">
            <div className="flex items-center justify-between">
              <Label>Deposit · {cfg(p, "deposit", company)}%</Label>
              <span className="font-mono text-sm text-brass">{baseMoney(dep(p, company), company)}</span>
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
              <span className="font-mono text-sm text-brass">{baseMoney(bal(p, company), company)}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <Toggle label="Balance paid" checked={p.balancePaid} onChange={(v) => patch({ balancePaid: v })} />
              <Field label="Expected date" type="date" {...f("balanceExpected")} />
              {p.balancePaid && <Field label="Paid date" type="date" {...f("balanceDate")} />}
            </div>
          </div>
        </div>
        <div className="mt-3 font-mono text-[13px]">
          Outstanding on this project: <span className="text-warn">{baseMoney(owed(p, company), company)}</span>
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
