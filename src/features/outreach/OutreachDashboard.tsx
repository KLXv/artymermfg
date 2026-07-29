/**
 * Outbound dashboard — this week's sent count vs. the weekly target, the
 * pipeline count by status, and the cadence backlog. "Sent" counts touch dates
 * logged in the last 7 days (the human send step); the target reuses the
 * company's weekly-outreach knob (default 15), set in Settings.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PROSPECT_STATUS, num, outboundMetrics } from "@/domain";
import { Button, Empty, Panel, SectionHead, Stat, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "../PageHeader";
import { OutreachNav } from "./OutreachNav";

const STATUS_TONE: Record<string, "neutral" | "warn" | "brass" | "ok" | "bad" | "pl"> = {
  "Not Contacted": "neutral",
  Contacted: "warn",
  Responded: "brass",
  "Concept Sent": "brass",
  Negotiating: "warn",
  "Closed Won": "ok",
  "Closed Lost": "bad",
  Nurture: "pl",
};
const BAR: Record<string, string> = {
  neutral: "bg-line2/70",
  warn: "bg-warn/60",
  brass: "bg-brass/60",
  ok: "bg-ok/60",
  bad: "bg-bad/60",
  pl: "bg-pl/60",
};

export function OutreachDashboard() {
  const prospects = useStore((s) => s.prospects);
  const candidates = useStore((s) => s.candidates);
  const company = useStore((s) => s.company);

  const list = useMemo(() => Object.values(prospects), [prospects]);
  const target = num(company.weeklyOutreach) || 15;
  const m = useMemo(() => outboundMetrics(list, target), [list, target]);
  const pendingReview = useMemo(() => Object.values(candidates).filter((c) => c.status === "pending").length, [candidates]);

  const pct = Math.min(100, target ? Math.round((m.sentThisWeek / target) * 100) : 0);
  const maxStatus = Math.max(1, ...m.byStatus.map((s) => s.count));

  return (
    <div>
      <PageHeader
        title="Outbound Engine"
        kicker="this week · pipeline"
        actions={
          <div className="flex gap-2">
            <Link to="/outreach/discovery">
              <Button variant="ghost">Discovery{pendingReview ? ` · ${pendingReview}` : ""}</Button>
            </Link>
            <Link to="/outreach/prospects">
              <Button variant="primary">Prospects</Button>
            </Link>
          </div>
        }
      />
      <OutreachNav />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sent this week" value={`${m.sentThisWeek}`} sub={`target ${target}`} tone={m.sentThisWeek >= target ? "ok" : "brass"} />
        <Stat label="Approved · unsent" value={`${m.approvedPending}`} sub="ready to send" tone={m.approvedPending ? "warn" : undefined} />
        <Stat label="Open prospects" value={`${m.openCount}`} sub="in the funnel" />
        <Stat label="Touches due" value={`${m.dueCount}`} sub="cadence backlog" tone={m.dueCount ? "warn" : "ok"} />
      </div>

      <Panel className="mb-6 p-4">
        <SectionHead
          title="Weekly target"
          kicker="sent vs. goal"
          right={<span className="font-mono text-[13px] text-dim"><span className={m.sentThisWeek >= target ? "text-ok" : "text-brass"}>{m.sentThisWeek}</span> / {target}</span>}
        />
        <div className="relative h-8 overflow-hidden rounded-md border border-line bg-inset">
          <span className={cx("absolute inset-y-0 left-0 rounded-md", m.sentThisWeek >= target ? "bg-ok/50" : "bg-gradient-to-r from-brass/30 to-brass/70")} style={{ width: `${pct}%` }} />
          <span className="absolute inset-y-0 left-2.5 flex items-center font-mono text-[12px] text-ink">{pct}%</span>
        </div>
        <p className="mt-2 font-mono text-[11px] text-faint">Target reuses the weekly-outreach goal in Settings. Nothing sends automatically — Phase 1 logs sends by hand.</p>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Pipeline by status" kicker="the cold funnel" />
        {list.length === 0 ? (
          <Empty glyph="➤" action={<Link to="/outreach/discovery"><Button variant="primary">Run Discovery</Button></Link>}>
            No prospects yet. Discovery proposes candidates; approving one adds it here.
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {m.byStatus.filter((s) => s.count > 0 || PROSPECT_STATUS.includes(s.status)).map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="w-32 shrink-0 font-mono text-[12px] uppercase tracking-label text-faint">{s.status}</span>
                <span className="relative h-6 flex-1 overflow-hidden rounded-md border border-line bg-inset">
                  <span className={cx("absolute inset-y-0 left-0 rounded-md", BAR[STATUS_TONE[s.status]])} style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                  <span className="absolute inset-y-0 left-2.5 flex items-center font-mono text-[12px] text-ink">{s.count || ""}</span>
                </span>
                <Tag tone={STATUS_TONE[s.status]}>{s.count}</Tag>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
