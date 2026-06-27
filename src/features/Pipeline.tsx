/**
 * The pipeline board — every project as a card under its stage column, in the
 * canonical PIPE → PROD order. Advancing a stage settles the card's tick track.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PIPE,
  PROD,
  STAGES,
  acctName,
  baseMoney,
  blankProject,
  contactsDue,
  owed,
  pipelineMetrics,
  projFin,
  stageIdx,
  today,
  type Project,
} from "@/domain";
import { Button, Empty, Panel, SectionHead, Stat, Tag } from "@/ui/kit";

/** The board collapses the 13 stages into three readable phase lanes. */
const PHASES: { name: string; kicker: string; stages: readonly string[]; glyph: string }[] = [
  { name: "Sales", kicker: "proposal → won", stages: PIPE, glyph: "⇶" },
  { name: "Production", kicker: "brief → shipped", stages: PROD.filter((s) => s !== "Delivered"), glyph: "❖" },
  { name: "Delivered", kicker: "done · pursue repeat", stages: ["Delivered"], glyph: "✓" },
];
import { StageTrack } from "@/ui/StageTrack";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

function Card({ p }: { p: Project }) {
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const navigate = useNavigate();
  const fin = projFin(p, company);
  const due = owed(p, company);
  const pl = (p.servicePath || accounts[p.accountId]?.servicePath) === "Private label";

  return (
    <button
      onClick={() => navigate(`/projects/${p.id}`)}
      className="w-full rounded border border-line bg-panel p-3 text-left transition-colors hover:border-line2"
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">{p.name || "Untitled"}</span>
          <span className="block truncate text-[13px] text-dim">{acctName(p, accounts)}</span>
        </span>
        {pl && <Tag tone="pl">PL</Tag>}
      </div>
      <StageTrack count={STAGES.length} current={stageIdx(p)} className="mt-2.5" height={16} />
      <div className="mt-2 flex items-center justify-between font-mono text-[12px]">
        <span className="text-dim">{p.stage}</span>
        <span className="text-brass">{baseMoney(fin.rev, company)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-faint">
        <span>{p.qty || "—"} pc</span>
        {due > 0 && <span className="text-warn">{baseMoney(due, company)} owed</span>}
      </div>
    </button>
  );
}

export function Pipeline() {
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const patchAccount = useStore((s) => s.patchAccount);
  const upsertProject = useStore((s) => s.upsertProject);
  const navigate = useNavigate();

  const metrics = useMemo(() => pipelineMetrics(Object.values(projects), company), [projects, company]);
  const due = useMemo(() => contactsDue(Object.values(accounts)), [accounts]);

  const byStage = useMemo(() => {
    const m: Record<string, Project[]> = {};
    STAGES.forEach((s) => (m[s] = []));
    Object.values(projects).forEach((p) => {
      if (p.lost) return;
      (m[p.stage] ||= []).push(p);
    });
    return m;
  }, [projects]);

  const lost = Object.values(projects).filter((p) => p.lost);

  const newProject = () => {
    const p = blankProject();
    upsertProject(p);
    navigate(`/projects/${p.id}`);
  };

  const logContact = (id: string) => patchAccount(id, { lastContact: today() });

  return (
    <div>
      <PageHeader
        title="Pipeline"
        kicker="proposal → delivered"
        actions={
          <Button variant="primary" onClick={newProject}>
            + New project
          </Button>
        }
      />

      {/* Forecast */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Weighted forecast" value={baseMoney(metrics.weighted, company)} tone="brass" sub="open × stage probability" />
        <Stat label="Speculative" value={baseMoney(metrics.prospectValue, company)} sub="proposal · negotiating" />
        <Stat label="Committed" value={baseMoney(metrics.committedValue, company)} tone="ok" sub="won, in production" />
        <Stat
          label="Win rate"
          value={`${metrics.winRate.toFixed(0)}%`}
          sub={`${metrics.wonCount} won · ${metrics.lostCount} lost`}
        />
      </div>

      {/* Outreach cadence */}
      {due.length > 0 && (
        <Panel className="mb-5 p-4">
          <SectionHead title="Needs a touch" kicker={`${due.length} accounts`} />
          <ul className="flex flex-col divide-y divide-line">
            {due.slice(0, 6).map(({ account, reason, daysSince }) => (
              <li key={account.id} className="flex items-center gap-3 py-2">
                <button
                  onClick={() => navigate(`/clients/${account.id}`)}
                  className="min-w-0 flex-1 truncate text-left text-[14px] text-ink hover:text-brass"
                >
                  {account.name || "Unnamed"}
                </button>
                <Tag tone={reason === "follow-up due" ? "warn" : reason === "going cold" ? "bad" : "neutral"}>
                  {reason}
                </Tag>
                <span className="hidden w-16 text-right font-mono text-[12px] text-faint sm:inline">
                  {daysSince != null ? `${daysSince}d` : "never"}
                </span>
                <Button variant="ghost" onClick={() => logContact(account.id)}>
                  Log contact
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {Object.keys(projects).length === 0 ? (
        <Empty glyph="⇶">No projects yet. Start one, or import your data from Settings.</Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {PHASES.map((ph) => {
            const items = ph.stages
              .flatMap((s) => byStage[s] || [])
              .sort((a, b) => stageIdx(a) - stageIdx(b));
            const laneValue = items.reduce((t, p) => t + projFin(p, company).rev, 0);
            return (
              <Panel key={ph.name} className="flex flex-col p-4">
                <SectionHead
                  title={ph.name}
                  kicker={ph.kicker}
                  right={
                    <span className="font-mono text-[12px] text-faint">
                      {items.length}
                      {laneValue > 0 && <span className="ml-2 text-brass">{baseMoney(laneValue, company)}</span>}
                    </span>
                  }
                />
                {items.length === 0 ? (
                  <Empty glyph={ph.glyph}>Nothing in {ph.name.toLowerCase()} right now.</Empty>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((p) => (
                      <Card key={p.id} p={p} />
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {lost.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 font-mono text-[12px] uppercase tracking-label text-faint">Lost / archived</div>
          <div className="flex flex-wrap gap-2">
            {lost.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="rounded border border-line px-3 py-1.5 font-mono text-[13px] text-faint hover:text-dim"
              >
                {p.name || "Untitled"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
