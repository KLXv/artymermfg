/**
 * Settings — the company configuration and the data vehicle. The JSON
 * export/import round-trip is preserved exactly so existing data (LóFő, HFN)
 * migrates straight in, including the one-time legacy migration on import.
 */
import { useRef, useState } from "react";
import { type Company } from "@/domain";
import { isSupabaseConfigured } from "@/data/supabase";
import { Button, Field, Panel, SectionHead, Tag } from "@/ui/kit";
import { useStore } from "@/state/store";
import { PageHeader } from "./PageHeader";

export function Settings() {
  const company = useStore((s) => s.company);
  const setCompany = useStore((s) => s.setCompany);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const set = (patch: Partial<Company>) => setCompany(patch);
  const f = (k: keyof Company) => ({ value: String(company[k] ?? ""), onChange: (v: string) => set({ [k]: v } as Partial<Company>) });
  const setFx = (cur: "RON" | "USD", v: string) => set({ fx: { ...company.fx, [cur]: parseFloat(v) || 0 } });

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artymer-cockpit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = importJSON(String(reader.result));
        setMsg({ tone: "ok", text: `Imported · ${res.accounts} clients, ${res.projects} projects (legacy migration applied).` });
      } catch (e) {
        setMsg({ tone: "bad", text: e instanceof Error && e.message === "empty" ? "That file has no accounts or projects." : "Could not parse that file." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        kicker="company defaults & data"
        actions={isSupabaseConfigured() ? <Tag tone="ok">Supabase configured</Tag> : <Tag tone="neutral">local only</Tag>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionHead title="Company" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Brand" mono={false} {...f("brand")} className="sm:col-span-2" />
            <Field label="FX · RON → EUR" value={String(company.fx.RON)} onChange={(v) => setFx("RON", v)} />
            <Field label="FX · USD → EUR" value={String(company.fx.USD)} onChange={(v) => setFx("USD", v)} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Commercial defaults" kicker="overridable per project" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Deposit %" {...f("deposit")} />
            <Field label="Lot-fail %" {...f("lotFail")} />
            <Field label="Max reworks" {...f("rework")} />
            <Field label="QC window (days)" {...f("window")} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Targets" kicker="drive the deck pulse" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Buffer (weeks)" {...f("bufferWeeks")} />
            <Field label="Weekly outreach" {...f("weeklyOutreach")} />
            <Field label="Monthly revenue €" {...f("monthlyRevenue")} />
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionHead title="Data" kicker="backup · migrate · restore" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              ↑ Import JSON
            </Button>
            <Button variant="ghost" onClick={doExport}>
              ↓ Export JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) doImport(file);
                e.target.value = "";
              }}
            />
          </div>
          {msg && (
            <p className={"mt-3 font-mono text-[13px] " + (msg.tone === "ok" ? "text-ok" : "text-bad")}>{msg.text}</p>
          )}
          <p className="mt-3 font-mono text-[12px] text-faint">
            Import merges over current data (matching ids overwritten). Your old cockpit export drops straight in.
          </p>
          <div className="mt-4 border-t border-line pt-3">
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Erase ALL local data? Export first if you want a backup.")) {
                  resetAll();
                  setMsg({ tone: "ok", text: "Workspace reset." });
                }
              }}
            >
              Reset workspace
            </Button>
          </div>
        </Panel>
      </div>

      <p className="mt-6 font-mono text-[12px] text-faint">
        Data persists in this browser. Cloud sync arrives with authentication in a later phase; the JSON vehicle is the
        bridge until then.
      </p>
    </div>
  );
}
