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
} from "@/domain";
import { Button, Empty, Panel, SectionHead, Stat, Tag, Toggle, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import type { Patch } from "./bind";

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
    if (val === "pass") units.forEach((u) => (results[u] = Object.fromEntries(QC_CHECKS.map(([id]) => [id, "pass"]))));
    patch({ qc: { ...p.qc, results } });
  };

  const verdictTone = v.verdict === "ACCEPT" ? "ok" : v.verdict === "REJECT" ? "bad" : "warn";

  const signOff = () => patch({ qc: { ...p.qc, signed: true, signedDate: today() } });

  return (
    <div className="flex flex-col gap-5">
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
        <SectionHead title="Per-unit inspection" kicker="tap to cycle · pass → fail → clear" />
        {qtyN === 0 ? (
          <Empty>Set a quantity on the Commercial tab to inspect units.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr className="font-mono text-[9px] uppercase tracking-wide text-faint">
                  <th className="px-2 py-1 text-left font-normal">Unit</th>
                  {QC_CHECKS.map(([id, label]) => (
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
                      <td className="px-2 py-1 font-mono text-[11px] text-dim">{String(u).padStart(2, "0")}</td>
                      {QC_CHECKS.map(([id]) => {
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
            <span className="font-mono text-[11px] text-faint">
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
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-line bg-inset p-3 font-mono text-[11px] leading-relaxed text-dim">
            {qcSignoff(p, accounts, company)}
          </pre>
        )}
      </Panel>
    </div>
  );
}
