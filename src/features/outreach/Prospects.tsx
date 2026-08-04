/**
 * Prospects — the cold-outbound funnel. An editable table of prospects (name,
 * org, segment, city, channel, contact, signal, status, touch 1–5 dates,
 * notes), a "Promote to client" action that spawns an Account, a LinkedIn
 * *manual* search link (never automation), and the Drafting Agent: per prospect,
 * Claude drafts Touch 1–5 (in the detected language, LóFő proof point only) into
 * a per-touch approval queue. Nothing sends in Phase 1 — approving + logging a
 * send date is the human step.
 */
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LANGS,
  OUTBOUND_CHANNELS,
  PROSPECT_STATUS,
  MARKETS,
  blankProspect,
  blankTask,
  detectLang,
  draftingSystemPrompt,
  linkedinSearchUrl,
  parseDrafts,
  today,
  type OutboundDraft,
  type Prospect,
  type ProspectStatus,
  type ProspectTouch,
  type TouchOutcome,
} from "@/domain";
import { Button, Empty, Field, Panel, SelectField, Tag, TextArea, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { generate } from "@/data/ai";
import { isSupabaseConfigured } from "@/data/supabase";
import { PageHeader } from "../PageHeader";
import { OutreachNav } from "./OutreachNav";

const STATUS_TONE: Record<ProspectStatus, "neutral" | "warn" | "brass" | "ok" | "bad" | "pl"> = {
  "Not Contacted": "neutral",
  Contacted: "warn",
  Responded: "brass",
  "Concept Sent": "brass",
  Negotiating: "warn",
  "Closed Won": "ok",
  "Closed Lost": "bad",
  Nurture: "pl",
};

const OUTCOMES: TouchOutcome[] = ["awaiting", "replied", "meeting", "not interested", "no reply"];
const OUTCOME_TONE: Record<TouchOutcome, "neutral" | "warn" | "brass" | "ok" | "bad"> = {
  awaiting: "warn",
  replied: "brass",
  meeting: "ok",
  "not interested": "bad",
  "no reply": "neutral",
};

/**
 * The target list's entry point. A prospect is worth nothing until it has a
 * name and a reason, so this collects both up front rather than dropping an
 * empty "Untitled" row into the list to be filled in later (or never).
 */
function AddProspect({ onDone }: { onDone: () => void }) {
  const upsertProspect = useStore((s) => s.upsertProspect);
  const segments = useStore((s) => s.company.icp.segments);
  const [d, setD] = useState(() => blankProspect());
  const set = (k: keyof Prospect, v: string) => setD((p) => ({ ...p, [k]: v }) as Prospect);

  const save = () => {
    if (!d.org.trim()) return;
    upsertProspect({ ...d, lang: detectLang(d.market, d.city) });
    onDone();
  };

  return (
    <Panel className="mb-4 p-4">
      <div className="mb-3 font-mono text-[12px] uppercase tracking-label text-brass">New target</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Organisation *" value={d.org} onChange={(v) => set("org", v)} mono={false} />
        <Field label="Contact name" value={d.name} onChange={(v) => set("name", v)} mono={false} />
        <Field label="Role" value={d.role} onChange={(v) => set("role", v)} mono={false} />
        <SelectField label="Segment" value={d.segment} onChange={(v) => set("segment", v)} options={["", ...segments.map((s) => s.name)]} />
        <Field label="City" value={d.city} onChange={(v) => set("city", v)} mono={false} />
        <SelectField label="Market" value={d.market} onChange={(v) => set("market", v)} options={MARKETS} />
        <SelectField label="Channel" value={d.channel} onChange={(v) => set("channel", v)} options={OUTBOUND_CHANNELS} />
        <Field label="Email" value={d.email} onChange={(v) => set("email", v)} type="email" inputMode="email" />
        <Field label="Phone" value={d.phone} onChange={(v) => set("phone", v)} type="tel" inputMode="tel" />
      </div>
      <TextArea
        label="Why them, why now"
        value={d.signal}
        onChange={(v) => set("signal", v)}
        rows={2}
        className="mt-2"
        placeholder="120th anniversary next spring · won the league · new HQ opening…"
      />
      <Field label="Source URL" value={d.sourceUrl} onChange={(v) => set("sourceUrl", v)} type="url" inputMode="url" className="mt-2" />
      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" onClick={save} disabled={!d.org.trim()}>
          Add to targets
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {!d.org.trim() && <span className="font-mono text-[11px] text-faint">an organisation name is required</span>}
      </div>
    </Panel>
  );
}

/** The contact history — every touch, and what came back from it. */
function ContactLog({ p, patch }: { p: Prospect; patch: (patch: Partial<Prospect>) => void }) {
  const logContact = useStore((s) => s.logProspectContact);
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState(p.channel || "Email");
  const log = [...(p.log ?? [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const update = (id: string, up: Partial<ProspectTouch>) =>
    patch({ log: (p.log ?? []).map((t) => (t.id === id ? { ...t, ...up } : t)) });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Log a contact — what did you send or say?" value={note} onChange={setNote} mono={false} />
        </div>
        <SelectField label="Channel" value={channel} onChange={setChannel} options={OUTBOUND_CHANNELS} className="w-36" />
        <Button
          variant="primary"
          onClick={() => {
            logContact(p.id, { channel, note });
            setNote("");
          }}
          className="mb-0"
        >
          Log contact
        </Button>
      </div>

      {log.length === 0 ? (
        <p className="font-mono text-[12px] text-faint">No contact logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {log.map((t) => (
            <li key={t.id} className="rounded-lg border border-line bg-panel p-2.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="tnum font-mono text-[12px] text-brass">{t.date}</span>
                <Tag tone="neutral">{t.channel}</Tag>
                <select
                  value={t.outcome}
                  onChange={(e) => update(t.id, { outcome: e.target.value as TouchOutcome })}
                  className="rounded-full border border-line bg-white/[.03] px-2 py-0.5 font-mono text-[11px] uppercase tracking-label text-dim focus:outline-none"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o} className="bg-panel text-ink">
                      {o}
                    </option>
                  ))}
                </select>
                <Tag tone={OUTCOME_TONE[t.outcome]}>{t.outcome}</Tag>
                <button
                  onClick={() => patch({ log: (p.log ?? []).filter((x) => x.id !== t.id) })}
                  className="ml-auto font-mono text-[11px] text-faint hover:text-bad"
                >
                  remove
                </button>
              </div>
              <TextArea label="What you sent / said" value={t.note} onChange={(v) => update(t.id, { note: v })} rows={2} />
              <TextArea
                label="Their response"
                value={t.reply}
                onChange={(v) => update(t.id, { reply: v, outcome: t.outcome === "awaiting" && v.trim() ? "replied" : t.outcome })}
                rows={2}
                className="mt-1.5"
                placeholder="Paste or summarise what came back…"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Follow-ups live in the normal task system, so they surface on the Deck. */
function FollowUps({ p }: { p: Prospect }) {
  const tasks = useStore((s) => s.tasks);
  const upsertTask = useStore((s) => s.upsertTask);
  const patchTask = useStore((s) => s.patchTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today());

  const mine = Object.values(tasks)
    .filter((t) => t.linkType === "prospect" && t.linkId === p.id)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due || "").localeCompare(b.due || ""));

  const add = () => {
    if (!title.trim()) return;
    upsertTask({ ...blankTask({ type: "prospect", id: p.id }), title: title.trim(), due, source: "outbound" });
    setTitle("");
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Next step" value={title} onChange={setTitle} mono={false} placeholder="Call back · send concept · chase reply…" />
        </div>
        <Field label="Due" value={due} onChange={setDue} type="date" className="w-40" />
        <Button variant="ghost" onClick={add} disabled={!title.trim()} className="mb-0">
          + Follow-up
        </Button>
      </div>
      {mine.length === 0 ? (
        <p className="font-mono text-[12px] text-faint">No follow-up scheduled. One due today or earlier shows on the Deck.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {mine.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => patchTask(t.id, { done: e.target.checked })}
                className="h-3.5 w-3.5 accent-[var(--ok)]"
              />
              <span className={cx("min-w-0 flex-1 truncate text-[13px]", t.done ? "text-faint line-through" : "text-ink")}>{t.title}</span>
              <span className="tnum font-mono text-[12px] text-dim">{t.due}</span>
              <button onClick={() => deleteTask(t.id)} className="font-mono text-[11px] text-faint hover:text-bad">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TouchTrack({ p, patch }: { p: Prospect; patch: (patch: Partial<Prospect>) => void }) {
  const setTouch = (i: number, v: string) => {
    const touches = [...p.touches];
    touches[i] = v;
    patch({ touches });
  };
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {p.touches.map((t, i) => (
        <div key={i}>
          <div className="mb-0.5 text-center font-mono text-[10px] uppercase tracking-label text-faint">T{i + 1}</div>
          <input
            type="date"
            value={t}
            onChange={(e) => setTouch(i, e.target.value)}
            className={cx(
              "w-full rounded border bg-inset px-1 py-1 text-center font-mono text-[11px] text-ink [color-scheme:dark] focus:border-brass focus:outline-none",
              t ? "border-brass/40" : "border-line",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function DraftCard({ p, draft, patch }: { p: Prospect; draft: OutboundDraft; patch: (patch: Partial<Prospect>) => void }) {
  const updateDraft = (up: Partial<OutboundDraft>) =>
    patch({ drafts: p.drafts.map((d) => (d.touch === draft.touch ? { ...d, ...up } : d)) });

  const markSent = () => {
    const touches = [...p.touches];
    if (draft.touch >= 1 && draft.touch <= 5) touches[draft.touch - 1] = touches[draft.touch - 1] || today();
    patch({
      drafts: p.drafts.map((d) => (d.touch === draft.touch ? { ...d, status: "sent", sentDate: today() } : d)),
      touches,
      status: p.status === "Not Contacted" ? "Contacted" : p.status,
    });
  };

  const copy = () => navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`);

  return (
    <div className={cx("rounded-lg border bg-inset p-3", draft.status === "sent" ? "border-ok/40" : draft.status === "approved" ? "border-brass/40" : "border-line")}>
      <div className="mb-2 flex items-center gap-2">
        <Tag tone="neutral">Touch {draft.touch}</Tag>
        <Tag tone={draft.status === "sent" ? "ok" : draft.status === "approved" ? "brass" : "neutral"}>{draft.status}</Tag>
        <span className="font-mono text-[11px] text-faint">{draft.lang}</span>
        <button onClick={copy} className="ml-auto font-mono text-[12px] text-brass hover:underline">
          copy
        </button>
      </div>
      <input
        value={draft.subject}
        onChange={(e) => updateDraft({ subject: e.target.value })}
        placeholder="Subject…"
        className="mb-1.5 w-full rounded border border-line bg-panel px-2 py-1.5 font-body text-[13px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
      />
      <TextArea value={draft.body} onChange={(v) => updateDraft({ body: v })} rows={5} />
      <div className="mt-2 flex items-center gap-2">
        {draft.status === "draft" && (
          <Button variant="ghost" onClick={() => updateDraft({ status: "approved", approvedDate: today() })}>
            ✓ Approve
          </Button>
        )}
        {draft.status !== "sent" && (
          <Button variant="primary" onClick={markSent}>
            Log send (T{draft.touch})
          </Button>
        )}
        {draft.sentDate && <span className="font-mono text-[11px] text-ok">sent {draft.sentDate}</span>}
      </div>
    </div>
  );
}

function ProspectDetail({ p }: { p: Prospect }) {
  const patchProspect = useStore((s) => s.patchProspect);
  const deleteProspect = useStore((s) => s.deleteProspect);
  const promoteProspect = useStore((s) => s.promoteProspect);
  const navigate = useNavigate();
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");

  const patch = (up: Partial<Prospect>) => patchProspect(p.id, up);
  const set = (k: keyof Prospect, v: string) => patch({ [k]: v } as Partial<Prospect>);

  const promote = () => {
    const id = promoteProspect(p.id);
    if (id) navigate(`/clients/${id}`);
  };

  const generateDrafts = async () => {
    setError("");
    setDrafting(true);
    try {
      const lang = p.lang || detectLang(p.market, p.city);
      const system = draftingSystemPrompt({ ...p, lang });
      const text = await generate(system, [{ role: "user", content: `Draft the 5-touch sequence for ${p.org}. Return the fenced JSON only.` }], 3000);
      const drafts = parseDrafts(text, lang, p.channel);
      if (drafts.length === 0) setError("The agent returned no usable drafts — try again.");
      else patch({ drafts });
    } catch (e) {
      setError((e as Error).message || "Drafting failed.");
    } finally {
      setDrafting(false);
    }
  };

  const promoted = !!p.accountId;
  const aiReady = isSupabaseConfigured();

  return (
    <div className="mt-2 rounded-lg border border-line bg-white/[.015] p-3.5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Contact name" value={p.name} onChange={(v) => set("name", v)} mono={false} />
        <Field label="Role" value={p.role} onChange={(v) => set("role", v)} mono={false} />
        <SelectField label="Segment" value={p.segment} onChange={(v) => set("segment", v)} options={["", ...useStore.getState().company.icp.segments.map((s) => s.name)]} />
        <Field label="City" value={p.city} onChange={(v) => set("city", v)} mono={false} />
        <SelectField label="Market" value={p.market} onChange={(v) => patch({ market: v as Prospect["market"], lang: detectLang(v as Prospect["market"], p.city) })} options={MARKETS} />
        <SelectField label="Language" value={p.lang} onChange={(v) => patch({ lang: v as Prospect["lang"] })} options={LANGS} />
        <SelectField label="Channel" value={p.channel} onChange={(v) => set("channel", v)} options={OUTBOUND_CHANNELS} />
        <Field label="Email" value={p.email} onChange={(v) => set("email", v)} type="email" inputMode="email" />
        <Field label="Phone" value={p.phone} onChange={(v) => set("phone", v)} type="tel" inputMode="tel" />
      </div>
      <TextArea label="Signal (why now)" value={p.signal} onChange={(v) => set("signal", v)} rows={2} className="mt-2" />
      <Field label="Source URL" value={p.sourceUrl} onChange={(v) => set("sourceUrl", v)} type="url" inputMode="url" className="mt-2" />
      <TextArea label="Notes" value={p.notes} onChange={(v) => set("notes", v)} rows={2} className="mt-2" />

      {/* The conversation — the part you come back for. */}
      <div className="mt-4 border-t border-line/70 pt-3">
        <div className="mb-2 font-mono text-[12px] uppercase tracking-label text-faint">Contact history</div>
        <ContactLog p={p} patch={patch} />
      </div>

      <div className="mt-4 border-t border-line/70 pt-3">
        <div className="mb-2 font-mono text-[12px] uppercase tracking-label text-faint">Follow-ups</div>
        <FollowUps p={p} />
      </div>

      <details className="mt-3 border-t border-line/70 pt-3">
        <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-label text-faint hover:text-dim">
          5-touch sequence dates
        </summary>
        <div className="mt-2">
          <TouchTrack p={p} patch={patch} />
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={linkedinSearchUrl(p)}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line px-3 py-1.5 font-mono text-[12px] uppercase tracking-label text-dim transition-colors hover:border-brass hover:text-ink"
        >
          LinkedIn search ↗
        </a>
        {promoted ? (
          <Button variant="ghost" onClick={() => navigate(`/clients/${p.accountId}`)}>
            View client ↗
          </Button>
        ) : (
          <Button variant="primary" onClick={promote}>
            Promote to client
          </Button>
        )}
        <Button variant="danger" onClick={() => deleteProspect(p.id)} className="ml-auto">
          Delete
        </Button>
      </div>

      {/* Drafting Agent + approval queue */}
      <div className="mt-4 border-t border-line/70 pt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[12px] uppercase tracking-label text-faint">Touch 1–5 drafts</span>
          <Button variant="ghost" onClick={generateDrafts} disabled={!aiReady || drafting} className="ml-auto mb-0">
            {drafting ? "Drafting…" : p.drafts.length ? "↻ Redraft" : "✦ Draft with AI"}
          </Button>
        </div>
        {!aiReady && <p className="mb-2 font-mono text-[12px] text-warn">Sign in (cloud mode) to draft — the agent runs through the authenticated AI proxy.</p>}
        {error && <p className="mb-2 font-mono text-[12px] text-bad">{error}</p>}
        {p.drafts.length === 0 ? (
          <p className="font-mono text-[12px] text-faint">
            {drafting ? "Writing the sequence…" : "No drafts yet. The agent uses the prospect's signal + the LóFő case study."}
          </p>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {[...p.drafts].sort((a, b) => a.touch - b.touch).map((d) => (
              <DraftCard key={d.touch} p={p} draft={d} patch={patch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProspectRow({ p, defaultOpen = false }: { p: Prospect; defaultOpen?: boolean }) {
  const patchProspect = useStore((s) => s.patchProspect);
  const tasks = useStore((s) => s.tasks);
  const [open, setOpen] = useState(defaultOpen);
  const doneTouches = p.drafts.filter((d) => d.status === "sent").length || p.touches.filter(Boolean).length;
  const log = p.log ?? [];
  const last = [...log].sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-1)[0];
  const nextUp = Object.values(tasks)
    .filter((t) => t.linkType === "prospect" && t.linkId === p.id && !t.done)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""))[0];

  return (
    <div className="rounded-lg border border-line bg-inset">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button onClick={() => setOpen((o) => !o)} className="font-mono text-[13px] text-faint hover:text-brass" aria-label="Toggle detail">
          {open ? "▾" : "▸"}
        </button>
        <span className="min-w-0 flex-1">
          <span className="text-[14px] font-medium text-ink">{p.org || "Unnamed target"}</span>
          {p.name && <span className="ml-2 font-mono text-[12px] text-faint">{p.name}</span>}
          {p.city && <span className="ml-2 font-mono text-[12px] text-faint">{p.city}</span>}
          {p.signal && <span className="ml-2 hidden truncate text-[12px] text-dim md:inline">· {p.signal}</span>}
          {/* The two things you want without expanding: where it stands, what's next. */}
          <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">
            {last ? `last: ${last.date} ${last.channel}${last.reply ? " · replied" : ""}` : "never contacted"}
            {nextUp && <span className="text-brass"> · next: {nextUp.title} ({nextUp.due})</span>}
          </span>
        </span>
        {p.accountId && <Tag tone="ok">client</Tag>}
        <span className="font-mono text-[11px] text-faint">{doneTouches}/5</span>
        <select
          value={p.status}
          onChange={(e) => patchProspect(p.id, { status: e.target.value as ProspectStatus })}
          className={cx(
            "rounded-full border bg-white/[.03] px-2 py-1 font-mono text-[11px] uppercase tracking-label focus:outline-none",
            {
              neutral: "border-line2/70 text-dim",
              warn: "border-[#F5B44555] text-warn",
              brass: "border-brass/40 text-brass",
              ok: "border-[#3DDC9755] text-ok",
              bad: "border-[#FF6B6B55] text-bad",
              pl: "border-pl-line text-pl",
            }[STATUS_TONE[p.status]],
          )}
        >
          {PROSPECT_STATUS.map((s) => (
            <option key={s} value={s} className="bg-panel text-ink">
              {s}
            </option>
          ))}
        </select>
      </div>
      {open && (
        <div className="px-3 pb-3">
          <ProspectDetail p={p} />
        </div>
      )}
    </div>
  );
}

export function Prospects() {
  const prospects = useStore((s) => s.prospects);
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  // A follow-up task on the Deck links here with ?open=<id>.
  const openId = new URLSearchParams(useLocation().search).get("open") || "";

  const list = useMemo(
    () => Object.values(prospects).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [prospects],
  );
  const shown = filter === "all" ? list : list.filter((p) => p.status === filter);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of list) m[p.status] = (m[p.status] || 0) + 1;
    return m;
  }, [list]);

  return (
    <div>
      <PageHeader
        title="Outbound Engine"
        kicker="prospects · pipeline"
        actions={
          <Button variant="primary" onClick={() => setAdding((a) => !a)}>
            {adding ? "Close" : "+ Prospect"}
          </Button>
        }
      />
      <OutreachNav />

      {adding && <AddProspect onDone={() => setAdding(false)} />}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={cx(
            "rounded-full border px-3 py-1 font-mono text-[12px] uppercase tracking-label",
            filter === "all" ? "border-brass/50 bg-brass-dim text-brass" : "border-line text-faint hover:text-ink",
          )}
        >
          All {list.length}
        </button>
        {PROSPECT_STATUS.filter((s) => counts[s]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cx(
              "rounded-full border px-3 py-1 font-mono text-[12px] uppercase tracking-label",
              filter === s ? "border-brass/50 bg-brass-dim text-brass" : "border-line text-faint hover:text-ink",
            )}
          >
            {s} {counts[s]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Panel className="p-4">
          <Empty glyph="➤" action={<Button variant="primary" onClick={() => setAdding(true)}>Add a target</Button>}>
            No targets{filter !== "all" ? " in this stage" : " yet"}. Add an organisation worth approaching, or approve
            candidates in Discovery.
          </Empty>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((p) => (
            <ProspectRow key={p.id} p={p} defaultOpen={p.id === openId} />
          ))}
        </div>
      )}
    </div>
  );
}
