/**
 * The command deck — the daily landing screen.
 *
 * The prioritized action queue (the original's hard-won ordering, preserved by
 * the domain layer) leads; the money line, cash runway chart, outreach pulse
 * and near deadlines sit alongside. Nothing here decides anything new — it is a
 * faithful surface over `buildDashboard`.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { blankTask, coFounderBriefing, money, today } from "@/domain";
import { Button, Empty, Panel, SectionHead, Stat, Tag } from "@/ui/kit";
import { deckGreeting, deckSubline, OPERATOR } from "@/ui/companion";
import { WatchDial } from "@/ui/WatchDial";
import { useDashboard } from "@/state/useDashboard";
import { useStore } from "@/state/store";
import { useSharesStore } from "@/state/useSharesStore";
import { PageHeader } from "./PageHeader";
import { targetPath } from "@/app/nav";

const QUEUE_TONE = { hot: "bad", go: "ok", "": "neutral" } as const;

export function Deck() {
  const d = useDashboard();
  const company = useStore((s) => s.company);
  const upsertTask = useStore((s) => s.upsertTask);
  const responses = useSharesStore((s) => s.shares).filter((s) => !s.revoked && s.approval);
  const navigate = useNavigate();
  const monthlyTarget = parseFloat(company.monthlyRevenue) || 0;

  const summary = coFounderBriefing(d, OPERATOR);
  const [taskTitle, setTaskTitle] = useState("");
  const addQuickTask = () => {
    const t = taskTitle.trim();
    if (!t) return;
    upsertTask({ ...blankTask(), title: t, due: today() });
    setTaskTitle("");
  };

  return (
    <div>
      <PageHeader
        title={`${deckGreeting()}.`}
        kicker={deckSubline(d.alerts)}
        actions={
          <Tag tone={d.alerts ? "warn" : "ok"}>{d.alerts ? `${d.alerts} open` : "all clear"}</Tag>
        }
      />

      {/* Morning summary — the co-founder's read of the day, plus a quick capture. */}
      <Panel className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] uppercase tracking-label text-brass">Today</div>
            <p className="mt-1 text-[14px] leading-relaxed text-dim">{summary}</p>
          </div>
          <div className="flex items-center gap-1.5 lg:w-80">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuickTask()}
              placeholder="Quick add a task…"
              className="min-w-0 flex-1 rounded-md border border-line bg-inset px-2.5 py-2 font-body text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
            />
            <Button variant="primary" onClick={addQuickTask} disabled={!taskTitle.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Panel>

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
                      <span className="block truncate text-[14px] text-ink">{q.lbl}</span>
                      <span className="block truncate text-[13px] text-dim">{q.sub}</span>
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
                <span className="text-[13px] text-dim">Outreach</span>
                <span className="font-mono text-sm">
                  <span className={d.behindOutreach ? "text-warn" : "text-ok"}>{d.outreachWk}</span>
                  <span className="text-faint"> / {d.outreachTarget}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-dim">Active projects</span>
                <span className="font-mono text-sm text-ink">{d.activeProjects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-dim">Open leads</span>
                <span className="font-mono text-sm text-ink">{d.leads.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-dim">Monthly target</span>
                <span className="font-mono text-sm text-faint">{money(monthlyTarget, "€")}</span>
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col items-center p-4">
            <WatchDial size={210} mode="live" showConstruction showLogo />
            <div className="mt-2 font-mono text-[11px] uppercase tracking-label text-faint">Studio time</div>
          </Panel>
        </div>
      </div>

      {/* Cash runway */}
      <Panel className="mt-6 p-4">
        <SectionHead title="Cash runway" kicker="expected inflow · next ~5 months" />
        {d.monthBuckets.length === 0 ? (
          <Empty>No scheduled deposits or balances yet.</Empty>
        ) : (
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.monthBuckets} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2FE8AC" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2FE8AC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1B2A28" vertical={false} />
                <XAxis dataKey="name" stroke="#6C7688" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} />
                <YAxis stroke="#6C7688" tick={{ fontSize: 10, fontFamily: "var(--mono)" }} width={48} />
                <Tooltip
                  cursor={{ stroke: "#2FE8AC", strokeOpacity: 0.3 }}
                  contentStyle={{
                    background: "#0B1117",
                    border: "1px solid #1E2730",
                    borderRadius: 10,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [money(v, "€"), "inflow"]}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#5FF5C8"
                  strokeWidth={2}
                  fill="url(#inflowFill)"
                  dot={{ r: 2.5, fill: "#2FE8AC" }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Client responses from published links */}
      {responses.length > 0 && (
        <Panel className="mt-6 p-4">
          <SectionHead title="Client responses" kicker="from published links" />
          <ul className="flex flex-col divide-y divide-line">
            {responses.map((s) => {
              const a = s.approval!;
              const ok = a.decision === "approved";
              return (
                <li key={s.id}>
                  <button
                    onClick={() => s.project_id && navigate(`/projects/${s.project_id}`)}
                    className="flex w-full items-center gap-3 py-2 text-left hover:bg-inset"
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px]">{s.title || "Untitled"}</span>
                    <span className="hidden min-w-0 max-w-[40%] truncate text-[13px] text-dim sm:block">
                      {a.signer}
                      {a.note ? ` — "${a.note}"` : ""}
                    </span>
                    <Tag tone={ok ? "ok" : "warn"}>{ok ? "Approved" : "Changes"}</Tag>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

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
                  <span className="flex-1 truncate text-[14px]">{p.name || "Untitled"}</span>
                  <Tag>{p.stage}</Tag>
                  <span className="font-mono text-[13px] text-warn">{p.deadline}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
