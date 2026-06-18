/**
 * The command deck — the daily landing screen.
 *
 * The prioritized action queue (the original's hard-won ordering, preserved by
 * the domain layer) leads; the money line, cash runway chart, outreach pulse
 * and near deadlines sit alongside. Nothing here decides anything new — it is a
 * faithful surface over `buildDashboard`.
 */
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/domain";
import { Empty, Panel, SectionHead, Stat, Tag } from "@/ui/kit";
import { useDashboard } from "@/state/useDashboard";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";
import { targetPath } from "@/app/nav";

const QUEUE_TONE = { hot: "bad", go: "ok", "": "neutral" } as const;

export function Deck() {
  const d = useDashboard();
  const company = useStore((s) => s.company);
  const navigate = useNavigate();
  const monthlyTarget = parseFloat(company.monthlyRevenue) || 0;

  return (
    <div>
      <PageHeader
        title="Command deck"
        kicker="Today · what needs you"
        actions={
          <Tag tone={d.alerts ? "warn" : "ok"}>{d.alerts ? `${d.alerts} open` : "all clear"}</Tag>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Action queue */}
        <Panel className="p-4">
          <SectionHead title="Action queue" kicker="prioritized" />
          {d.queue.length === 0 ? (
            <Empty>Nothing pressing. Open the pipeline and create some pressure.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {d.queue.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => navigate(targetPath(q.target))}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-inset"
                  >
                    <span
                      className="ml-1 h-7 w-0.5 shrink-0 rounded"
                      style={{
                        background:
                          q.cls === "hot" ? "var(--bad)" : q.cls === "go" ? "var(--ok)" : "var(--line2)",
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{q.lbl}</span>
                      <span className="block truncate text-[11px] text-dim">{q.sub}</span>
                    </span>
                    <Tag tone={QUEUE_TONE[q.cls]}>{q.tag}</Tag>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Money + pulse */}
        <div className="flex flex-col gap-6">
          <Panel className="p-4">
            <SectionHead title="The money" kicker="all projects" />
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Revenue" value={money(d.totRev, "€")} tone="brass" />
              <Stat label="Net" value={money(d.net, "€")} tone={d.net >= 0 ? "ok" : "bad"} />
              <Stat label="Outstanding" value={money(d.outstanding, "€")} sub="committed, unpaid" />
              <Stat label="Next 30 days" value={money(d.expected30, "€")} sub="expected inflow" />
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionHead title="Pulse" kicker="this week" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dim">Outreach</span>
                <span className="font-mono text-sm">
                  <span className={d.behindOutreach ? "text-warn" : "text-ok"}>{d.outreachWk}</span>
                  <span className="text-faint"> / {d.outreachTarget}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dim">Active projects</span>
                <span className="font-mono text-sm text-ink">{d.activeProjects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dim">Open leads</span>
                <span className="font-mono text-sm text-ink">{d.leads.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-dim">Monthly target</span>
                <span className="font-mono text-sm text-faint">{money(monthlyTarget, "€")}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Cash runway */}
      <Panel className="mt-6 p-4">
        <SectionHead title="Cash runway" kicker="expected inflow · next ~5 months" />
        {d.monthBuckets.length === 0 ? (
          <Empty>No scheduled deposits or balances yet.</Empty>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthBuckets} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#2B3039" vertical={false} />
                <XAxis dataKey="name" stroke="#5E6470" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} />
                <YAxis stroke="#5E6470" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} width={48} />
                <Tooltip
                  cursor={{ fill: "rgba(201,162,75,.08)" }}
                  contentStyle={{
                    background: "#1B1E25",
                    border: "1px solid #2B3039",
                    borderRadius: 6,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [money(v, "€"), "inflow"]}
                />
                <Bar dataKey="inflow" fill="#C9A24B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Near deadlines */}
      {d.deadlinesSoon.length > 0 && (
        <Panel className="mt-6 p-4">
          <SectionHead title="Deadlines in the buffer" kicker="production" />
          <ul className="flex flex-col divide-y divide-line">
            {d.deadlinesSoon.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex w-full items-center gap-3 py-2 text-left hover:bg-inset"
                >
                  <span className="flex-1 truncate text-[13px]">{p.name || "Untitled"}</span>
                  <Tag>{p.stage}</Tag>
                  <span className="font-mono text-[11px] text-warn">{p.deadline}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
