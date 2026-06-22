/**
 * Marketing & growth — the demand side, made operational.
 *
 * A value-aware sales funnel (counts + conversion + pipeline €), lead-source
 * attribution, a content cadence + agenda (overdue / upcoming / posted), and a
 * kanban content board (idea → drafting → scheduled → posted) where each item
 * can feature a piece. Analytics are pure derivations; content is synced.
 */
import { useMemo } from "react";
import {
  CONTENT_CHANNELS,
  CONTENT_STATUS,
  baseMoney,
  blankContent,
  dFromNow,
  marketingMetrics,
  pipelineMetrics,
  type ContentItem,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, SelectField, Stat, Tag, TextArea, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const STATUS_TONE: Record<string, "neutral" | "warn" | "brass" | "ok"> = {
  idea: "neutral",
  drafting: "warn",
  scheduled: "brass",
  posted: "ok",
};

function BoardCard({ c, projectOpts }: { c: ContentItem; projectOpts: { value: string; label: string }[] }) {
  const patch = useStore((s) => s.patchContent);
  const del = useStore((s) => s.deleteContent);
  const set = (k: keyof ContentItem, v: string) => patch(c.id, { [k]: v } as Partial<ContentItem>);
  const idx = CONTENT_STATUS.indexOf(c.status as never);
  const move = (dir: -1 | 1) => set("status", CONTENT_STATUS[Math.max(0, Math.min(CONTENT_STATUS.length - 1, idx + dir))]);
  const od = c.status === "scheduled" && c.date && (dFromNow(c.date) ?? 0) < 0;

  return (
    <div className={cx("rounded-lg border bg-inset p-2.5", od ? "border-bad/50" : "border-line")}>
      <input
        value={c.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Post / campaign…"
        className="w-full rounded border border-line bg-panel px-2 py-1.5 font-body text-[13px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
      />
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <SelectField value={c.channel} onChange={(v) => set("channel", v)} options={CONTENT_CHANNELS} />
        <Field value={c.date} onChange={(v) => set("date", v)} type="date" />
      </div>
      {projectOpts.length > 1 && (
        <SelectField value={c.projectId} onChange={(v) => set("projectId", v)} options={projectOpts} className="mt-1.5" />
      )}
      <Field value={c.link} onChange={(v) => set("link", v)} placeholder="Link" className="mt-1.5" />
      <TextArea value={c.notes} onChange={(v) => set("notes", v)} rows={2} placeholder="Hook / caption…" className="mt-1.5" />
      <div className="mt-2 flex items-center gap-1">
        <button onClick={() => move(-1)} disabled={idx <= 0} className="rounded border border-line px-2 py-0.5 font-mono text-[12px] text-dim disabled:opacity-30 hover:border-brass">‹</button>
        <button onClick={() => move(1)} disabled={idx >= CONTENT_STATUS.length - 1} className="rounded border border-line px-2 py-0.5 font-mono text-[12px] text-dim disabled:opacity-30 hover:border-brass">›</button>
        {od && <span className="font-mono text-[11px] text-bad">overdue</span>}
        <Button variant="danger" onClick={() => del(c.id)} className="ml-auto mb-0 px-2 py-0.5">✕</Button>
      </div>
    </div>
  );
}

export function Marketing() {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);
  const content = useStore((s) => s.content);
  const upsertContent = useStore((s) => s.upsertContent);

  const acctList = useMemo(() => Object.values(accounts), [accounts]);
  const projList = useMemo(() => Object.values(projects), [projects]);
  const contentList = useMemo(() => Object.values(content), [content]);
  const m = useMemo(() => marketingMetrics(acctList, projList, company, contentList), [acctList, projList, company, contentList]);
  const pm = useMemo(() => pipelineMetrics(projList, company), [projList, company]);
  const maxFunnel = Math.max(1, ...m.funnel.map((f) => f.count));
  const avgDeal = pm.wonCount ? pm.committedValue / pm.wonCount : 0;
  const projectOpts = [
    { value: "", label: "— feature a piece —" },
    ...projList.map((p) => ({ value: p.id, label: p.name || "Untitled" })),
  ];

  const addTo = (status: string) => upsertContent({ ...blankContent(), status });

  return (
    <div>
      <PageHeader
        title="Marketing"
        kicker="demand · channels · content"
        actions={
          <Button variant="primary" onClick={() => addTo("idea")}>
            + Content
          </Button>
        }
      />

      {/* Funnel + pipeline value */}
      <Panel className="mb-6 p-4">
        <SectionHead
          title="Funnel"
          kicker="lead → delivered"
          right={<span className="font-mono text-[13px] text-dim">lead→won <span className="text-brass">{m.leadToWon.toFixed(0)}%</span></span>}
        />
        <div className="flex flex-col gap-2">
          {m.funnel.map((f, i) => {
            const prev = i > 0 ? m.funnel[i - 1].count : 0;
            const conv = i > 0 && prev > 0 ? Math.round((f.count / prev) * 100) : null;
            return (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 font-mono text-[12px] uppercase tracking-label text-faint">{f.label}</span>
                <span className="relative h-7 flex-1 overflow-hidden rounded-md border border-line bg-inset">
                  <span className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-brass/30 to-brass/70" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                  <span className="absolute inset-y-0 left-2.5 flex items-center tnum font-mono text-[13px] text-ink">{f.count}</span>
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[12px] text-faint">{conv != null ? `${conv}%` : ""}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Weighted forecast" value={baseMoney(pm.weighted, company)} tone="brass" />
          <Stat label="Committed" value={baseMoney(pm.committedValue, company)} tone="ok" />
          <Stat label="Avg deal" value={baseMoney(avgDeal, company)} />
          <Stat label="Win rate" value={`${pm.winRate.toFixed(0)}%`} sub={`${pm.wonCount} won · ${pm.lostCount} lost`} />
        </div>
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Lead sources */}
        <Panel className="p-4">
          <SectionHead title="Lead sources" kicker="which channels convert" />
          {m.channels.length === 0 ? (
            <Empty>Add a client with a source to see channel performance.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wide text-faint">
                    <th className="px-2 py-1.5 font-normal">Source</th>
                    <th className="px-2 py-1.5 text-right font-normal">Leads</th>
                    <th className="px-2 py-1.5 text-right font-normal">Won</th>
                    <th className="px-2 py-1.5 text-right font-normal">Rate</th>
                    <th className="px-2 py-1.5 text-right font-normal">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {m.channels.map((r) => (
                    <tr key={r.source} className="border-b border-line last:border-0">
                      <td className="px-2 py-1.5 text-[13px] text-ink">{r.source}</td>
                      <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-dim">{r.leads}</td>
                      <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-ok">{r.won}</td>
                      <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-dim">{r.winRate.toFixed(0)}%</td>
                      <td className="px-2 py-1.5 text-right tnum font-mono text-[13px] text-brass">{baseMoney(r.revenue, company)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Cadence + agenda */}
        <Panel className="p-4">
          <SectionHead
            title="Cadence"
            kicker="consistency wins"
            right={
              <span className="font-mono text-[13px]">
                <span className={m.postedThisWeek >= m.postedLastWeek ? "text-ok" : "text-warn"}>{m.postedThisWeek}</span>
                <span className="text-faint"> this wk · {m.postedLastWeek} last</span>
              </span>
            }
          />
          {m.overdue.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-label text-bad">Overdue</div>
              <ul className="flex flex-col gap-1">
                {m.overdue.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate text-dim">{c.title || "Untitled"}</span>
                    <span className="font-mono text-[12px] text-bad">{c.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mb-1 font-mono text-[11px] uppercase tracking-label text-brass">Upcoming</div>
          {m.upcoming.length === 0 ? (
            <p className="font-mono text-[13px] text-faint">Nothing scheduled. Plan a post below.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {m.upcoming.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-[13px]">
                  <Tag tone="neutral">{c.channel}</Tag>
                  <span className="min-w-0 flex-1 truncate text-dim">{c.title || "Untitled"}</span>
                  <span className="font-mono text-[12px] text-faint">{c.date}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Content board */}
      <Panel className="p-4">
        <SectionHead title="Content board" kicker="idea → posted" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {CONTENT_STATUS.map((status) => {
            const items = contentList.filter((c) => c.status === status);
            return (
              <div key={status} className="flex w-72 shrink-0 flex-col">
                <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5">
                  <span className="flex items-center gap-2">
                    <Tag tone={STATUS_TONE[status]}>{status}</Tag>
                    <span className="font-mono text-[12px] text-faint">{items.length}</span>
                  </span>
                  <button onClick={() => addTo(status)} className="font-mono text-[12px] text-brass hover:underline">+ add</button>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="rounded border border-dashed border-line/60 p-3 text-center font-mono text-[11px] text-faint">
                      nothing here
                    </div>
                  ) : (
                    items.map((c) => <BoardCard key={c.id} c={c} projectOpts={projectOpts} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
