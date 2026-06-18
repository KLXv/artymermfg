/**
 * Derivation engine — the command-deck aggregates and the prioritized action
 * queue. Ported verbatim from ArtymerCockpit.jsx.
 *
 * The original queue items carried a `go` navigation closure. To keep this
 * layer pure, each item instead carries a `target` descriptor; the UI maps
 * that to navigation. Weights, classes, labels, subs and tags are unchanged,
 * so ordering and copy are identical.
 */
import { NEXT, PIPE, PROD, STAGES } from "./constants";
import { acctName, bal, committed, dep, owed, projFin, stageIdx } from "./finance";
import { dAgo, dFromNow, money, num } from "./format";
import { projVerdict } from "./qc";
import type { Account, CockpitState, Project, Task } from "./types";

export type QueueTarget =
  | { kind: "project"; id: string }
  | { kind: "account"; id: string }
  | { kind: "view"; view: string };

export interface QueueItem {
  w: number;
  cls: "" | "hot" | "go";
  lbl: string;
  sub: string;
  tag: string;
  target: QueueTarget;
}

export interface CashEvent {
  date: string;
  amount: number;
  label: string;
  id: string;
}

const taskTarget = (t: Task): QueueTarget =>
  t.linkType === "project"
    ? { kind: "project", id: t.linkId }
    : t.linkType === "account"
      ? { kind: "account", id: t.linkId }
      : { kind: "view", view: "settings" };

export interface Dashboard {
  projList: Project[];
  acctList: Account[];
  activeProjects: Project[];
  totRev: number;
  totCost: number;
  totExp: number;
  net: number;
  outstanding: number;
  cashEvents: CashEvent[];
  expected30: number;
  monthBuckets: { name: string; inflow: number }[];
  leads: Account[];
  outreachWk: number;
  outreachTarget: number;
  behindOutreach: boolean;
  deadlinesSoon: Project[];
  queue: QueueItem[];
  alerts: number;
}

export const buildDashboard = (state: CockpitState): Dashboard => {
  const { accounts, projects, suppliers: _suppliers, tasks, expenses, company } = state;
  const projList = Object.values(projects);
  const acctList = Object.values(accounts);
  const taskList = Object.values(tasks);

  const activeProjects = projList.filter((pr) => pr.stage !== "Delivered" && !pr.lost);
  const totRev = projList.reduce((a, pr) => a + projFin(pr, company).rev, 0);
  const totCost = projList.reduce((a, pr) => a + projFin(pr, company).cost, 0);
  const totExp = expenses.reduce((a, e) => a + num(e.amount), 0);
  const net = totRev - totCost - totExp;
  const outstanding = projList.reduce((a, pr) => a + owed(pr, company), 0);

  const cashEvents: CashEvent[] = [];
  projList.forEach((pr) => {
    if (!committed(pr)) return;
    if (!pr.depositPaid)
      cashEvents.push({
        date: pr.depositExpected || pr.deadline || "",
        amount: dep(pr, company),
        label: (pr.name || "Untitled") + " · deposit",
        id: pr.id,
      });
    if (!pr.balancePaid)
      cashEvents.push({
        date: pr.balanceExpected || pr.deadline || "",
        amount: bal(pr, company),
        label: (pr.name || "Untitled") + " · balance",
        id: pr.id,
      });
  });
  cashEvents.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const expected30 = cashEvents
    .filter((e) => {
      const d = dFromNow(e.date);
      return d != null && d >= 0 && d <= 30;
    })
    .reduce((a, e) => a + e.amount, 0);

  const monthBuckets = (() => {
    const m: Record<string, number> = {};
    cashEvents.forEach((e) => {
      const d = dFromNow(e.date);
      if (d == null || d < 0 || d > 150) return;
      const key = (e.date || "").slice(0, 7);
      m[key] = (m[key] || 0) + e.amount;
    });
    return Object.keys(m)
      .sort()
      .map((k) => ({ name: k, inflow: Math.round(m[k]) }));
  })();

  const leads = acctList.filter((a) => a.status === "prospect");
  const outreachWk = acctList.filter((a) => {
    const ag = dAgo(a.lastContact);
    return ag != null && ag >= 0 && ag <= 7;
  }).length;
  const outreachTarget = num(company.weeklyOutreach);
  const behindOutreach = outreachWk < outreachTarget;
  const bufferDays = num(company.bufferWeeks) * 7;
  const deadlinesSoon = projList.filter(
    (pr) =>
      !pr.lost &&
      pr.stage !== "Delivered" &&
      PROD.includes(pr.stage as (typeof PROD)[number]) &&
      dFromNow(pr.deadline) != null &&
      (dFromNow(pr.deadline) as number) <= bufferDays,
  );

  const queue: QueueItem[] = [];
  projList.forEach((pr) => {
    if (committed(pr) && pr.qc?.received && !pr.qc?.signed && projVerdict(pr, company).verdict === "ACCEPT")
      queue.push({
        w: 1,
        cls: "go",
        lbl: `Sign off QC — ${pr.name || "Untitled"}`,
        sub: "Batch passed · release balance next",
        tag: "QC",
        target: { kind: "project", id: pr.id },
      });
    if (committed(pr) && !pr.depositPaid)
      queue.push({
        w: 2,
        cls: "hot",
        lbl: `Collect deposit — ${pr.name || "Untitled"}`,
        sub: `${money(dep(pr, company), "€")} · ${acctName(pr, accounts)}`,
        tag: "Cash",
        target: { kind: "project", id: pr.id },
      });
    if (committed(pr) && stageIdx(pr) >= STAGES.indexOf("QC") && !pr.balancePaid)
      queue.push({
        w: 2,
        cls: "hot",
        lbl: `Chase balance — ${pr.name || "Untitled"}`,
        sub: `${money(bal(pr, company), "€")} · ${acctName(pr, accounts)}`,
        tag: "Cash",
        target: { kind: "project", id: pr.id },
      });
  });
  deadlinesSoon.forEach((pr) => {
    const dd = dFromNow(pr.deadline) as number;
    queue.push({
      w: dd < 0 ? 0 : 3,
      cls: "hot",
      lbl: `${dd < 0 ? "OVERDUE" : dd + "d to deadline"} — ${pr.name || "Untitled"}`,
      sub: `Stage: ${pr.stage} · next: ${NEXT[pr.stage]}`,
      tag: "Deadline",
      target: { kind: "project", id: pr.id },
    });
  });
  taskList
    .filter((t) => !t.done && dFromNow(t.due) != null && (dFromNow(t.due) as number) <= 0)
    .forEach((t) =>
      queue.push({
        w: 4,
        cls: "",
        lbl: t.title || "Task",
        sub: (dFromNow(t.due) as number) < 0 ? "overdue" : "due today",
        tag: "Task",
        target: taskTarget(t),
      }),
    );
  acctList
    .filter((a) => a.nextAction && dFromNow(a.nextDate) != null && (dFromNow(a.nextDate) as number) <= 0)
    .forEach((a) =>
      queue.push({
        w: 5,
        cls: "",
        lbl: `${a.nextAction} — ${a.name || "Lead"}`,
        sub: "follow-up due",
        tag: "Pipeline",
        target: { kind: "account", id: a.id },
      }),
    );
  queue.sort((a, b) => a.w - b.w);

  return {
    projList,
    acctList,
    activeProjects,
    totRev,
    totCost,
    totExp,
    net,
    outstanding,
    cashEvents,
    expected30,
    monthBuckets,
    leads,
    outreachWk,
    outreachTarget,
    behindOutreach,
    deadlinesSoon,
    queue,
    alerts: queue.length,
  };
};

export { PIPE };
