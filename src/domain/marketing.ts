/**
 * Marketing & growth analytics — the demand side of the business.
 *
 * Pure derivations over the workspace: the sales funnel (leads → proposals →
 * won → delivered), lead-source attribution (which channels actually produce
 * won deals and revenue), and a roll-up of the content calendar. No new data —
 * it reads accounts, projects (with their finance) and content.
 */
import { STAGES } from "./constants";
import { committed, projFin } from "./finance";
import { dAgo, dFromNow } from "./format";
import type { Account, Company, ContentItem, Project } from "./types";

export interface FunnelStage {
  label: string;
  count: number;
}

export interface ChannelRow {
  source: string;
  leads: number;
  won: number;
  revenue: number;
  winRate: number;
}

export interface MarketingMetrics {
  funnel: FunnelStage[];
  leadToWon: number; // % of clients with a committed project
  channels: ChannelRow[];
  contentByStatus: Record<string, number>;
  upcoming: ContentItem[]; // future scheduled, soonest first
  overdue: ContentItem[]; // scheduled but the date has passed
  postedThisWeek: number;
  postedLastWeek: number;
}

const WON = STAGES.indexOf("Won");
const stageOf = (p: Project) => STAGES.indexOf(p.stage);

export function marketingMetrics(
  accounts: Account[],
  projects: Project[],
  company: Company,
  content: ContentItem[] = [],
): MarketingMetrics {
  const live = projects.filter((p) => !p.lost);
  const proposals = live.filter((p) => stageOf(p) >= 0 && stageOf(p) < WON).length;
  const won = live.filter((p) => committed(p) && p.stage !== "Delivered").length;
  const delivered = projects.filter((p) => p.stage === "Delivered").length;

  const funnel: FunnelStage[] = [
    { label: "Leads", count: accounts.length },
    { label: "Proposals", count: proposals },
    { label: "Won", count: won },
    { label: "Delivered", count: delivered },
  ];

  // Which accounts converted (have any committed project) + their revenue.
  const byAccount = new Map<string, { won: boolean; revenue: number }>();
  accounts.forEach((a) => byAccount.set(a.id, { won: false, revenue: 0 }));
  projects.forEach((p) => {
    const e = byAccount.get(p.accountId);
    if (!e || !committed(p)) return;
    e.won = true;
    e.revenue += projFin(p, company).rev;
  });
  const wonAccounts = [...byAccount.values()].filter((e) => e.won).length;
  const leadToWon = accounts.length ? (wonAccounts / accounts.length) * 100 : 0;

  // Group by lead source.
  const groups = new Map<string, ChannelRow>();
  accounts.forEach((a) => {
    const source = (a.source || "").trim() || "Unknown";
    const row = groups.get(source) || { source, leads: 0, won: 0, revenue: 0, winRate: 0 };
    const e = byAccount.get(a.id)!;
    row.leads += 1;
    if (e.won) row.won += 1;
    row.revenue += e.revenue;
    groups.set(source, row);
  });
  const channels = [...groups.values()]
    .map((r) => ({ ...r, winRate: r.leads ? (r.won / r.leads) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue || b.won - a.won);

  const contentByStatus: Record<string, number> = {};
  content.forEach((c) => (contentByStatus[c.status] = (contentByStatus[c.status] || 0) + 1));

  const upcoming = content
    .filter((c) => c.status === "scheduled" && c.date && (dFromNow(c.date) ?? -1) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const overdue = content
    .filter((c) => c.status === "scheduled" && c.date && (dFromNow(c.date) ?? 0) < 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const postedIn = (lo: number, hi: number) =>
    content.filter((c) => c.status === "posted" && c.date && (() => { const a = dAgo(c.date); return a != null && a >= lo && a <= hi; })()).length;

  return { funnel, leadToWon, channels, contentByStatus, upcoming, overdue, postedThisWeek: postedIn(0, 6), postedLastWeek: postedIn(7, 13) };
}
