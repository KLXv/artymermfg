/**
 * The commercial + cost editor. Live deposit/balance/margin derivations come
 * straight from the finance domain — payment state here flows directly into the
 * deck's cash events and the action queue.
 */
import {
  bal,
  cfg,
  committed,
  dep,
  money,
  num,
  owed,
  projFin,
  unitCOGS,
  type Company,
  type Project,
} from "@/domain";
import { Field, Panel, SectionHead, SelectField, Stat, Toggle, Label } from "@/ui/kit";
import { useStore } from "@/state/store";
import { makeBind, type Patch } from "./bind";

const CURRENCIES = ["EUR", "RON", "USD"];

export function CommercialTab({ p, patch, company }: { p: Project; patch: Patch; company: Company }) {
  const f = makeBind(p, patch);
  const suppliers = useStore((s) => s.suppliers);
  const fin = projFin(p, company);
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
          <Field label="Unit price" {...f("unitPrice")} />
          <SelectField label="Currency" {...f("currency")} options={CURRENCIES} />
          <Field label="Deadline" type="date" {...f("deadline")} />
          <Field label="Revision" {...f("rev")} />
          <SelectField label="Supplier" value={p.supplierId} onChange={(v) => patch({ supplierId: v })} options={supplierOpts} />
          <Field label="Maker (if no supplier linked)" {...f("maker")} className="sm:col-span-3" />
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Economics" kicker={`FX → € · RON ${company.fx.RON} · USD ${company.fx.USD}`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Revenue" value={money(fin.rev, "€")} tone="brass" />
          <Stat label="Cost" value={money(fin.cost, "€")} />
          <Stat label="Profit" value={money(fin.profit, "€")} tone={fin.profit >= 0 ? "ok" : "bad"} />
          <Stat label="Margin" value={`${fin.margin.toFixed(0)}%`} tone={fin.margin >= 30 ? "ok" : "warn"} />
        </div>
        <div className="mt-2 font-mono text-[11px] text-dim">
          Unit COGS {money(unitCOGS(p), "€")} · incl. tooling amortized over {num(p.qty) || 0} pc
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Cost breakdown" kicker="per unit, except tooling (one-off)" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tooling (one-off)" {...f("tooling")} />
          <Field label="Movement" {...f("cMovement")} />
          <Field label="Case" {...f("cCase")} />
          <Field label="Dial" {...f("cDial")} />
          <Field label="Assembly" {...f("cAssembly")} />
          <Field label="Packaging" {...f("cPack")} />
          <Field label="Shipping" {...f("cShip")} />
          <Field label="Duty" {...f("cDuty")} />
          <Field label="Other" {...f("cOther")} />
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Payment" kicker={committed(p) ? "committed" : "not yet committed"} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-line bg-inset p-3">
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
          <div className="rounded border border-line bg-inset p-3">
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
        <div className="mt-3 font-mono text-[12px]">
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
