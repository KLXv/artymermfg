/**
 * The pipeline board — every project as a card under its stage column, in the
 * canonical PIPE → PROD order. Advancing a stage settles the card's tick track.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  NEXT,
  STAGES,
  acctName,
  blankProject,
  money,
  owed,
  projFin,
  stageIdx,
  type Project,
} from "@/domain";
import { Button, Empty, Tag, cx } from "@/ui/kit";
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
          <span className="block truncate text-[13px] font-medium text-ink">{p.name || "Untitled"}</span>
          <span className="block truncate text-[11px] text-dim">{acctName(p, accounts)}</span>
        </span>
        {pl && <Tag tone="pl">PL</Tag>}
      </div>
      <StageTrack count={STAGES.length} current={stageIdx(p)} className="mt-2.5" height={16} />
      <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
        <span className="text-faint">{p.qty || "—"} pc</span>
        <span className="text-brass">{money(fin.rev, "€")}</span>
      </div>
      {due > 0 && <div className="mt-1 font-mono text-[10px] text-warn">{money(due, "€")} owed</div>}
    </button>
  );
}

export function Pipeline() {
  const projects = useStore((s) => s.projects);
  const upsertProject = useStore((s) => s.upsertProject);
  const navigate = useNavigate();

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

      {Object.keys(projects).length === 0 ? (
        <Empty>No projects yet. Start one, or import your data from Settings.</Empty>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGES.map((stage) => {
            const items = byStage[stage];
            return (
              <div key={stage} className="flex w-60 shrink-0 flex-col">
                <div className="mb-2 flex items-baseline justify-between border-b border-line pb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-label text-dim">{stage}</span>
                  <span className="font-mono text-[10px] text-faint">{items.length}</span>
                </div>
                <div className={cx("flex flex-col gap-2", items.length === 0 && "min-h-[60px]")}>
                  {items.length === 0 ? (
                    <div className="rounded border border-dashed border-line/60 p-3 text-center font-mono text-[9px] text-faint">
                      {NEXT[stage]}
                    </div>
                  ) : (
                    items.map((p) => <Card key={p.id} p={p} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lost.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-label text-faint">Lost / archived</div>
          <div className="flex flex-wrap gap-2">
            {lost.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="rounded border border-line px-3 py-1.5 font-mono text-[11px] text-faint hover:text-dim"
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
