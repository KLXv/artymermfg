/**
 * The assistant as operator.
 *
 * It streams grounded advice and may propose ACTIONS — create a task, advance a
 * stage, set a price, log contact, schedule a follow-up, or draft copy — which
 * the operator applies with one tap. The assistant never executes anything:
 * proposals are parsed from a fenced block (pure `parseAssistantReply`) and
 * resolved against a handle→entity map snapshotted at send time, so a stale or
 * fabricated reference simply can't be applied.
 */
import { useRef, useState } from "react";
import {
  acctName,
  blankTask,
  dAgo,
  describeAction,
  operatorSystemPrompt,
  owed,
  parseAssistantReply,
  stageIdx,
  today,
  type OperatorAction,
  type OperatorContext,
} from "@/domain";
import type { ChatTurn } from "@/domain/types-ai";
import { chatStream } from "@/data/ai";
import { Button, Empty, Panel, Tag, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

type RefEntry = { kind: "project" | "account"; id: string; name: string };
type RefMap = Record<string, RefEntry>;

interface UiTurn {
  role: "user" | "assistant";
  content: string;
  actions?: { action: OperatorAction; applied: boolean }[];
  refMap?: RefMap;
}

const SUGGESTIONS = [
  "What should I do first today?",
  "Draft a follow-up to my coldest active client.",
  "Which project is underpriced, and what should it be?",
  "Queue the next action for everything in production.",
];

export function Assistant() {
  const d = useDashboard();
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const company = useStore((s) => s.company);
  const suppliers = useStore((s) => s.suppliers);
  const upsertTask = useStore((s) => s.upsertTask);
  const advanceProject = useStore((s) => s.advanceProject);
  const patchProject = useStore((s) => s.patchProject);
  const patchAccount = useStore((s) => s.patchAccount);

  const [turns, setTurns] = useState<UiTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildContext = (): { system: string; refMap: RefMap } => {
    const refMap: RefMap = {};
    const projOpen = Object.values(projects)
      .filter((p) => !p.lost && p.stage !== "Delivered")
      .sort((a, b) => stageIdx(b) - stageIdx(a))
      .slice(0, 12);
    const clientList = Object.values(accounts).slice(0, 12);

    const projRefs = projOpen.map((p, i) => {
      const handle = `P${i + 1}`;
      refMap[handle] = { kind: "project", id: p.id, name: p.name || "untitled" };
      return {
        handle,
        name: p.name,
        client: acctName(p, accounts),
        stage: p.stage,
        qty: p.qty,
        price: p.unitPrice,
        currency: p.currency,
        owed: owed(p, company),
        service: p.servicePath || accounts[p.accountId]?.servicePath || "Commission",
      };
    });
    const clientRefs = clientList.map((c, i) => {
      const handle = `A${i + 1}`;
      refMap[handle] = { kind: "account", id: c.id, name: c.name || "unnamed" };
      return { handle, name: c.name, status: c.status, lastContactDays: dAgo(c.lastContact), nextAction: c.nextAction };
    });

    const ctx: OperatorContext = {
      snapshot: {
        activeProjects: d.activeProjects.length,
        outstanding: d.outstanding,
        expected30: d.expected30,
        leads: d.leads.length,
        outreachWk: d.outreachWk,
        outreachTarget: d.outreachTarget,
        suppliers: Object.keys(suppliers).length,
      },
      projects: projRefs,
      clients: clientRefs,
      today: today(),
    };
    return { system: operatorSystemPrompt(ctx), refMap };
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setErr("");
    const { system, refMap } = buildContext();
    const history: ChatTurn[] = turns.map((t) => ({
      role: t.role,
      content: t.role === "assistant" ? parseAssistantReply(t.content).prose : t.content,
    }));
    const outbound: ChatTurn[] = [...history, { role: "user", content: text }];

    setTurns((cur) => [...cur, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setDraft("");
    setStreaming(true);
    try {
      const full = await chatStream(system, outbound, (delta) => {
        setTurns((cur) => {
          const copy = [...cur];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
      const { prose, actions } = parseAssistantReply(full);
      setTurns((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = {
          role: "assistant",
          content: prose,
          actions: actions.map((action) => ({ action, applied: false })),
          refMap,
        };
        return copy;
      });
    } catch {
      setErr("Assistant unavailable — deploy the proxy and sign in to enable streaming.");
      setTurns((cur) => cur.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const resolvable = (a: OperatorAction, map?: RefMap): boolean => {
    if (a.type === "draft") return true;
    if (a.type === "create_task") return !a.ref || !!map?.[a.ref];
    return !!map?.[a.ref];
  };

  const applyAction = (ti: number, ai: number) => {
    const turn = turns[ti];
    const entry = turn.actions?.[ai];
    if (!entry || entry.applied) return;
    const a = entry.action;
    const map = turn.refMap || {};
    const ref = "ref" in a && a.ref ? map[a.ref] : undefined;

    switch (a.type) {
      case "create_task":
        upsertTask({
          ...blankTask(ref ? { type: ref.kind, id: ref.id } : {}),
          title: a.title,
          due: a.due || blankTask().due,
          source: "assistant",
        });
        break;
      case "advance_stage":
        if (ref?.kind === "project") advanceProject(ref.id);
        break;
      case "set_price":
        if (ref?.kind === "project") patchProject(ref.id, { unitPrice: a.unitPrice });
        break;
      case "log_contact":
        if (ref?.kind === "account") patchAccount(ref.id, { lastContact: today() });
        break;
      case "set_next_action":
        if (ref?.kind === "account") patchAccount(ref.id, { nextAction: a.nextAction, nextDate: a.nextDate || "" });
        break;
      case "draft":
        void navigator.clipboard?.writeText(a.body).catch(() => undefined);
        break;
    }

    setTurns((cur) => {
      const copy = [...cur];
      const t = { ...copy[ti] };
      t.actions = t.actions?.map((x, idx) => (idx === ai ? { ...x, applied: true } : x));
      copy[ti] = t;
      return copy;
    });
  };

  return (
    <div>
      <PageHeader title="Assistant" kicker="grounded · proposes actions you apply" />

      <Panel className="flex h-[68vh] flex-col p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Empty>Ask anything. The assistant sees your projects, cash and pipeline — and can propose actions.</Empty>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-[20px] border border-line px-3 py-1.5 text-left font-mono text-[13px] text-dim hover:border-brass hover:text-brass"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {turns.map((t, ti) => {
                const prose = t.role === "assistant" ? parseAssistantReply(t.content).prose : t.content;
                const nameOf = (h: string) => t.refMap?.[h]?.name ?? h;
                return (
                  <div key={ti} className={cx("flex flex-col gap-2", t.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cx(
                        "max-w-[80%] whitespace-pre-wrap rounded-md px-3.5 py-2.5 text-[14px] leading-relaxed",
                        t.role === "user"
                          ? "border border-brass/30 bg-brass-dim text-ink"
                          : "border border-line bg-inset text-dim",
                      )}
                    >
                      {prose || (streaming && ti === turns.length - 1 ? <span className="text-faint">…</span> : "")}
                    </div>

                    {t.actions && t.actions.length > 0 && (
                      <div className="flex max-w-[85%] flex-col gap-1.5">
                        {t.actions.map((entry, ai) => {
                          const canApply = resolvable(entry.action, t.refMap);
                          return (
                            <div
                              key={ai}
                              className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2"
                            >
                              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                                {describeAction(entry.action, nameOf)}
                              </span>
                              {entry.applied ? (
                                <Tag tone="ok">{entry.action.type === "draft" ? "copied" : "applied"}</Tag>
                              ) : (
                                <Button
                                  variant="primary"
                                  disabled={!canApply}
                                  onClick={() => applyAction(ti, ai)}
                                >
                                  {entry.action.type === "draft" ? "Copy" : "Apply"}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {err && <div className="border-t border-line px-4 py-2 font-mono text-[13px] text-warn">{err}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the assistant…"
            className="flex-1 rounded border border-line bg-inset px-3 py-2 font-body text-[14px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
          />
          <Button type="submit" variant="primary" disabled={streaming || !draft.trim()}>
            {streaming ? "…" : "Send"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
