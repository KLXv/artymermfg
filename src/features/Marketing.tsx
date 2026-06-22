/**
 * Marketing & growth — the demand side. A sales funnel, lead-source attribution
 * (which channels actually produce won deals + revenue), and a content calendar
 * to plan posts/campaigns. Analytics are pure derivations; the content items are
 * a synced part of the workspace.
 */
import { useMemo } from "react";
import {
  CONTENT_CHANNELS,
  CONTENT_STATUS,
  baseMoney,
  blankContent,
  marketingMetrics,
  type ContentItem,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, SelectField, Tag, TextArea } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

const STATUS_TONE: Record<string, "neutral" | "warn" | "brass" | "ok"> = {
  idea: "neutral",
  drafting: "warn",
  scheduled: "brass",
  posted: "ok",
};

function ContentCard({ c }: { c: ContentItem }) {
  const patch = useStore((s) => s.patchContent);
  const del = useStore((s) => s.deleteContent);
  const set = (k: keyof ContentItem, v: string) => patch(c.id, { [k]: v } as Partial<ContentItem>);

  return (
    <Panel className="p-3">
      <div className="flex items-center gap-2">
        <input
          value={c.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="What's the post / campaign?"
          className="min-w-0 flex-1 rounded-md border border-line bg-inset px-2.5 py-1.5 font-body text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <Tag tone={STATUS_TONE[c.status] || "neutral"}>{c.status}</Tag>
        <Button variant="danger" onClick={() => del(c.id)} className="mb-0">
          ✕
        </Button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <SelectField value={c.channel} onChange={(v) => set("channel", v)} options={CONTENT_CHANNELS} />
        <SelectField value={c.status} onChange={(v) => set("status", v)} options={[...CONTENT_STATUS]} />
        <Field value={c.date} onChange={(v) => set("date", v)} type="date" />
      </div>
      <Field value={c.link} onChange={(v) => set("link", v)} placeholder="Link (post / asset)" className="mt-2" />
      <TextArea value={c.notes} onChange={(v) => set("notes", v)} rows={2} placeholder="Notes / hook / caption…" className="mt-2" />
    </Panel>
  );
}

export function Marketing() {
  const accounts = useStore((s) => s.accounts);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);
  const content = useStore((s) => s.content);
  const upsertContent = useStore((s) => s.upsertContent);

  const m = useMemo(
    () => marketingMetrics(Object.values(accounts), Object.values(projects), company, Object.values(content)),
    [accounts, projects, company, content],
  );
  const maxFunnel = Math.max(1, ...m.funnel.map((f) => f.count));
  const items = Object.values(content).sort(
    (a, b) => CONTENT_STATUS.indexOf(a.status as never) - CONTENT_STATUS.indexOf(b.status as never) || (a.date < b.date ? -1 : 1),
  );

  return (
    <div>
      <PageHeader
        title="Marketing"
        kicker="demand · channels · content"
        actions={
          <Button variant="primary" onClick={() => upsertContent(blankContent())}>
            + Content
          </Button>
        }
      />

      {/* Funnel */}
      <Panel className="mb-6 p-4">
        <SectionHead
          title="Funnel"
          kicker="lead → delivered"
          right={<span className="font-mono text-[13px] text-dim">lead→won <span className="text-brass">{m.leadToWon.toFixed(0)}%</span></span>}
        />
        <div className="flex flex-col gap-2">
          {m.funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-[12px] uppercase tracking-label text-faint">{f.label}</span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-md border border-line bg-inset">
                <span
                  className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-brass/30 to-brass/70"
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
                <span className="absolute inset-y-0 left-2.5 flex items-center tnum font-mono text-[13px] text-ink">{f.count}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Channels */}
      <Panel className="mb-6 p-4">
        <SectionHead title="Lead sources" kicker="which channels convert" />
        {m.channels.length === 0 ? (
          <Empty>No clients yet. Add a client with a source to see channel performance.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1.5 font-normal">Source</th>
                  <th className="px-2 py-1.5 text-right font-normal">Leads</th>
                  <th className="px-2 py-1.5 text-right font-normal">Won</th>
                  <th className="px-2 py-1.5 text-right font-normal">Win rate</th>
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
        <p className="mt-2 font-mono text-[11px] text-faint">Set each client's source on their profile to sharpen this.</p>
      </Panel>

      {/* Content calendar */}
      <Panel className="p-4">
        <SectionHead
          title="Content calendar"
          kicker={CONTENT_STATUS.map((st) => `${m.contentByStatus[st] || 0} ${st}`).join(" · ")}
          right={
            <Button variant="ghost" onClick={() => upsertContent(blankContent())}>
              + Add
            </Button>
          }
        />
        {items.length === 0 ? (
          <Empty>No content planned. Add your first post or campaign.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((c) => (
              <ContentCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
