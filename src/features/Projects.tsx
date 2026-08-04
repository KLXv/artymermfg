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
import { Button, Empty, Field, Panel, SelectField, Tag } from "@/ui/kit";
import { StageTrack } from "@/ui/StageTrack";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

/**
 * Starting a project asked for nothing and dropped you straight into a
 * seven-tab workbench with an untitled shell to fill in from memory. These are
 * the facts that exist the moment a job is real — everything else is spec work
 * that follows.
 */
function NewProject({ onDone }: { onDone: () => void }) {
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const upsertProject = useStore((s) => s.upsertProject);
  const navigate = useNavigate();
  const [p, setP] = useState(() => blankProject());
  const set = (k: keyof Project, v: string) => setP((prev) => ({ ...prev, [k]: v }) as Project);

  const acctOpts = [
    { value: "", label: "— no client yet —" },
    ...Object.values(accounts).map((a) => ({ value: a.id, label: a.name || "Unnamed" })),
  ];

  const create = () => {
    if (!p.name.trim()) return;
    upsertProject(p);
    navigate(`/projects/${p.id}`);
    onDone();
  };

  return (
    <Panel className="mb-4 p-4">
      <div className="mb-3 font-mono text-[12px] uppercase tracking-label text-brass">New project</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Piece name *" value={p.name} onChange={(v) => set("name", v)} mono={false} />
        <SelectField label="Client" value={p.accountId} onChange={(v) => set("accountId", v)} options={acctOpts} />
        <SelectField label="Service path" value={p.servicePath} onChange={(v) => set("servicePath", v)} options={["", "Commission", "Private label"]} />
        <Field label="Quantity (pc)" value={p.qty} onChange={(v) => set("qty", v)} />
        <Field label={`Unit price (${p.currency})`} value={p.unitPrice} onChange={(v) => set("unitPrice", v)} />
        <SelectField label="You sell in" value={p.currency} onChange={(v) => set("currency", v)} options={["RON", "EUR", "USD"]} />
        <Field label={`Factory price per watch (${p.costCurrency})`} value={p.cUnit} onChange={(v) => set("cUnit", v)} />
        <SelectField label="Supplier quotes in" value={p.costCurrency} onChange={(v) => set("costCurrency", v)} options={["USD", "EUR", "RON"]} />
        <Field label="Deadline" type="date" value={p.deadline} onChange={(v) => set("deadline", v)} />
      </div>
      <p className="mt-2 font-mono text-[11px] text-faint">
        The cost can wait, but the deck will chase you for it — margin is a guess without it. Everything else lives in
        the project's tabs.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" onClick={create} disabled={!p.name.trim()}>
          Create project
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {!p.name.trim() && <span className="font-mono text-[11px] text-faint">a piece name is required</span>}
        {p.unitPrice && p.cUnit && (
          <span className="ml-auto font-mono text-[12px] text-dim">
            margin {projFin(p, company).margin.toFixed(0)}%
          </span>
        )}
      </div>
    </Panel>
  );
}

export function Projects() {
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [adding, setAdding] = useState(false);

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


  return (
    <div>
      <PageHeader
        title="Projects"
        kicker={`${Object.keys(projects).length} total`}
        actions={
          <Button variant="primary" onClick={() => setAdding((a) => !a)}>
            {adding ? "Close" : "+ New project"}
          </Button>
        }
      />

      {adding && <NewProject onDone={() => setAdding(false)} />}

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
