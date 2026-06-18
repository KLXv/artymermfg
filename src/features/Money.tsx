/**
 * The money engine surface — revenue, cost, overheads and net across all
 * projects, the scheduled cash events, and an editable overhead ledger.
 */
import {
  acctName,
  bal,
  committed,
  dFromNow,
  dep,
  money,
  num,
  owed,
  projFin,
  type Expense,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, Stat } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

export function Money() {
  const d = useDashboard();
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const expenses = useStore((s) => s.expenses);
  const setExpenses = useStore((s) => s.setExpenses);

  const setExp = (i: number, patch: Partial<Expense>) =>
    setExpenses(expenses.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addExp = () => setExpenses([...expenses, { label: "", amount: "" }]);
  const removeExp = (i: number) => setExpenses(expenses.filter((_, idx) => idx !== i));

  return (
    <div>
      <PageHeader title="Money" kicker="across all projects" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={money(d.totRev, "€")} tone="brass" />
        <Stat label="COGS" value={money(d.totCost, "€")} />
        <Stat label="Overheads" value={money(d.totExp, "€")} />
        <Stat label="Net" value={money(d.net, "€")} tone={d.net >= 0 ? "ok" : "bad"} />
        <Stat label="Outstanding" value={money(d.outstanding, "€")} tone="warn" />
        <Stat label="Next 30d" value={money(d.expected30, "€")} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4">
          <SectionHead title="Scheduled cash" kicker="committed deposits + balances" />
          {d.cashEvents.length === 0 ? (
            <Empty>No committed projects with outstanding payments.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {d.cashEvents.map((e, i) => {
                const days = dFromNow(e.date);
                return (
                  <li key={i} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.label}</span>
                    <span className="font-mono text-[11px] text-faint">
                      {e.date || "no date"}
                      {days != null && days >= 0 ? ` · ${days}d` : days != null ? " · overdue" : ""}
                    </span>
                    <span className="w-20 text-right font-mono text-[12px] text-brass">{money(e.amount, "€")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionHead
            title="Overheads"
            kicker="monthly / fixed"
            right={
              <Button variant="ghost" onClick={addExp}>
                + Line
              </Button>
            }
          />
          {expenses.length === 0 ? (
            <Empty>No overheads logged.</Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((e, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field value={e.label} onChange={(v) => setExp(i, { label: v })} placeholder="Label" className="flex-1" />
                  <Field value={e.amount} onChange={(v) => setExp(i, { amount: v })} placeholder="€" className="w-24" />
                  <Button variant="danger" onClick={() => removeExp(i)} className="mb-0">
                    ✕
                  </Button>
                </div>
              ))}
              <div className="mt-1 text-right font-mono text-[12px] text-dim">
                Total {money(expenses.reduce((a, e) => a + num(e.amount), 0), "€")}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-5 p-4">
        <SectionHead title="Per-project ledger" />
        {d.projList.length === 0 ? (
          <Empty>No projects.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[9px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1.5 font-normal">Project</th>
                  <th className="px-2 py-1.5 text-right font-normal">Revenue</th>
                  <th className="px-2 py-1.5 text-right font-normal">Profit</th>
                  <th className="hidden px-2 py-1.5 text-right font-normal sm:table-cell">Deposit</th>
                  <th className="hidden px-2 py-1.5 text-right font-normal sm:table-cell">Balance</th>
                  <th className="px-2 py-1.5 text-right font-normal">Owed</th>
                </tr>
              </thead>
              <tbody>
                {d.projList.map((p) => {
                  const fin = projFin(p, company);
                  const com = committed(p);
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-2 py-1.5">
                        <div className="truncate text-[12px]">{p.name || "Untitled"}</div>
                        <div className="truncate text-[10px] text-faint">{acctName(p, accounts)}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-brass">{money(fin.rev, "€")}</td>
                      <td className={"px-2 py-1.5 text-right font-mono text-[11px] " + (fin.profit >= 0 ? "text-ok" : "text-bad")}>
                        {money(fin.profit, "€")}
                      </td>
                      <td className="hidden px-2 py-1.5 text-right font-mono text-[11px] text-dim sm:table-cell">
                        {com ? money(dep(p, company), "€") : "—"}
                      </td>
                      <td className="hidden px-2 py-1.5 text-right font-mono text-[11px] text-dim sm:table-cell">
                        {com ? money(bal(p, company), "€") : "—"}
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
