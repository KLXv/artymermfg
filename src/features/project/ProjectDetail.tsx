/**
 * Project detail — the workbench. A header carrying the stage index, service
 * path and the live money line, over five tabs: Build (the spec), Commercial,
 * QC, Presentation, Documents. Edits patch the store immediately.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  NEXT,
  PROD,
  SERVICE,
  STAGES,
  acctName,
  committed,
  dFromNow,
  money,
  owed,
  projFin,
  projVerdict,
  stageIdx,
} from "@/domain";
import { IndexRing } from "@/ui/IndexRing";
import { Button, Empty, Panel, SelectField, Tag, Toggle, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "../PageHeader";
import { BuildTab } from "./BuildTab";
import { CommercialTab } from "./CommercialTab";
import { QcTab } from "./QcTab";
import { PresentationTab } from "./PresentationTab";
import { DocumentsTab } from "./DocumentsTab";
import type { Patch } from "./bind";

const TABS = ["Build", "Commercial", "QC", "Presentation", "Documents"] as const;
type TabId = (typeof TABS)[number];

export function ProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const project = useStore((s) => s.projects[id]);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const patchProject = useStore((s) => s.patchProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const advanceProject = useStore((s) => s.advanceProject);
  const [tab, setTab] = useState<TabId>("Build");
  const [toast, setToast] = useState<string[] | null>(null);

  if (!project) {
    return (
      <div>
        <PageHeader title="Project not found" />
        <Empty>
          This project doesn't exist.{" "}
          <button className="text-brass underline" onClick={() => navigate("/projects")}>
            Back to projects
          </button>
        </Empty>
      </div>
    );
  }

  const p = project;
  const patch: Patch = (pp) => patchProject(p.id, pp);
  const idx = stageIdx(p);
  const account = accounts[p.accountId];
  const fin = projFin(p, company);
  const due = owed(p, company);
  const verdict = projVerdict(p, company).verdict;
  const dl = dFromNow(p.deadline);
  const pl = (p.servicePath || account?.servicePath) === "Private label";

  const setStage = (next: number) => {
    const clamped = Math.max(0, Math.min(STAGES.length - 1, next));
    patch({ stage: STAGES[clamped] });
  };

  const advance = () => {
    const notes = advanceProject(p.id);
    if (notes.length) {
      setToast(notes);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const accountOpts = [
    { value: "", label: "— unassigned —" },
    ...Object.values(accounts).map((a) => ({ value: a.id, label: a.name || "Unnamed" })),
  ];

  const remove = () => {
    if (confirm(`Delete "${p.name || "Untitled"}"? This cannot be undone.`)) {
      deleteProject(p.id);
      navigate("/projects");
    }
  };

  return (
    <div>
      <button onClick={() => navigate("/projects")} className="mb-3 font-mono text-[10px] uppercase tracking-label text-faint hover:text-dim">
        ← Projects
      </button>

      <PageHeader
        title={p.name || "Untitled project"}
        kicker={acctName(p, accounts)}
        actions={
          <>
            {pl && <Tag tone="pl">Private label</Tag>}
            <Toggle label="Lost" checked={p.lost} onChange={(v) => patch({ lost: v })} />
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      />

      {/* Header instrument */}
      <Panel className="mb-5 grid gap-5 p-4 sm:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <IndexRing stages={STAGES} current={idx} size={150} centerKicker="Stage" centerLabel={p.stage} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField label="Client" value={p.accountId} onChange={(v) => patch({ accountId: v })} options={accountOpts} />
            <SelectField
              label="Service path"
              value={p.servicePath}
              onChange={(v) => patch({ servicePath: v as typeof p.servicePath })}
              options={[{ value: "", label: "— inherit client —" }, ...SERVICE.map((x) => ({ value: x, label: x }))]}
            />
            <SelectField label="Stage" value={p.stage} onChange={(v) => patch({ stage: v })} options={STAGES} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setStage(idx - 1)} disabled={idx <= 0}>
              ← Back
            </Button>
            <Button variant="primary" onClick={advance} disabled={idx >= STAGES.length - 1}>
              Advance →
            </Button>
            <span className="font-mono text-[11px] text-dim">Next: {NEXT[p.stage]}</span>
          </div>

          {toast && (
            <div className="rounded border border-brass/40 bg-brass-dim px-3 py-2 font-mono text-[11px] text-brass">
              {toast.map((n, i) => (
                <div key={i}>• {n}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KV label="Revenue" value={money(fin.rev, "€")} tone="brass" />
            <KV label="Owed" value={due > 0 ? money(due, "€") : "—"} tone={due > 0 ? "warn" : undefined} />
            <KV
              label="QC"
              value={committed(p) ? verdict : "—"}
              tone={verdict === "ACCEPT" ? "ok" : verdict === "REJECT" ? "bad" : "warn"}
            />
            <KV
              label="Deadline"
              value={p.deadline ? (dl != null ? `${dl}d` : p.deadline) : "—"}
              tone={dl != null && dl < 0 && PROD.includes(p.stage as (typeof PROD)[number]) ? "bad" : undefined}
            />
          </div>
        </div>
      </Panel>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-label transition-colors",
              tab === t ? "border-brass text-brass" : "border-transparent text-faint hover:text-dim",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Build" && <BuildTab p={p} patch={patch} />}
      {tab === "Commercial" && <CommercialTab p={p} patch={patch} company={company} />}
      {tab === "QC" && <QcTab p={p} patch={patch} company={company} />}
      {tab === "Presentation" && <PresentationTab p={p} patch={patch} account={account} company={company} />}
      {tab === "Documents" && <DocumentsTab p={p} account={account} company={company} />}
    </div>
  );
}

function KV({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" | "bad" | "brass" }) {
  const color =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : tone === "brass" ? "text-brass" : "text-ink";
  return (
    <div className="rounded border border-line bg-inset px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cx("font-mono text-sm", color)}>{value}</div>
    </div>
  );
}
