/**
 * The money engine surface. The cash-flow forecast (scheduled receivables vs
 * overhead burn, cumulative) leads; receivables aging shows cash at risk;
 * margin health flags thin work; and the ledger tracks payments inline. All
 * figures come from the pure money/finance domain.
 */
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import {
  CCY,
  acctName,
  bal,
  baseMoney,
  cashFlowForecast,
  committed,
  convertCcy,
  dep,
  fmtCcy,
  marginAnalysis,
  monthlyBurn,
  num,
  owed,
  profitTimeline,
  projFin,
  receivablesAging,
  type Ccy,
  type Expense,
  type Project,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, Stat, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

const CCY_KEY = "artymer:money-ccy";

export function Money() {
  const d = useDashboard();
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const expenses = useStore((s) => s.expenses);
  const invoices = useStore((s) => s.invoices);
  const setExpenses = useStore((s) => s.setExpenses);
  const patchProject = useStore((s) => s.patchProject);

  // Figures are kept in the company's base currency; the toggle is a view that
  // converts to another currency (a UI preference, persisted locally).
  const base = (company.baseCurrency as Ccy) || "EUR";
  const [ccy, setCcy] = useState<Ccy>(() => (localStorage.getItem(CCY_KEY) as Ccy) || base);
  const pickCcy = (c: Ccy) => {
    setCcy(c);
    localStorage.setItem(CCY_KEY, c);
  };
  const m = (amt: number) => (ccy === base ? baseMoney(amt, company) : fmtCcy(convertCcy(amt, base, ccy, company.fx), ccy));
  const conv = (amt: number) => convertCcy(amt, base, ccy, company.fx);

  const forecast = cashFlowForecast(d.projList, expenses, company, 6).map((row) => ({
    ...row,
    inflow: Math.round(conv(row.inflow)),
    outflow: Math.round(conv(row.outflow)),
    cumulative: Math.round(conv(row.cumulative)),
  }));
  const aging = receivablesAging(d.projList, company);
  const margin = marginAnalysis(d.projList, company);
  const burn = monthlyBurn(expenses);
  // Runway: months the cumulative position stays solvent given the burn.
  const endingPosition = forecast.length ? forecast[forecast.length - 1].cumulative : 0;

  // Profit-and-loss over time (from invoices + matched COGS + overheads).
  const pnl = profitTimeline(Object.values(invoices), d.projList, company, expenses, 8).map((r) => ({
    month: r.month,
    revenue: Math.round(conv(r.revenue)),
    costs: Math.round(conv(r.cost + r.overhead)),
    profit: Math.round(conv(r.profit)),
  }));
  const pnlRevenue = pnl.reduce((a, r) => a + r.revenue, 0);
  const pnlProfit = pnl.reduce((a, r) => a + r.profit, 0);

  const setExp = (i: number, patch: Partial<Expense>) =>
    setExpenses(expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addExp = () => setExpenses([...expenses, { label: "", amount: "" }]);
  const removeExp = (i: number) => setExpenses(expenses.filter((_, idx) => idx !== i));

  const fxNote = ccy === base ? "base currency" : `converted from ${base} · rates in Settings`;

  return (
    <div>
      <PageHeader
        title="Money"
        kicker="cash · receivables · margin"
        actions={
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
              {CCY.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickCcy(c)}
                  className={cx(
                    "rounded-md border px-2.5 py-1 font-mono text-[12px] transition-colors",
                    ccy === c ? "border-brass bg-brass-dim text-brass" : "border-line text-dim hover:border-line2 hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-label text-faint">{fxNote}</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={m(d.totRev)} tone="brass" />
        <Stat label="Net" value={m(d.net)} tone={d.net >= 0 ? "ok" : "bad"} />
        <Stat label="Blended margin" value={`${margin.blendedMargin.toFixed(0)}%`} tone={margin.blendedMargin >= 30 ? "ok" : "warn"} />
        <Stat label="Outstanding" value={m(d.outstanding)} tone="warn" />
        <Stat label="Overdue" value={m(aging.totalOverdue)} tone={aging.totalOverdue ? "bad" : undefined} />
        <Stat label="Monthly burn" value={m(burn)} />
      </div>

      {/* Cash-flow forecast */}
      <Panel className="mt-6 p-4">
        <SectionHead
          title="Cash-flow forecast"
          kicker="6 months · scheduled receivables vs burn"
          right={
            <span className="font-mono text-[13px]">
              <span className="text-faint">ending position </span>
              <span className={endingPosition >= 0 ? "text-ok" : "text-bad"}>{fmtCcy(endingPosition, ccy)}</span>
            </span>
          }
        />
        {forecast.every((m) => m.inflow === 0) && burn === 0 ? (
          <Empty>No scheduled receivables or overheads to project.</Empty>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="posFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5FF5C8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5FF5C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#22332E" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" stroke="#3A4550" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8A93A0" }} />
                <YAxis stroke="#3A4550" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8A93A0" }} width={52} />
                <ReferenceLine y={0} stroke="#3A4550" />
                <Tooltip
                  cursor={{ fill: "rgba(47,232,172,.07)" }}
                  contentStyle={{
                    background: "#0B1117",
                    border: "1px solid #1E2730",
                    borderRadius: 6,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: number, name) => [fmtCcy(v, ccy), name]}
                />
                <Bar dataKey="inflow" name="inflow" fill="#2FE8AC" radius={[2, 2, 0, 0]} maxBarSize={36} />
                <Bar dataKey="outflow" name="burn" fill="#33454F" radius={[2, 2, 0, 0]} maxBarSize={36} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="position"
                  stroke="#5FF5C8"
                  strokeWidth={2}
                  fill="url(#posFill)"
                  dot={{ r: 2, fill: "#2FE8AC" }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Profit & loss over time */}
      <Panel className="mt-6 p-4">
        <SectionHead
          title="Profit & loss"
          kicker="invoiced revenue − cost − overheads · by month"
          right={
            <span className="font-mono text-[13px]">
              <span className="text-faint">profit </span>
              <span className={pnlProfit >= 0 ? "text-ok" : "text-bad"}>{fmtCcy(pnlProfit, ccy)}</span>
              {pnlRevenue > 0 && <span className="text-faint"> · {Math.round((pnlProfit / pnlRevenue) * 100)}%</span>}
            </span>
          }
        />
        {pnl.length === 0 ? (
          <Empty>No issued invoices yet. Profit over time appears once you invoice.</Empty>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pnl} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5FF5C8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5FF5C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#22332E" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" stroke="#3A4550" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8A93A0" }} />
                <YAxis stroke="#3A4550" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#8A93A0" }} width={52} />
                <ReferenceLine y={0} stroke="#3A4550" />
                <Tooltip
                  cursor={{ fill: "rgba(47,232,172,.07)" }}
                  contentStyle={{ background: "#0B1117", border: "1px solid #1E2730", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 11 }}
                  formatter={(v: number, name) => [fmtCcy(v, ccy), name]}
                />
                <Bar dataKey="revenue" name="revenue" fill="#2FE8AC" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Bar dataKey="costs" name="costs" fill="#7A2230" radius={[2, 2, 0, 0]} maxBarSize={32} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="profit"
                  stroke="#5FF5C8"
                  strokeWidth={2}
                  fill="url(#profitFill)"
                  dot={{ r: 2, fill: "#2FE8AC" }}
                  activeDot={{ r: 4 }}
                />
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
              <AgeRow label="Not yet due" bucket={aging.notDue} tone="neutral" fmt={m} />
              <AgeRow label="Overdue 0–30d" bucket={aging.d0_30} tone="warn" fmt={m} />
              <AgeRow label="Overdue 31–60d" bucket={aging.d31_60} tone="warn" fmt={m} />
              <AgeRow label="Overdue 60d+" bucket={aging.d60plus} tone="bad" fmt={m} />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-2 font-mono text-[13px]">
                <span className="text-dim">Total outstanding</span>
                <span className="text-brass">{m(aging.total)}</span>
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
                  <span className="min-w-0 flex-1 truncate text-[13px]">{r.project.name || "Untitled"}</span>
                  <span className="font-mono text-[13px] text-faint">{m(r.profit)}</span>
                  <span
                    className={cx(
                      "w-12 text-right font-mono text-[13px]",
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
                <Field value={e.amount} onChange={(v) => setExp(i, { amount: v })} placeholder={base === "RON" ? "lei" : base} className="w-24" />
                <Button variant="danger" onClick={() => removeExp(i)} className="mb-0">
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-right font-mono text-[13px] text-dim">
          Total {m(expenses.reduce((a, e) => a + num(e.amount), 0))}
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
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wide text-faint">
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
                        <div className="truncate text-[13px]">{p.name || "Untitled"}</div>
                        <div className="truncate text-[12px] text-faint">{acctName(p, accounts)}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[13px] text-brass">
                        {m(projFin(p, company).rev)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PayLeg
                          paid={p.depositPaid}
                          amount={dep(p, company)}
                          disabled={!com}
                          fmt={m}
                          onToggle={() => patchProject(p.id, { depositPaid: !p.depositPaid })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <PayLeg
                          paid={p.balancePaid}
                          amount={bal(p, company)}
                          disabled={!com}
                          fmt={m}
                          onToggle={() => patchProject(p.id, { balancePaid: !p.balancePaid })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[13px] text-warn">
                        {owed(p, company) > 0 ? m(owed(p, company)) : "—"}
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

function AgeRow({ label, bucket, tone, fmt }: { label: string; bucket: { amount: number; count: number }; tone: "neutral" | "warn" | "bad"; fmt: (n: number) => string }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-dim";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-dim">
        {label} {bucket.count > 0 && <span className="font-mono text-[12px] text-faint">· {bucket.count}</span>}
      </span>
      <span className={cx("font-mono text-[13px]", bucket.amount > 0 ? color : "text-faint")}>{fmt(bucket.amount)}</span>
    </div>
  );
}

function PayLeg({ paid, amount, disabled, fmt, onToggle }: { paid: boolean; amount: number; disabled: boolean; fmt: (n: number) => string; onToggle: () => void }) {
  if (disabled) return <span className="font-mono text-[13px] text-faint">—</span>;
  return (
    <button
      onClick={onToggle}
      className={cx(
        "rounded border px-2 py-0.5 font-mono text-[12px] transition-colors",
        paid ? "border-[#6FB98F66] bg-[#6FB98F22] text-ok" : "border-line text-warn hover:border-brass",
      )}
    >
      {paid ? "✓ paid" : fmt(amount)}
    </button>
  );
}
