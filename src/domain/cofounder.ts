/**
 * The co-founder's brain — a data-aware advisor that reads the live cockpit
 * state and answers like a sharp, trusted business partner.
 *
 * Pure and framework-free: it pattern-matches the operator's question to an
 * intent and composes a spoken answer from real numbers. Anything it can't
 * confidently field returns `handled: false`, so the UI can hand off to the AI
 * brain when a key is configured — and otherwise fall back gracefully. The same
 * facts power the LLM system prompt, so the upgrade speaks from identical data.
 */
import type { Dashboard } from "./dashboard";

const eur = (n: number) => `${Math.round(n).toLocaleString()} euro${Math.round(n) === 1 ? "" : "s"}`;
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
/** Queue labels read "Collect deposit — Untitled"; soften the dash for speech. */
const clean = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/\s*·\s*/g, ", ");

export interface CoReply {
  text: string;
  handled: boolean;
}

const focus = (d: Dashboard): string => {
  if (!d.queue.length) return "Board's clear. If you want forward motion, open the pipeline and start some outreach.";
  const top = d.queue
    .slice(0, 3)
    .map((it, i) => `${i + 1}. ${clean(it.lbl)}`)
    .join("  ");
  return `Here's the order I'd work it. ${top}`;
};

const moneyLine = (d: Dashboard): string => {
  const bits = [`Revenue booked is ${eur(d.totRev)}, net ${eur(d.net)}`];
  bits.push(d.outstanding > 0 ? `${eur(d.outstanding)} is owed to you` : "nothing outstanding");
  if (d.expected30 > 0) bits.push(`and ${eur(d.expected30)} should land within thirty days`);
  return bits.join(", ") + ".";
};

const pipeline = (d: Dashboard): string => {
  const names = d.leads
    .slice(0, 3)
    .map((a) => a.name || "an unnamed lead")
    .join(", ");
  let s = `${plural(d.leads.length, "open lead")}`;
  if (names) s += ` — ${names}`;
  s += `. ${plural(d.activeProjects.length, "project")} in production.`;
  if (d.behindOutreach) s += ` Heads up, outreach is behind: ${d.outreachWk} of ${d.outreachTarget} this week.`;
  return s;
};

const tasks = (d: Dashboard): string => {
  const due = d.queue.filter((it) => it.tag === "Task");
  if (!due.length) return "No tasks due today. You're on top of it.";
  return `${plural(due.length, "task")} due: ${due.slice(0, 4).map((it) => clean(it.lbl)).join("; ")}.`;
};

const deadlines = (d: Dashboard): string => {
  if (!d.deadlinesSoon.length) return "No deadlines closing in. Clear runway ahead.";
  const names = d.deadlinesSoon.slice(0, 3).map((p) => p.name || "Untitled").join(", ");
  return `${plural(d.deadlinesSoon.length, "deadline")} approaching: ${names}. Keep the factory honest on those.`;
};

const projects = (d: Dashboard): string => {
  if (!d.activeProjects.length) return "No active projects right now — the bench is empty. Let's fix that.";
  const names = d.activeProjects.slice(0, 4).map((p) => `${p.name || "Untitled"} at ${p.stage}`).join(", ");
  return `${plural(d.activeProjects.length, "active project")}: ${names}.`;
};

/** A proactive, spoken start-of-session briefing built from live data. */
export function coFounderBriefing(d: Dashboard, name = ""): string {
  const hi = name ? `Right, ${name}.` : "Right.";
  const parts: string[] = [];
  if (!d.queue.length) parts.push("Board's clear, nothing pressing.");
  else {
    parts.push(`${plural(d.queue.length, "thing")} on the board.`);
    parts.push(`Top of the list: ${clean(d.queue[0].lbl)}.`);
  }
  parts.push(`${plural(d.leads.length, "open lead")}, ${plural(d.activeProjects.length, "project")} in production.`);
  if (d.outstanding > 0) parts.push(`You're owed ${eur(d.outstanding)}.`);
  if (d.behindOutreach) parts.push(`Outreach is behind, ${d.outreachWk} of ${d.outreachTarget} this week.`);
  return `${hi} ${parts.join(" ")}`;
}

/** A compact fact sheet for grounding the LLM brain (the paid upgrade). */
export function coFounderFacts(d: Dashboard): string {
  const lines = [
    `Revenue booked: ${eur(d.totRev)}. Net: ${eur(d.net)}. Outstanding/owed: ${eur(d.outstanding)}. Expected within 30 days: ${eur(d.expected30)}.`,
    `Open leads: ${d.leads.length}${d.leads.length ? ` (${d.leads.slice(0, 5).map((a) => a.name || "unnamed").join(", ")})` : ""}.`,
    `Active projects: ${d.activeProjects.length}${d.activeProjects.length ? ` (${d.activeProjects.slice(0, 6).map((p) => `${p.name || "Untitled"} @ ${p.stage}`).join(", ")})` : ""}.`,
    `Outreach this week: ${d.outreachWk}/${d.outreachTarget}${d.behindOutreach ? " (behind)" : ""}.`,
    `Action queue (${d.queue.length}): ${d.queue.slice(0, 6).map((it) => clean(it.lbl)).join("; ") || "empty"}.`,
    `Deadlines approaching: ${d.deadlinesSoon.length}${d.deadlinesSoon.length ? ` (${d.deadlinesSoon.slice(0, 4).map((p) => p.name || "Untitled").join(", ")})` : ""}.`,
  ];
  return lines.join("\n");
}

/** The persona + grounding prompt the LLM upgrade speaks from. */
export function coFounderSystem(d: Dashboard, name = ""): string {
  return [
    `You are the co-founder and right hand of a one-person bespoke watch company (Artymer).${name ? ` The founder's name is ${name}.` : ""}`,
    "Speak like a sharp, warm, trusted business partner: concise, direct, encouraging, plain-spoken — never corporate.",
    "Your reply is read ALOUD, so: 1–3 sentences, no markdown, no lists, no headings.",
    "Here is the live state of the business right now:",
    coFounderFacts(d),
    "Answer the founder using these facts. If they ask something the facts don't cover, give brief founder-level judgement and, if useful, one concrete next step.",
  ].join("\n");
}

/**
 * Answer a question from local data. Returns `handled: false` for open-ended
 * questions the heuristics can't field — the UI then tries the AI brain.
 */
export function coFounderAnswer(qIn: string, d: Dashboard, name = ""): CoReply {
  const q = qIn.toLowerCase().trim();
  const has = (...ks: string[]) => ks.some((k) => q.includes(k));
  if (!q) return { text: "I'm here. Ask what to focus on, or about the money, leads, tasks or deadlines.", handled: true };
  if (has("catch me up", "brief", "what's up", "whats up", "status", "sitrep", "sit rep", "good morning", "morning", "hello", "hey", "hi "))
    return { text: coFounderBriefing(d, name), handled: true };
  if (has("focus", "what should i do", "what now", "priorit", "next up", "most important", "today", "where do i start"))
    return { text: focus(d), handled: true };
  if (has("money", "cash", "revenue", "owed", "outstanding", "margin", "profit", "burn", "runway", "income", "finance"))
    return { text: moneyLine(d), handled: true };
  if (has("lead", "pipeline", "prospect", "deal", "sales", "outreach", "client"))
    return { text: pipeline(d), handled: true };
  if (has("task", "to-do", "todo", "to do"))
    return { text: tasks(d), handled: true };
  if (has("deadline", "due", "late", "overdue", "ship"))
    return { text: deadlines(d), handled: true };
  if (has("project", "watch", "order", "production", "bench"))
    return { text: projects(d), handled: true };
  if (has("help", "what can you do", "who are you", "capabilit"))
    return {
      text: "I'm your co-founder. I read your board and tell you what to focus on, where the money is, plus your leads, tasks, deadlines and projects. Just ask — or say 'catch me up'.",
      handled: true,
    };
  if (has("thank", "cheers", "good job", "nice", "love"))
    return { text: "Anytime. Let's keep the bench moving.", handled: true };
  return { text: "", handled: false };
}
