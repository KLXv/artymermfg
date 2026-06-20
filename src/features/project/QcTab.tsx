/**
 * Per-unit QC checklist → lot verdict. The verdict engine is the domain's
 * `projVerdict`; this is just the inspection surface. ACCEPT unlocks sign-off,
 * which stamps the QC record and releases the balance step downstream.
 */
import {
  QC_CHECKS,
  cfg,
  committed,
  projVerdict,
  qcSignoff,
  today,
  type Company,
  type Project,
  type QcUnitResult,
  type SampleApproval,
} from "@/domain";
import { Button, Empty, Field, Panel, SectionHead, Stat, Tag, TextArea, Toggle, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { OPERATOR } from "@/ui/companion";
import type { Patch } from "./bind";

const BLANK_SAMPLE: SampleApproval = { decision: "", date: "", reviewer: "", notes: "", media: "" };

const CELL: Record<string, string> = {
  pass: "border-[#6FB98F66] bg-[#6FB98F22] text-ok",
  fail: "border-[#C25B5266] bg-[#C25B5222] text-bad",
  "": "border-line text-faint hover:border-line2",
};
const NEXT_STATE: Record<string, "pass" | "fail" | ""> = { "": "pass", pass: "fail", fail: "" };
const GLYPH: Record<string, string> = { pass: "✓", fail: "✕", "": "·" };

export function QcTab({ p, patch, company }: { p: Project; patch: Patch; company: Company }) {
  const accounts = useStore((s) => s.accounts);
  const v = projVerdict(p, company);
  const qtyN = v.qtyN;
  const units = Array.from({ length: qtyN }, (_, i) => i + 1);
  const disabled = new Set(p.qc.disabled || []);
  const enabled = QC_CHECKS.filter(([id]) => !disabled.has(id));
  const toggleCheck = (id: string) => {
    const next = new Set(disabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    patch({ qc: { ...p.qc, disabled: [...next] } });
  };

  const setCheck = (unit: number, checkId: string, val: "pass" | "fail" | "") => {
    const results = { ...(p.qc.results || {}) };
    const u: QcUnitResult = { ...(results[unit] || {}) };
    if (val === "") delete u[checkId];
    else u[checkId] = val;
    results[unit] = u;
    patch({ qc: { ...p.qc, results } });
  };

  const cycle = (unit: number, checkId: string) => {
    const cur = p.qc.results?.[unit]?.[checkId] || "";
    setCheck(unit, checkId, NEXT_STATE[cur]);
  };

  const markAll = (val: "pass" | "") => {
    const results: Record<number, QcUnitResult> = {};
    if (val === "pass") units.forEach((u) => (results[u] = Object.fromEntries(enabled.map(([id]) => [id, "pass"]))));
    patch({ qc: { ...p.qc, results } });
  };

  const verdictTone = v.verdict === "ACCEPT" ? "ok" : v.verdict === "REJECT" ? "bad" : "warn";

  const signOff = () => patch({ qc: { ...p.qc, signed: true, signedDate: today() } });

  const sample = p.qc.sample ?? BLANK_SAMPLE;
  const decideSample = (decision: SampleApproval["decision"]) =>
    patch({
      qc: {
        ...p.qc,
        sample: { ...sample, decision, date: decision ? today() : "", reviewer: decision ? OPERATOR : "" },
      },
    });
  const setSample = (patchS: Partial<SampleApproval>) =>
    patch({ qc: { ...p.qc, sample: { ...sample, ...patchS } } });
  const SAMPLE_OPTS: { v: SampleApproval["decision"]; label: string; tone: string }[] = [
    { v: "", label: "Pending", tone: "border-line text-dim" },
    { v: "approved", label: "✓ Approved", tone: "border-[#6FB98F66] bg-[#6FB98F22] text-ok" },
    { v: "revise", label: "↺ Needs revision", tone: "border-[#C25B5266] bg-[#C25B5222] text-bad" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* First-off sample gate — reviewed from the factory's media. */}
      <Panel className="p-4">
        <SectionHead
          title="First-off sample"
          kicker="approve before full production"
          right={
            sample.decision === "approved" ? (
              <Tag tone="ok">approved {sample.date}</Tag>
            ) : sample.decision === "revise" ? (
              <Tag tone="bad">revision requested</Tag>
            ) : (
              <Tag tone="warn">pending</Tag>
            )
          }
        />
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_OPTS.map((o) => (
            <button
              key={o.label}
              onClick={() => decideSample(o.v)}
              className={cx(
                "rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors",
                sample.decision === o.v ? o.tone : "border-line text-faint hover:border-line2 hover:text-dim",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Field
          label="Sample media link"
          value={sample.media}
          onChange={(v) => setSample({ media: v })}
          placeholder="paste the video / photo link the factory sent (or upload on Attachments)"
          className="mt-3"
        />
        <TextArea
          label="Review notes"
          value={sample.notes}
          onChange={(v) => setSample({ notes: v })}
          rows={2}
          className="mt-3"
          placeholder="what's approved · or exactly what to fix before production"
        />
        {sample.decision === "approved" && p.stage === "First-off" && (
          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" onClick={() => patch({ stage: "Production" })}>
              Advance to Production →
            </Button>
            <span className="font-mono text-[13px] text-faint">sample is approved — start the run</span>
          </div>
        )}
        {sample.decision === "revise" && (
          <p className="mt-3 font-mono text-[12px] text-warn">
            Send the notes back to the factory. Re-review the next sample before approving.
          </p>
        )}
      </Panel>

      <Panel className="p-4">
        <SectionHead
          title="Verdict"
          kicker={`lot-fail threshold ${cfg(p, "lotFail", company)}%`}
          right={<Tag tone={verdictTone}>{v.verdict}</Tag>}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Inspected" value={`${v.passU + v.failU} / ${qtyN}`} />
          <Stat label="Pass" value={v.passU} tone="ok" />
          <Stat label="Fail" value={v.failU} tone={v.failU ? "bad" : undefined} />
          <Stat label="Fail rate" value={`${v.failRate.toFixed(1)}%`} tone={verdictTone} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Toggle label="QC media received" checked={p.qc.received} onChange={(r) => patch({ qc: { ...p.qc, received: r } })} />
          <span className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => markAll("pass")}>
              Mark all pass
            </Button>
            <Button variant="ghost" onClick={() => markAll("")}>
              Clear
            </Button>
          </span>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Checks" kicker="switch off any that don't apply to this piece" />
        <div className="flex flex-wrap gap-2">
          {QC_CHECKS.map(([id, label]) => {
            const on = !disabled.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleCheck(id)}
                className={cx(
                  "rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors",
                  on ? "border-brass/50 bg-brass-dim text-brass" : "border-line text-faint line-through hover:text-dim",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Per-unit inspection" kicker="tap to cycle · pass → fail → clear" />
        {qtyN === 0 ? (
          <Empty>Set a quantity on the Commercial tab to inspect units.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1 text-left font-normal">Unit</th>
                  {enabled.map(([id, label]) => (
                    <th key={id} className="px-1 py-1 font-normal">
                      {label}
                    </th>
                  ))}
                  <th className="px-2 py-1 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const st = v.statusOf(u);
                  return (
                    <tr key={u} className="border-t border-line">
                      <td className="px-2 py-1 font-mono text-[13px] text-dim">{String(u).padStart(2, "0")}</td>
                      {enabled.map(([id]) => {
                        const val = p.qc.results?.[u]?.[id] || "";
                        return (
                          <td key={id} className="px-1 py-1 text-center">
                            <button
                              onClick={() => cycle(u, id)}
                              className={cx(
                                "h-6 w-6 rounded border font-mono text-xs transition-colors",
                                CELL[val],
                              )}
                              aria-label={`Unit ${u} ${id}: ${val || "unset"}`}
                            >
                              {GLYPH[val]}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-center">
                        <Tag tone={st === "pass" ? "ok" : st === "fail" ? "bad" : "neutral"}>{st}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Sign-off" kicker="Artymer — Watchmaker & Founder" />
        {p.qc.signed ? (
          <div className="flex items-center gap-3">
            <Tag tone="ok">Signed {p.qc.signedDate}</Tag>
            <Button variant="ghost" onClick={() => patch({ qc: { ...p.qc, signed: false, signedDate: "" } })}>
              Revoke
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={!committed(p) || !p.qc.received || v.verdict !== "ACCEPT"}
              onClick={signOff}
            >
              Sign off QC
            </Button>
            <span className="font-mono text-[13px] text-faint">
              {!committed(p)
                ? "project not yet committed"
                : !p.qc.received
                  ? "awaiting QC media"
                  : v.verdict !== "ACCEPT"
                    ? `verdict is ${v.verdict}`
                    : "ready to release balance"}
            </span>
          </div>
        )}
        {p.qc.signed && (
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-line bg-inset p-3 font-mono text-[13px] leading-relaxed text-dim">
            {qcSignoff(p, accounts, company)}
          </pre>
        )}
      </Panel>
    </div>
  );
}
