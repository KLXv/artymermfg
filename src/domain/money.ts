/**
 * The money engine — forward cash, receivables risk, and margin health.
 *
 * Pure and tested. Three concerns the original surfaced only as flat totals:
 *  - cashFlowForecast: monthly inflow (scheduled deposits/balances) vs the
 *                      overhead burn, as a running cumulative position — the
 *                      runway picture.
 *  - receivablesAging: outstanding committed receivables bucketed by how
 *                      overdue they are, so cash at risk is visible.
 *  - marginAnalysis:   per-project and blended margin, worst-first, flagging
 *                      thin work.
 */
import { today as todayFn } from "./factories";
import { bal, committed, dep, owed, projFin } from "./finance";
import { dFromNow, num } from "./format";
import type { Company, Expense, Project } from "./types";

/** Sum of the overhead ledger — treated as a monthly burn. */
export const monthlyBurn = (expenses: Expense[]): number =>
  expenses.reduce((a, e) => a + num(e.amount), 0);

const monthKeys = (n: number, todayStr: string): string[] => {
  const d = new Date(todayStr + "T00:00:00");
  d.setDate(1);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

export interface CashMonth {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

interface ScheduledInflow {
  date: string;
  amount: number;
}

/** All committed, unpaid deposit/balance amounts with their expected dates. */
export const scheduledInflows = (projList: Project[], company: Company): ScheduledInflow[] => {
  const out: ScheduledInflow[] = [];
  projList.forEach((p) => {
    if (!committed(p)) return;
    if (!p.depositPaid) out.push({ date: p.depositExpected || p.deadline || "", amount: dep(p, company) });
    if (!p.balancePaid) out.push({ date: p.balanceExpected || p.deadline || "", amount: bal(p, company) });
  });
  return out;
};

/**
 * Monthly cash projection. Inflows are scheduled receivables bucketed by month
 * (anything already due/overdue/undated lands in the first month so it isn't
 * lost); outflow is the overhead burn each month. Cumulative is the running
 * position from a zero start — the slope is the runway.
 */
export const cashFlowForecast = (
  projList: Project[],
  expenses: Expense[],
  company: Company,
  monthsAhead = 6,
  todayStr: string = todayFn(),
): CashMonth[] => {
  const months = monthKeys(monthsAhead, todayStr);
  const first = months[0];
  const burn = monthlyBurn(expenses);
  const inflowByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));

  scheduledInflows(projList, company).forEach(({ date, amount }) => {
    let key = date ? date.slice(0, 7) : first;
    if (key < first) key = first; // pull overdue/undated into the first month
    if (key in inflowByMonth) inflowByMonth[key] += amount;
  });

  let cumulative = 0;
  return months.map((month) => {
    const inflow = inflowByMonth[month];
    const outflow = burn;
    const net = inflow - outflow;
    cumulative += net;
    return { month, inflow: Math.round(inflow), outflow: Math.round(outflow), net: Math.round(net), cumulative: Math.round(cumulative) };
  });
};

export interface AgingBucket {
  amount: number;
  count: number;
}

export interface Receivables {
  notDue: AgingBucket;
  d0_30: AgingBucket;
  d31_60: AgingBucket;
  d60plus: AgingBucket;
  totalOverdue: number;
  total: number;
}

const empty = (): AgingBucket => ({ amount: 0, count: 0 });
const add = (b: AgingBucket, amt: number) => {
  b.amount += amt;
  b.count += 1;
};

/**
 * Bucket outstanding committed receivables by how overdue their expected
 * payment date is. Undated and future-dated amounts are "not due"; the rest
 * age 0–30 / 31–60 / 60+.
 */
export const receivablesAging = (
  projList: Project[],
  company: Company,
  todayStr: string = todayFn(),
): Receivables => {
  void todayStr; // dFromNow is anchored to today() internally
  const r: Receivables = {
    notDue: empty(),
    d0_30: empty(),
    d31_60: empty(),
    d60plus: empty(),
    totalOverdue: 0,
    total: 0,
  };
  projList.forEach((p) => {
    if (!committed(p)) return;
    const items: { amount: number; date: string }[] = [];
    if (!p.depositPaid) items.push({ amount: dep(p, company), date: p.depositExpected || p.deadline || "" });
    if (!p.balancePaid) items.push({ amount: bal(p, company), date: p.balanceExpected || p.deadline || "" });
    items.forEach(({ amount, date }) => {
      r.total += amount;
      const d = date ? dFromNow(date) : null;
      if (d == null || d >= 0) {
        add(r.notDue, amount);
        return;
      }
      const overdue = -d;
      r.totalOverdue += amount;
      if (overdue <= 30) add(r.d0_30, amount);
      else if (overdue <= 60) add(r.d31_60, amount);
      else add(r.d60plus, amount);
    });
  });
  return r;
};

export interface MarginRow {
  project: Project;
  rev: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface MarginAnalysis {
  rows: MarginRow[];
  blendedMargin: number;
  thinCount: number;
  thinThreshold: number;
}

/**
 * Per-project margin, worst-first among open work, plus the blended margin
 * across all projects and a count of projects below the thin-margin threshold.
 */
export const marginAnalysis = (
  projList: Project[],
  company: Company,
  thinThreshold = 30,
): MarginAnalysis => {
  const rows: MarginRow[] = projList
    .map((p) => {
      const fin = projFin(p, company);
      return { project: p, ...fin };
    })
    .filter((r) => r.rev > 0)
    .sort((a, b) => a.margin - b.margin);

  const totRev = rows.reduce((a, r) => a + r.rev, 0);
  const totProfit = rows.reduce((a, r) => a + r.profit, 0);
  const blendedMargin = totRev ? (totProfit / totRev) * 100 : 0;
  const thinCount = rows.filter((r) => !r.project.lost && r.margin < thinThreshold).length;

  return { rows, blendedMargin, thinCount, thinThreshold };
};

/** Outstanding receivables across all committed work (= Σ owed). */
export const totalOutstanding = (projList: Project[], company: Company): number =>
  projList.reduce((a, p) => a + owed(p, company), 0);
