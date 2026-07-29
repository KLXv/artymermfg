/**
 * Discovery / review queue — two ways in, one queue:
 *  1. Import a PROSPECTOR `cockpit.json` (the Python engine's scored, ranked
 *     leads with briefs — see docs/prospector-import.md). Works offline.
 *  2. Run the web-search agent for fresh signals on the ICP.
 * Either way results land in a REVIEW QUEUE (never straight into Prospects);
 * the operator approves or rejects each. Approving spawns a Prospect, carrying
 * the score + brief along. The queue is ranked by score, best first.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { discoverySystemPrompt, parseCockpitExport, parseDiscovery, type DiscoveryCandidate } from "@/domain";
import { Button, Empty, Panel, SectionHead, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { research } from "@/data/ai";
import { isSupabaseConfigured } from "@/data/supabase";
import { PageHeader } from "../PageHeader";
import { OutreachNav } from "./OutreachNav";

const SIGNAL_TONE: Record<string, "brass" | "ok" | "warn" | "neutral"> = {
  anniversary: "brass",
  championship: "ok",
  founding: "brass",
  award: "warn",
};

const money = (n: number | null, suffix: string) => (n == null ? null : `${Math.round(n).toLocaleString()} ${suffix}`);

function CandidateCard({ c }: { c: DiscoveryCandidate }) {
  const approve = useStore((s) => s.approveCandidate);
  const reject = useStore((s) => s.rejectCandidate);
  const del = useStore((s) => s.deleteCandidate);
  const navigate = useNavigate();
  const [showBrief, setShowBrief] = useState(false);
  const pr = c.prospector;

  const onApprove = () => {
    const id = approve(c.id);
    if (id) navigate("/outreach/prospects");
  };

  const scoreTone = c.score == null ? "" : c.score >= 70 ? "text-ok" : c.score >= 45 ? "text-brass" : "text-warn";

  return (
    <div
      className={cx(
        "rounded-lg border bg-inset p-3.5",
        c.status === "rejected" ? "border-line/40 opacity-50" : pr?.disqualified ? "border-bad/40" : "border-line",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        {c.score != null && <span className={cx("tnum font-mono text-[20px] font-semibold leading-none", scoreTone)}>{c.score}</span>}
        <span className="text-[15px] font-medium text-ink">{c.org}</span>
        {(pr?.path || c.segment) && <Tag tone={pr?.path === "Private label" ? "pl" : "neutral"}>{pr?.path || c.segment}</Tag>}
        {c.city && <span className="font-mono text-[12px] text-faint">{c.city}{c.market ? ` · ${c.market}` : ""}</span>}
        {pr?.disqualified && <Tag tone="bad">disqualified</Tag>}
        {pr?.cashTimingRisk === "HIGH" && <Tag tone="warn">cash risk</Tag>}
        {!pr && <Tag tone={SIGNAL_TONE[c.signalType] ?? "neutral"}>{c.signalType}</Tag>}
      </div>
      {c.signal && <p className="mb-1.5 text-[14px] leading-relaxed text-dim">{c.signal}</p>}
      {pr && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-faint">
          {money(pr.revenueRon, "RON") && <span>rev {money(pr.revenueRon, "RON")}</span>}
          {pr.employees != null && <span>{pr.employees} staff</span>}
          {pr.anniversaryYears != null && <span className="text-brass">{pr.anniversaryYears}y milestone</span>}
          {money(pr.projectValueEur, "€") && <span>~{money(pr.projectValueEur, "€")}{pr.suggestedUnits ? ` (${pr.suggestedUnits}pc)` : ""}</span>}
          {pr.designHours === "HIGH" && <span className="text-warn">design: high</span>}
        </div>
      )}
      {c.rationale && !pr && <p className="mb-1.5 font-serif text-[13px] italic leading-relaxed text-faint">{c.rationale}</p>}
      <div className="mb-2.5 flex flex-wrap items-center gap-3 font-mono text-[12px]">
        {c.sourceUrl && (
          <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-brass hover:underline">
            Source ↗
          </a>
        )}
        {pr?.website && (
          <a href={pr.website} target="_blank" rel="noreferrer" className="text-brass hover:underline">
            Site ↗
          </a>
        )}
        {c.contactHint && <span className="text-faint">{c.contactHint}</span>}
        {pr?.brief && (
          <button onClick={() => setShowBrief((v) => !v)} className="text-brass hover:underline">
            {showBrief ? "Hide brief" : "Brief"}
          </button>
        )}
      </div>
      {showBrief && pr?.brief && (
        <pre className="mb-2.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-panel p-3 font-body text-[13px] leading-relaxed text-dim">
          {pr.brief}
        </pre>
      )}
      {c.status === "pending" ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={onApprove}>
            ✓ Approve → Prospect
          </Button>
          <Button variant="ghost" onClick={() => reject(c.id)}>
            Reject
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Tag tone={c.status === "approved" ? "ok" : "bad"}>{c.status}</Tag>
          <Button variant="quiet" onClick={() => del(c.id)} className="mb-0">
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

export function Discovery() {
  const company = useStore((s) => s.company);
  const accounts = useStore((s) => s.accounts);
  const prospects = useStore((s) => s.prospects);
  const candidates = useStore((s) => s.candidates);
  const addCandidates = useStore((s) => s.addCandidates);
  const importLeads = useStore((s) => s.importLeads);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Rank the queue by score (PROSPECTOR leads first, highest first); web-search
  // candidates (score null) sort after, newest first.
  const rank = (c: DiscoveryCandidate) => (c.score == null ? -1 : c.score);
  const pending = useMemo(
    () => Object.values(candidates).filter((c) => c.status === "pending").sort((a, b) => rank(b) - rank(a) || (b.createdAt || "").localeCompare(a.createdAt || "")),
    [candidates],
  );
  const resolved = useMemo(() => Object.values(candidates).filter((c) => c.status !== "pending"), [candidates]);
  const enabledSegments = company.icp.segments.filter((s) => s.enabled);

  const onImportFile = async (file: File) => {
    setImportMsg("");
    setError("");
    try {
      const text = await file.text();
      const leads = parseCockpitExport(text);
      if (leads.length === 0) {
        setError("No leads found in that file. Expected a PROSPECTOR cockpit.json (see docs/prospector-import.md).");
        return;
      }
      const { imported, skipped } = importLeads(leads);
      setImportMsg(`Imported ${imported} lead${imported === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped} already known` : ""}.`);
    } catch (e) {
      setError((e as Error).message || "Import failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Orgs already known — so Discovery doesn't re-propose them.
  const existingOrgs = useMemo(() => {
    const names = new Set<string>();
    Object.values(accounts).forEach((a) => a.name && names.add(a.name));
    Object.values(prospects).forEach((p) => p.org && names.add(p.org));
    Object.values(candidates).forEach((c) => c.org && names.add(c.org));
    return [...names];
  }, [accounts, prospects, candidates]);

  const run = async () => {
    setError("");
    setRunning(true);
    try {
      const system = discoverySystemPrompt(company.icp, existingOrgs);
      const cities = company.icp.cities.join(", ") || "Romania and Hungary";
      const text = await research(system, [
        { role: "user", content: `Find fresh, well-sourced candidate organisations across the enabled ICP segments in ${cities}. Return the fenced JSON only.` },
      ]);
      const found = parseDiscovery(text);
      if (found.length === 0) {
        setError("No verifiable candidates found this run — try again or broaden the ICP.");
      } else {
        addCandidates(found);
      }
    } catch (e) {
      setError((e as Error).message || "Discovery failed.");
    } finally {
      setRunning(false);
    }
  };

  const aiReady = isSupabaseConfigured(); // the proxy verifies a Supabase session
  const canRun = aiReady && enabledSegments.length > 0 && !running;

  return (
    <div>
      <PageHeader
        title="Outbound Engine"
        kicker="discovery · review queue"
        actions={
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
            />
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              ↧ Import leads
            </Button>
            <Button variant="primary" onClick={run} disabled={!canRun}>
              {running ? "Searching…" : "⟳ Run Discovery"}
            </Button>
          </div>
        }
      />
      <OutreachNav />

      {importMsg && (
        <Panel className="mb-4 p-3.5">
          <p className="font-mono text-[13px] text-ok">{importMsg}</p>
        </Panel>
      )}

      {!aiReady && (
        <Panel className="mb-4 p-3.5">
          <p className="font-mono text-[13px] text-warn">
            Sign in (cloud mode) to run Discovery — the web-search agent runs through the authenticated AI proxy.
          </p>
        </Panel>
      )}
      {aiReady && enabledSegments.length === 0 && (
        <Panel className="mb-4 p-3.5">
          <p className="font-mono text-[13px] text-warn">
            No enabled ICP segments. Add or enable a segment in ICP Config before running Discovery.
          </p>
        </Panel>
      )}
      {error && (
        <Panel className="mb-4 p-3.5">
          <p className="font-mono text-[13px] text-bad">{error}</p>
        </Panel>
      )}

      <Panel className="mb-6 p-4">
        <SectionHead title="Review queue" kicker="approve or reject each" right={pending.length > 0 ? <Tag tone="brass">{pending.length} pending</Tag> : undefined} />
        {pending.length === 0 ? (
          <Empty glyph="➤">
            {running ? "Searching the web for signals…" : "Nothing to review. Import a PROSPECTOR cockpit.json, or run Discovery to propose candidates."}
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((c) => (
              <CandidateCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </Panel>

      {resolved.length > 0 && (
        <Panel className="p-4">
          <SectionHead title="Resolved" kicker="approved · rejected" />
          <div className="grid gap-3 md:grid-cols-2">
            {resolved.map((c) => (
              <CandidateCard key={c.id} c={c} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
