/**
 * The assistant — a grounded operator's sounding board. It streams from the
 * secure proxy, primed with a live snapshot of the business. The system prompt
 * encodes the hard rule: the founder designs and directs an OEM partner; he
 * does NOT hand-assemble, and the assistant must never imply he does.
 */
import { useRef, useState } from "react";
import { assistantSystemPrompt } from "@/domain/prompts";
import type { ChatTurn } from "@/domain/types-ai";
import { chatStream } from "@/data/ai";
import { Button, Empty, Panel, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { useDashboard } from "@/state/useDashboard";
import { PageHeader } from "./PageHeader";

const SUGGESTIONS = [
  "What should I do first today?",
  "How do I price a 30-piece commission to hold 40% margin?",
  "Draft a follow-up to a warm lead who's gone quiet.",
  "Which projects are at cash risk this month?",
];

export function Assistant() {
  const d = useDashboard();
  const suppliers = useStore((s) => s.suppliers);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const snapshot = {
    activeProjects: d.activeProjects.length,
    outstanding: d.outstanding,
    expected30: d.expected30,
    leads: d.leads.length,
    outreachWk: d.outreachWk,
    outreachTarget: d.outreachTarget,
    suppliers: Object.keys(suppliers).length,
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setErr("");
    const next: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setStreaming(true);
    try {
      await chatStream(assistantSystemPrompt(snapshot), next, (delta) => {
        setTurns((cur) => {
          const copy = [...cur];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    } catch {
      setErr("Assistant unavailable — deploy the proxy and sign in to enable streaming.");
      setTurns((cur) => cur.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div>
      <PageHeader title="Assistant" kicker="grounded in your live snapshot" />

      <Panel className="flex h-[68vh] flex-col p-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Empty>Ask anything about the business. The assistant sees your projects, cash and pipeline.</Empty>
              <div className="flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-[20px] border border-line px-3 py-1.5 text-left font-mono text-[11px] text-dim hover:border-brass hover:text-brass"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {turns.map((t, i) => (
                <div key={i} className={cx("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cx(
                      "max-w-[80%] whitespace-pre-wrap rounded-md px-3.5 py-2.5 text-[13px] leading-relaxed",
                      t.role === "user"
                        ? "border border-brass/30 bg-brass-dim text-ink"
                        : "border border-line bg-inset text-dim",
                    )}
                  >
                    {t.content || (streaming && i === turns.length - 1 ? <span className="text-faint">…</span> : "")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <div className="border-t border-line px-4 py-2 font-mono text-[11px] text-warn">{err}</div>}

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
            className="flex-1 rounded border border-line bg-inset px-3 py-2 font-body text-[13px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
          />
          <Button type="submit" variant="primary" disabled={streaming || !draft.trim()}>
            {streaming ? "…" : "Send"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
