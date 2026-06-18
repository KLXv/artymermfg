/**
 * The operator layer — turning the assistant from a chat box into something
 * that proposes *actions* the operator applies with one tap.
 *
 * Safety model: the assistant never executes anything. It emits a fenced
 * `artymer-actions` JSON block that this pure module parses and validates;
 * the UI renders each action as a confirm card and applies it to the store
 * only on tap. Entities are referenced by short handles ([P1], [A1]) listed in
 * the prompt, never by raw ids, so the model can't fabricate targets.
 */
import { assistantSystemPrompt, type AssistantSnapshot } from "./prompts";
import { money } from "./format";

export type OperatorAction =
  | { type: "create_task"; title: string; due?: string; ref?: string }
  | { type: "advance_stage"; ref: string }
  | { type: "set_price"; ref: string; unitPrice: string }
  | { type: "log_contact"; ref: string }
  | { type: "set_next_action"; ref: string; nextAction: string; nextDate?: string }
  | { type: "draft"; title: string; body: string };

export interface ProjectRef {
  handle: string;
  name: string;
  client: string;
  stage: string;
  qty: string;
  price: string;
  currency: string;
  owed: number;
  service: string;
}

export interface ClientRef {
  handle: string;
  name: string;
  status: string;
  lastContactDays: number | null;
  nextAction: string;
}

export interface OperatorContext {
  snapshot: AssistantSnapshot;
  projects: ProjectRef[];
  clients: ClientRef[];
  today: string;
}

const str = (x: unknown): x is string => typeof x === "string" && x.length > 0;

/** Shape-validate one raw action; return null if it's malformed. */
const validateAction = (a: unknown): OperatorAction | null => {
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  switch (o.type) {
    case "create_task":
      return str(o.title)
        ? { type: "create_task", title: o.title, due: str(o.due) ? o.due : undefined, ref: str(o.ref) ? o.ref : undefined }
        : null;
    case "advance_stage":
      return str(o.ref) ? { type: "advance_stage", ref: o.ref } : null;
    case "set_price":
      return str(o.ref) && str(o.unitPrice) ? { type: "set_price", ref: o.ref, unitPrice: o.unitPrice } : null;
    case "log_contact":
      return str(o.ref) ? { type: "log_contact", ref: o.ref } : null;
    case "set_next_action":
      return str(o.ref) && str(o.nextAction)
        ? { type: "set_next_action", ref: o.ref, nextAction: o.nextAction, nextDate: str(o.nextDate) ? o.nextDate : undefined }
        : null;
    case "draft":
      return str(o.title) && str(o.body) ? { type: "draft", title: o.title, body: o.body } : null;
    default:
      return null;
  }
};

/**
 * Split an assistant reply into display prose and the proposed actions. Looks
 * for the first fenced block that parses to `{ actions: [...] }` (the model may
 * tag it `artymer-actions` or `json`), validates each action, and strips the
 * block from the prose. Malformed blocks are ignored — the prose still shows.
 */
export const parseAssistantReply = (text: string): { prose: string; actions: OperatorAction[] } => {
  const fence = /```(?:[\w-]+)?\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let actions: OperatorAction[] = [];
  let matched = "";
  while ((m = fence.exec(text))) {
    try {
      const obj = JSON.parse(m[1].trim()) as { actions?: unknown };
      if (obj && Array.isArray(obj.actions)) {
        actions = obj.actions.map(validateAction).filter((x): x is OperatorAction => x !== null).slice(0, 4);
        matched = m[0];
        break;
      }
    } catch {
      /* not the actions block */
    }
  }
  const prose = (matched ? text.replace(matched, "") : text).trim();
  return { prose, actions };
};

/** Human label for a proposed action; `nameOf` resolves a handle to a name. */
export const describeAction = (a: OperatorAction, nameOf: (handle: string) => string): string => {
  switch (a.type) {
    case "create_task":
      return `Create task: “${a.title}”${a.ref ? ` · ${nameOf(a.ref)}` : ""}${a.due ? ` (due ${a.due})` : ""}`;
    case "advance_stage":
      return `Advance stage · ${nameOf(a.ref)}`;
    case "set_price":
      return `Set unit price → ${a.unitPrice} · ${nameOf(a.ref)}`;
    case "log_contact":
      return `Log contact today · ${nameOf(a.ref)}`;
    case "set_next_action":
      return `Next action: “${a.nextAction}”${a.nextDate ? ` (${a.nextDate})` : ""} · ${nameOf(a.ref)}`;
    case "draft":
      return `Draft: ${a.title}`;
  }
};

/**
 * Build the operator system prompt: the assistant's grounded voice (from
 * `assistantSystemPrompt`, which carries the "designs + directs, does NOT
 * hand-assemble" rule), a reference table of the live entities by handle, and
 * the action protocol.
 */
export const operatorSystemPrompt = (ctx: OperatorContext): string => {
  const base = assistantSystemPrompt(ctx.snapshot);

  const projLines = ctx.projects.length
    ? ctx.projects
        .map(
          (p) =>
            `[${p.handle}] ${p.name || "untitled"} — client ${p.client} · stage ${p.stage} · qty ${p.qty} · ${p.price} ${p.currency} · owed ${money(p.owed, "€")} · ${p.service}`,
        )
        .join("\n")
    : "(none)";

  const clientLines = ctx.clients.length
    ? ctx.clients
        .map(
          (c) =>
            `[${c.handle}] ${c.name || "unnamed"} — ${c.status} · last contact ${
              c.lastContactDays == null ? "never" : c.lastContactDays + "d ago"
            }${c.nextAction ? ` · next: ${c.nextAction}` : ""}`,
        )
        .join("\n")
    : "(none)";

  return `${base}

Today is ${ctx.today}.

PROJECTS:
${projLines}

CLIENTS:
${clientLines}

You can propose ACTIONS the operator applies with one tap. Only when an action genuinely helps, append ONE fenced block at the very end of your reply:
\`\`\`artymer-actions
{"actions":[ ... ]}
\`\`\`
Action shapes (reference entities ONLY by the bracketed handles above — never raw names or invented ids):
- {"type":"create_task","title":"...","due":"YYYY-MM-DD","ref":"P1"}   (ref optional; links the task to a project or client)
- {"type":"advance_stage","ref":"P1"}
- {"type":"set_price","ref":"P1","unitPrice":"180"}
- {"type":"log_contact","ref":"A1"}
- {"type":"set_next_action","ref":"A1","nextAction":"...","nextDate":"YYYY-MM-DD"}
- {"type":"draft","title":"...","body":"the full copy the operator can send"}
Rules: at most 4 actions; never fabricate handles; keep the prose and the actions consistent; if nothing is actionable, omit the block entirely. For "draft" bodies, honour the Private-Label rule — never name Artymer in a private-label client's copy.`;
};
