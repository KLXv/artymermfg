/**
 * Strategy & retention — goals vs actuals, the warranty / after-sales register
 * (with a service log per delivered piece), and referral attribution.
 */
import { useMemo, useState } from "react";
import {
  acctName,
  baseMoney,
  marginAnalysis,
  num,
  pipelineMetrics,
  referralReport,
  revenueThisMonth,
  rid,
  today,
  warrantyRegister,
  type WarrantyRow,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

function GoalBar({ label, actual, target, fmt }: { label: string; actual: number; target: number; fmt: (n: number) => string }) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  const hit = pct >= 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[12px] uppercase tracking-label text-faint">{label}</span>
        <span className="tnum font-mono text-[13px]">
          <span className={hit ? "text-ok" : "text-ink"}>{fmt(actual)}</span>
          <span className="text-faint"> / {fmt(target)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-inset">
        <div
          className={cx("h-full rounded-full", hit ? "bg-gradient-to-r from-ok/60 to-ok" : "bg-gradient-to-r from-brass/50 to-brass")}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-0.5 text-right font-mono text-[11px] text-faint">{pct}%</div>
    </div>
  );
}

const W_TONE: Record<string, "ok" | "warn" | "bad" | "neutral"> = { active: "ok", expiring: "warn", expired: "bad", unset: "neutral" };

function WarrantyCard({ row }: { row: WarrantyRow }) {
  const patch = useStore((s) => s.patchProject);
  const accounts = useStore((s) => s.accounts);
  const p = row.project;
  const w = p.warranty || { deliveredDate: "", months: "12", serial: "", services: [] };
  const [note, setNote] = useState("");
  const setW = (patchW: Partial<typeof w>) => patch(p.id, { warranty: { ...w, ...patchW } });
  const addService = () => {
    if (!note.trim()) return;
    setW({ services: [...(w.services || []), { id: rid("svc"), date: today(), note: note.trim() }] });
    setNote("");
  };
  const removeService = (id: string) => setW({ services: (w.services || []).filter((s) => s.id !== id) });

  return (
    <div className="rounded-lg border border-line bg-inset p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{p.name || "Untitled"}</span>
        <span className="truncate font-mono text-[12px] text-faint">{acctName(p, accounts)}</span>
        <Tag tone={W_TONE[row.status]}>
          {row.status === "unset"
            ? "set date"
            : row.status === "expired"
              ? "expired"
              : `${row.status} · ${row.daysLeft}d`}
        </Tag>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Field label="Delivered" type="date" value={w.deliveredDate} onChange={(v) => setW({ deliveredDate: v })} />
        <Field label="Warranty (months)" value={w.months} onChange={(v) => setW({ months: v })} />
        <Field label="Serial" value={w.serial} onChange={(v) => setW({ serial: v })} />
      </div>
      {row.expiry && <div className="mt-1.5 font-mono text-[11px] text-faint">Covered until {row.expiry}</div>}

      {(w.services || []).length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
          {w.services.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-[13px]">
              <span className="font-mono text-[12px] text-faint">{s.date}</span>
              <span className="min-w-0 flex-1 truncate text-dim">{s.note}</span>
              <button onClick={() => removeService(s.id)} className="font-mono text-[12px] text-faint hover:text-bad">✕</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addService()}
          placeholder="Log a service / repair…"
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2.5 py-1.5 font-body text-[13px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <Button variant="ghost" onClick={addService} disabled={!note.trim()}>
          Log
        </Button>
      </div>
    </div>
  );
}

export function Strategy() {
  const d = useDashboard();
  const company = useStore((s) => s.company);
  const invoices = useStore((s) => s.invoices);

  const margin = useMemo(() => marginAnalysis(d.projList, company), [d.projList, company]);
  const pm = useMemo(() => pipelineMetrics(d.projList, company), [d.projList, company]);
  const revMonth = useMemo(() => revenueThisMonth(Object.values(invoices)), [invoices]);
  const warranty = useMemo(() => warrantyRegister(d.projList), [d.projList]);
  const referrals = useMemo(() => referralReport(d.acctList, d.projList, company), [d.acctList, d.projList, company]);
  const revTarget = num(company.monthlyRevenue);
  const money = (n: number) => baseMoney(n, company);
  const pct = (n: number) => `${n.toFixed(0)}%`;

  return (
    <div>
      <PageHeader title="Strategy" kicker="goals · retention · referrals" />

      <Panel className="mb-6 p-4">
        <SectionHead title="Goals vs actuals" kicker="targets set in Settings" />
        <div className="grid gap-5 sm:grid-cols-2">
          <GoalBar label="Revenue this month" actual={revMonth} target={revTarget} fmt={money} />
          <GoalBar label="Outreach this week" actual={d.outreachWk} target={d.outreachTarget} fmt={(n) => String(Math.round(n))} />
          <GoalBar label="Blended margin" actual={margin.blendedMargin} target={30} fmt={pct} />
          <GoalBar label="Pipeline coverage" actual={pm.weighted} target={revTarget} fmt={money} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="p-4">
          <SectionHead title="Warranty & after-sales" kicker="delivered pieces" />
          {warranty.length === 0 ? (
            <Empty>No delivered pieces yet. Warranty starts the day a project is delivered.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {warranty.map((row) => (
                <WarrantyCard key={row.project.id} row={row} />
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Referrals" kicker="who sends business" />
          {referrals.length === 0 ? (
            <Empty>Set "Referred by" on a client to attribute referrals.</Empty>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1.5 font-normal">Referrer</th>
                  <th className="px-2 py-1.5 text-right font-normal">Sent</th>
                  <th className="px-2 py-1.5 text-right font-normal">Won</th>
                  <th className="px-2 py-1.5 text-right font-normal">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referrer} className="border-b border-line last:border-0">
                    <td className="px-2 py-1.5 text-[13px] text-ink">{r.referrer}</td>
                    <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-dim">{r.referred}</td>
                    <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-ok">{r.won}</td>
                    <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-brass">{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
