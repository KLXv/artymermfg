/**
 * The money engine surface. The cash-flow forecast (scheduled receivables vs
 * overhead burn, cumulative) leads; receivables aging shows cash at risk;
 * margin health flags thin work; and the ledger tracks payments inline. All
 * figures come from the pure money/finance domain.
 */
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  acctName,
  bal,
  cashFlowForecast,
  committed,
  dep,
  marginAnalysis,
  money,
  monthlyBurn,
  num,
  owed,
  projFin,
  receivablesAging,
  type Expense,
  type Project,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, Stat, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

export function Money() {
  const d = useDashboard();
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const expenses = useStore((s) => s.expenses);
  const setExpenses = useStore((s) => s.setExpenses);
  const patchProject = useStore((s) => s.patchProject);

  const forecast = cashFlowForecast(d.projList, expenses, company, 6);
  const aging = receivablesAging(d.projList, company);
  const margin = marginAnalysis(d.projList, company);
  const burn = monthlyBurn(expenses);
  // Runway: months the cumulative position stays solvent given the burn.
  const endingPosition = forecast.length ? forecast[forecast.length - 1].cumulative : 0;

  const setExp = (i: number, patch: Partial<Expense>) =>
    setExpenses(expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addExp = () => setExpenses([...expenses, { label: "", amount: "" }]);
  const removeExp = (i: number) => setExpenses(expenses.filter((_, idx) => idx !== i));

  return (
    <div>
      <PageHeader title="Money" kicker="cash · receivables · margin" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={money(d.totRev, "€")} tone="brass" />
        <Stat label="Net" value={money(d.net, "€")} tone={d.net >= 0 ? "ok" : "bad"} />
        <Stat label="Blended margin" value={`${margin.blendedMargin.toFixed(0)}%`} tone={margin.blendedMargin >= 30 ? "ok" : "warn"} />
        <Stat label="Outstanding" value={money(d.outstanding, "€")} tone="warn" />
        <Stat label="Overdue" value={money(aging.totalOverdue, "€")} tone={aging.totalOverdue ? "bad" : undefined} />
        <Stat label="Monthly burn" value={money(burn, "€")} />
      </div>

      {/* Cash-flow forecast */}
      <Panel className="mt-6 p-4">
        <SectionHead
          title="Cash-flow forecast"
          kicker="6 months · scheduled receivables vs burn"
          right={
            <span className="font-mono text-[11px]">
              <span className="text-faint">ending position </span>
              <span className={endingPosition >= 0 ? "text-ok" : "text-bad"}>{money(endingPosition, "€")}</span>
            </span>
          }
        />
        {forecast.every((m) => m.inflow === 0) && burn === 0 ? (
          <Empty>No scheduled receivables or overheads to project.</Empty>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#2B3039" vertical={false} />
                <XAxis dataKey="month" stroke="#5E6470" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} />
                <YAxis stroke="#5E6470" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} width={52} />
                <ReferenceLine y={0} stroke="#5E6470" />
                <Tooltip
                  cursor={{ fill: "rgba(201,162,75,.06)" }}
                  contentStyle={{
                    background: "#1B1E25",
                    border: "1px solid #2B3039",
                    borderRadius: 6,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: number, name) => [money(v, "€"), name]}
                />
                <Bar dataKey="inflow" name="inflow" fill="#C9A24B" radius={[2, 2, 0, 0]} maxBarSize={36} />
                <Bar dataKey="outflow" name="burn" fill="#3A4150" radius={[2, 2, 0, 0]} maxBarSize={36} />
                <Line dataKey="cumulative" name="position" stroke="#6FB98F" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Receivables aging */}
        <Panel className="p-4">
          <SectionHead title="Receivables aging" kicker="committed, unpaid" />
          {aging.total === 0 ? (
            <Empty>No outstanding receivables.</Empty>
          ) : (
            <div className="flex flex-col gap-2">
              <AgeRow label="Not yet due" bucket={aging.notDue} tone="neutral" />
              <AgeRow label="Overdue 0–30d" bucket={aging.d0_30} tone="warn" />
              <AgeRow label="Overdue 31–60d" bucket={aging.d31_60} tone="warn" />
              <AgeRow label="Overdue 60d+" bucket={aging.d60plus} tone="bad" />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-2 font-mono text-[12px]">
                <span className="text-dim">Total outstanding</span>
                <span className="text-brass">{money(aging.total, "€")}</span>
              </div>
            </div>
          )}
        </Panel>

        {/* Margin health */}
        <Panel className="p-4">
          <SectionHead
            title="Margin health"
            kicker={`thin = under ${margin.thinThreshold}%`}
            right={margin.thinCount > 0 ? <Tag tone="warn">{margin.thinCount} thin</Tag> : <Tag tone="ok">healthy</Tag>}
          />
          {margin.rows.length === 0 ? (
            <Empty>No priced projects.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {margin.rows.slice(0, 6).map((r) => (
                <li key={r.project.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12px]">{r.project.name || "Untitled"}</span>
                  <span className="font-mono text-[11px] text-faint">{money(r.profit, "€")}</span>
                  <span
                    className={cx(
                      "w-12 text-right font-mono text-[12px]",
                      r.margin < margin.thinThreshold ? "text-warn" : "text-ok",
                    )}
                  >
                    {r.margin.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Overheads */}
      <Panel className="mt-5 p-4">
        <SectionHead
          title="Overheads"
          kicker="monthly burn"
          right={
            <Button variant="ghost" onClick={addExp}>
              + Line
            </Button>
          }
        />
        {expenses.length === 0 ? (
          <Empty>No overheads logged.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {expenses.map((e, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field value={e.label} onChange={(v) => setExp(i, { label: v })} placeholder="Label" className="flex-1" />
                <Field value={e.amount} onChange={(v) => setExp(i, { amount: v })} placeholder="€" className="w-24" />
                <Button variant="danger" onClick={() => removeExp(i)} className="mb-0">
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-right font-mono text-[12px] text-dim">
          Total {money(expenses.reduce((a, e) => a + num(e.amount), 0), "€")}
        </div>
      </Panel>

      {/* Ledger with inline payment tracking */}
      <Panel className="mt-5 p-4">
        <SectionHead title="Ledger" kicker="tap a leg to mark paid" />
        {d.projList.length === 0 ? (
          <Empty>No projects.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[9px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1.5 font-normal">Project</th>
                  <th className="px-2 py-1.5 text-right font-normal">Revenue</th>
                  <th className="px-2 py-1.5 text-center font-normal">Deposit</th>
                  <th className="px-2 py-1.5 text-center font-normal">Balance</th>
                  <th className="px-2 py-1.5 text-right font-normal">Owed</th>
                </tr>
              </thead>
              <tbody>
                {d.projList.map((p: Project) => {
                  const com = committed(p);
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-2 py-1.5">
                        <div className="truncate text-[12px]">{p.name || "Untitled"}</div>
                        <div className="truncate text-[10px] text-faint">{acctName(p, accounts)}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-brass">
                        {money(projFin(p, company).rev, "€")}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PayLeg
                          paid={p.depositPaid}
                          amount={dep(p, company)}
                          disabled={!com}
                          onToggle={() => patchProject(p.id, { depositPaid: !p.depositPaid })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PayLeg
                          paid={p.balancePaid}
                          amount={bal(p, company)}
                          disabled={!com}
                          onToggle={() => patchProject(p.id, { balancePaid: !p.balancePaid })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-warn">
                        {owed(p, company) > 0 ? money(owed(p, company), "€") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function AgeRow({ label, bucket, tone }: { label: string; bucket: { amount: number; count: number }; tone: "neutral" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-dim";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-dim">
        {label} {bucket.count > 0 && <span className="font-mono text-[10px] text-faint">· {bucket.count}</span>}
      </span>
      <span className={cx("font-mono text-[12px]", bucket.amount > 0 ? color : "text-faint")}>{money(bucket.amount, "€")}</span>
    </div>
  );
}

function PayLeg({ paid, amount, disabled, onToggle }: { paid: boolean; amount: number; disabled: boolean; onToggle: () => void }) {
  if (disabled) return <span className="font-mono text-[11px] text-faint">—</span>;
  return (
    <button
      onClick={onToggle}
      className={cx(
        "rounded border px-2 py-0.5 font-mono text-[10px] transition-colors",
        paid ? "border-[#6FB98F66] bg-[#6FB98F22] text-ok" : "border-line text-warn hover:border-brass",
      )}
    >
      {paid ? "✓ paid" : money(amount, "€")}
    </button>
  );
}
