/**
 * The pipeline engine — the logic that makes stages *do* something.
 *
 * Three pure concerns, all framework-free and tested:
 *  - planAdvance:     the effects of moving a project one stage forward —
 *                     the canonical next-action task, and sensible expected
 *                     payment dates. This is what turns the board into an engine.
 *  - pipelineMetrics: probability-weighted forecast, win rate, value by stage.
 *  - contactsDue:     the outreach cadence — who needs a touch, and why.
 */
import { NEXT, PIPE, PROD, STAGES } from "./constants";
import { blankTask, today as todayFn } from "./factories";
import { committed, projFin, stageIdx } from "./finance";
import { dAgo, dFromNow, num } from "./format";
import type { Account, Company, Project, Task } from "./types";

/** Probability that an open project converts to (or has booked) revenue. */
export const STAGE_PROB: Record<string, number> = {
  Proposal: 0.2,
  Negotiating: 0.5,
  Won: 0.9,
  Brief: 0.92,
  Design: 0.94,
  CAD: 0.95,
  Deposit: 0.97,
  Tooling: 0.98,
  "First-off": 0.98,
  Production: 0.99,
  QC: 0.99,
  Shipped: 1,
  Delivered: 1,
};

const isOpen = (p: Project) => !p.lost && p.stage !== "Delivered";

/** Add `n` days to an ISO date string (yyyy-mm-dd). */
const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export interface AdvanceEffect {
  /** No-op when already at the final stage. */
  canAdvance: boolean;
  nextStage: string;
  /** Patch to apply to the project (stage + any expected dates filled in). */
  patch: Partial<Project>;
  /** The follow-up task to create, or null if a matching open one already exists. */
  newTask: Task | null;
  /** Human-readable notes on what the advance did, for a confirmation toast. */
  notes: string[];
}

/**
 * Plan the effects of advancing a project by one stage. Pure: it returns the
 * intended changes rather than mutating, so the store applies them atomically
 * and the logic stays testable. Expected payment dates are only *filled in* when
 * blank — never overwritten.
 */
export const planAdvance = (
  p: Project,
  existingTasks: Task[],
  todayStr: string = todayFn(),
): AdvanceEffect => {
  const idx = stageIdx(p);
  if (idx < 0 || idx >= STAGES.length - 1) {
    return { canAdvance: false, nextStage: p.stage, patch: {}, newTask: null, notes: [] };
  }
  const nextStage = STAGES[idx + 1];
  const patch: Partial<Project> = { stage: nextStage };
  const notes: string[] = [`Stage → ${nextStage}`];

  // Filling expected payment dates as the deal commits.
  const anchor = p.deadline && dFromNow(p.deadline) != null ? p.deadline : todayStr;
  if ((nextStage === "Won" || nextStage === "Deposit") && !p.depositExpected) {
    patch.depositExpected = addDays(todayStr, 5);
    notes.push(`Deposit expected ${patch.depositExpected}`);
  }
  if (nextStage === "QC" && !p.balanceExpected) {
    patch.balanceExpected = anchor;
    notes.push(`Balance expected ${patch.balanceExpected}`);
  }

  // The canonical next-action task — deduped against open auto/stage tasks.
  const title = NEXT[nextStage] || `Advance ${nextStage}`;
  const dup = existingTasks.some(
    (t) => !t.done && t.linkType === "project" && t.linkId === p.id && t.title === title,
  );
  let newTask: Task | null = null;
  if (!dup) {
    newTask = {
      ...blankTask({ type: "project", id: p.id }),
      title,
      due: addDays(todayStr, 3),
      source: "stage",
    };
    notes.push(`Task: ${title}`);
  }

  return { canAdvance: true, nextStage, patch, newTask, notes };
};

export interface StageBucket {
  stage: string;
  count: number;
  value: number;
}

export interface PipelineMetrics {
  open: Project[];
  /** Speculative value — projects still in Proposal/Negotiating. */
  prospectValue: number;
  /** Booked value — committed (Won+) but not yet delivered. */
  committedValue: number;
  /** Probability-weighted forecast across all open projects. */
  weighted: number;
  wonCount: number;
  lostCount: number;
  /** Won / (Won + Lost); 0 when nothing is decided. */
  winRate: number;
  byStage: StageBucket[];
}

export const pipelineMetrics = (projList: Project[], company: Company): PipelineMetrics => {
  const open = projList.filter(isOpen);
  let prospectValue = 0;
  let committedValue = 0;
  let weighted = 0;
  open.forEach((p) => {
    const rev = projFin(p, company).rev;
    weighted += rev * (STAGE_PROB[p.stage] ?? 0.5);
    if ((PIPE as readonly string[]).includes(p.stage) && !committed(p)) prospectValue += rev;
    if (committed(p)) committedValue += rev;
  });

  const wonCount = projList.filter((p) => committed(p)).length;
  const lostCount = projList.filter((p) => p.lost).length;
  const decided = wonCount + lostCount;
  const winRate = decided ? (wonCount / decided) * 100 : 0;

  const byStage: StageBucket[] = STAGES.map((stage) => {
    const items = open.filter((p) => p.stage === stage);
    return { stage, count: items.length, value: items.reduce((a, p) => a + projFin(p, company).rev, 0) };
  });

  return { open, prospectValue, committedValue, weighted, wonCount, lostCount, winRate, byStage };
};

export type ContactReason = "follow-up due" | "no contact logged" | "going cold";

export interface ContactDue {
  account: Account;
  reason: ContactReason;
  /** Days since last contact, or null if never. */
  daysSince: number | null;
}

/**
 * The outreach cadence. A live account is "going cold" past `coldDays` without
 * contact; a prospect with no contact at all needs a first touch; any account
 * with a scheduled `nextAction` whose date has arrived is a follow-up. Sorted
 * most-urgent first.
 */
export const contactsDue = (acctList: Account[], coldDays = 30): ContactDue[] => {
  const out: ContactDue[] = [];
  acctList.forEach((a) => {
    if (a.status === "lost") return;
    const since = dAgo(a.lastContact);
    if (a.nextAction && dFromNow(a.nextDate) != null && (dFromNow(a.nextDate) as number) <= 0) {
      out.push({ account: a, reason: "follow-up due", daysSince: since });
    } else if (!a.lastContact && (a.status === "prospect" || a.status === "active")) {
      out.push({ account: a, reason: "no contact logged", daysSince: null });
    } else if (a.status === "active" && since != null && since > coldDays) {
      out.push({ account: a, reason: "going cold", daysSince: since });
    }
  });
  // never-contacted first, then longest-since.
  return out.sort((x, y) => (y.daysSince ?? 1e9) - (x.daysSince ?? 1e9));
};

/** Convenience: weeks of revenue runway implied by committed receivables. */
export const weightedVsTarget = (weighted: number, company: Company): number => {
  const monthly = num(company.monthlyRevenue);
  return monthly ? weighted / monthly : 0;
};

export { PROD };
