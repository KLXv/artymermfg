/** Client detail — the CRM record plus its linked projects and follow-up. */
import { useNavigate, useParams } from "react-router-dom";
import {
  ACCT_STATUS,
  ACCT_TYPES,
  MARKETS,
  SERVICE,
  STAGES,
  blankProject,
  money,
  owed,
  projFin,
  stageIdx,
  type Account,
} from "@/domain";
import { StageTrack } from "@/ui/StageTrack";
import { Button, Empty, Field, Panel, SectionHead, SelectField, TextArea, Tag } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

export function ClientDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const account = useStore((s) => s.accounts[id]);
  const projects = useStore((s) => s.projects);
  const company = useStore((s) => s.company);
  const patchAccount = useStore((s) => s.patchAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);
  const upsertProject = useStore((s) => s.upsertProject);

  if (!account) {
    return (
      <div>
        <PageHeader title="Client not found" />
        <Empty>
          <button className="text-brass underline" onClick={() => navigate("/clients")}>
            Back to clients
          </button>
        </Empty>
      </div>
    );
  }

  const a = account;
  const set = (patch: Partial<Account>) => patchAccount(a.id, patch);
  const f = (k: keyof Account) => ({ value: (a[k] as string) ?? "", onChange: (v: string) => set({ [k]: v } as Partial<Account>) });
  const linked = Object.values(projects).filter((p) => p.accountId === a.id);

  const newProject = () => {
    const p = blankProject(a.id);
    upsertProject(p);
    navigate(`/projects/${p.id}`);
  };
  const remove = () => {
    if (confirm(`Delete "${a.name || "this client"}"? Linked projects keep their data but lose the link.`)) {
      deleteAccount(a.id);
      navigate("/clients");
    }
  };

  return (
    <div>
      <button onClick={() => navigate("/clients")} className="mb-3 font-mono text-[10px] uppercase tracking-label text-faint hover:text-dim">
        ← Clients
      </button>
      <PageHeader
        title={a.name || "Unnamed client"}
        kicker={`${a.servicePath} · ${a.market}`}
        actions={
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionHead title="Identity" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" {...f("name")} className="sm:col-span-2" />
            <SelectField label="Type" {...f("type")} options={ACCT_TYPES} />
            <SelectField label="Service path" {...f("servicePath")} options={SERVICE} />
            <SelectField label="Status" {...f("status")} options={ACCT_STATUS} />
            <SelectField label="Market" {...f("market")} options={MARKETS} />
            <Field label="Source" {...f("source")} className="sm:col-span-2" />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Contact" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact name" {...f("contactName")} />
            <Field label="Role" {...f("contactRole")} />
            <Field label="Email" {...f("email")} />
            <Field label="Phone" {...f("phone")} />
            <Field label="Last contact" type="date" {...f("lastContact")} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Next step" kicker="drives the deck queue" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Next action" {...f("nextAction")} className="sm:col-span-2" />
            <Field label="Due date" type="date" {...f("nextDate")} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Notes & testimonial" />
          <TextArea label="Notes (feeds the AI story)" {...f("notes")} rows={4} />
          <TextArea label="Testimonial" {...f("testimonial")} rows={3} className="mt-3" />
        </Panel>
      </div>

      <Panel className="mt-5 p-4">
        <SectionHead
          title="Projects"
          kicker={`${linked.length} linked`}
          right={
            <Button variant="ghost" onClick={newProject}>
              + New for client
            </Button>
          }
        />
        {linked.length === 0 ? (
          <Empty>No projects yet for this client.</Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {linked.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-inset"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px]">{p.name || "Untitled"}</span>
                  <StageTrack count={STAGES.length} current={stageIdx(p)} height={14} />
                  <Tag>{p.stage}</Tag>
                  <span className="w-20 text-right font-mono text-[11px] text-brass">{money(projFin(p, company).rev, "€")}</span>
                  {owed(p, company) > 0 && (
                    <span className="w-16 text-right font-mono text-[11px] text-warn">{money(owed(p, company), "€")}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
