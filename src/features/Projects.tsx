/** Projects index — a dense, scannable register of every build. */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  STAGES,
  acctName,
  baseMoney,
  blankProject,
  owed,
  projFin,
  stageIdx,
  type Project,
} from "@/domain";
import { Button, Empty, Field, SelectField, Tag } from "@/ui/kit";
import { StageTrack } from "@/ui/StageTrack";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

export function Projects() {
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const upsertProject = useStore((s) => s.upsertProject);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

  const rows = useMemo(() => {
    let list = Object.values(projects);
    if (stageFilter !== "All") list = list.filter((p) => p.stage === stageFilter);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || acctName(p, accounts).toLowerCase().includes(t),
      );
    }
    return list.sort((a, b) => stageIdx(b) - stageIdx(a));
  }, [projects, accounts, q, stageFilter]);

  const newProject = () => {
    const p = blankProject();
    upsertProject(p);
    navigate(`/projects/${p.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        kicker={`${Object.keys(projects).length} total`}
        actions={
          <Button variant="primary" onClick={newProject}>
            + New project
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Field value={q} onChange={setQ} placeholder="Search name or client…" className="w-56" />
        <SelectField value={stageFilter} onChange={setStageFilter} options={["All", ...STAGES]} className="w-40" />
      </div>

      {rows.length === 0 ? (
        <Empty>No projects match. {Object.keys(projects).length === 0 && "Import your data from Settings, or start one."}</Empty>
      ) : (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-inset font-mono text-[11px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2 font-normal">Project</th>
                <th className="hidden px-3 py-2 font-normal sm:table-cell">Stage</th>
                <th className="px-3 py-2 text-right font-normal">Revenue</th>
                <th className="hidden px-3 py-2 text-right font-normal md:table-cell">Owed</th>
                <th className="hidden px-3 py-2 text-right font-normal md:table-cell">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p: Project) => {
                const fin = projFin(p, company);
                const due = owed(p, company);
                const pl = (p.servicePath || accounts[p.accountId]?.servicePath) === "Private label";
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-inset"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] text-ink">{p.name || "Untitled"}</span>
                        {pl && <Tag tone="pl">PL</Tag>}
                        {p.lost && <Tag tone="bad">lost</Tag>}
                      </div>
                      <div className="truncate text-[13px] text-dim">{acctName(p, accounts)}</div>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <div className="flex items-center gap-2">
                        <StageTrack count={STAGES.length} current={stageIdx(p)} height={14} />
                        <span className="font-mono text-[12px] text-dim">{p.stage}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[13px] text-brass">{baseMoney(fin.rev, company)}</td>
                    <td className="hidden px-3 py-2.5 text-right font-mono text-[13px] md:table-cell">
                      <span className={due > 0 ? "text-warn" : "text-faint"}>{due > 0 ? baseMoney(due, company) : "—"}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right font-mono text-[13px] text-dim md:table-cell">
                      {p.deadline || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
