/**
 * Settings — the company configuration and the data vehicle. The JSON
 * export/import round-trip is preserved exactly so existing data (LóFő, HFN)
 * migrates straight in, including the one-time legacy migration on import.
 */
import { useRef, useState } from "react";
import { type Company } from "@/domain";
import { isSupabaseConfigured } from "@/data/supabase";
import { uploadAttachment, deleteAttachment } from "@/data/storage";
import { SEED_BACKUP } from "@/data/seed";
import { Button, Field, Label, Panel, SectionHead, Tag, TextArea } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useAuth } from "@/state/useAuth";
import { PageHeader } from "./PageHeader";
import { CommandSettings } from "./CommandSettings";

export function Settings() {
  const company = useStore((s) => s.company);
  const setCompany = useStore((s) => s.setCompany);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const configured = isSupabaseConfigured();
  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    setMsg(null);
    try {
      const url = await uploadAttachment(file, user?.id ?? "local", "brand", "logo");
      // cache-bust so the new logo shows immediately after a replace
      setCompany({ logo: `${url}?v=${Date.now()}` });
    } catch (e) {
      setMsg({ tone: "bad", text: e instanceof Error ? e.message : "Logo upload failed." });
    } finally {
      setLogoBusy(false);
    }
  };
  const clearLogo = async () => {
    if (company.logo) await deleteAttachment(company.logo).catch(() => {});
    setCompany({ logo: "" });
  };

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
          <SectionHead title="Company" kicker="brand identity on documents" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Brand" mono={false} {...f("brand")} className="sm:col-span-2" />

            <div className="sm:col-span-2">
              <Label>Brand logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-inset">
                  {company.logo ? (
                    <img src={company.logo} alt="Brand logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="font-disp text-2xl text-brass">Σ</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => logoRef.current?.click()} disabled={!configured || logoBusy}>
                      {logoBusy ? "Uploading…" : company.logo ? "Replace" : "Upload logo"}
                    </Button>
                    {company.logo && (
                      <Button variant="danger" onClick={clearLogo} disabled={logoBusy}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-faint">
                    {configured ? "PNG with transparency · shown on factory-doc PDFs" : "connect Supabase to upload"}
                  </span>
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <TextArea
              label="Letterhead (one line each: address, email, web)"
              value={company.letterhead}
              onChange={(v) => setCompany({ letterhead: v })}
              rows={3}
              className="sm:col-span-2"
              placeholder={"Artymer · Bespoke watchmaking\nhello@artymer.com\nartymer.com"}
            />

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
          <div className="mt-4 border-t border-line pt-3 flex flex-wrap gap-2 items-start">
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Load demo data? This adds a sample client, supplier, and project (existing data is kept).")) {
                  importJSON(JSON.stringify(SEED_BACKUP));
                  setMsg({ tone: "ok", text: "Demo data loaded — see Projects and Clients." });
                }
              }}
            >
              Load demo data
            </Button>
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

      <CommandSettings />

      <p className="mt-6 font-mono text-[12px] text-faint">
        Data persists in this browser; with cloud sync on, it follows you across devices. The JSON export is always your
        portable backup.
      </p>
    </div>
  );
}
