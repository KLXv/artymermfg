/** Domain constants — ported verbatim from ArtymerCockpit.jsx. */

export const PIPE = ["Proposal", "Negotiating", "Won"] as const;
export const PROD = [
  "Brief",
  "Design",
  "CAD",
  "Deposit",
  "Tooling",
  "First-off",
  "Production",
  "QC",
  "Shipped",
  "Delivered",
] as const;
export const STAGES: string[] = [...PIPE, ...PROD];

export const NEXT: Record<string, string> = {
  Proposal: "Send the proposal",
  Negotiating: "Close the deal",
  Won: "Open brief · collect deposit",
  Brief: "Finalize the design",
  Design: "Get CAD approval",
  CAD: "Collect deposit",
  Deposit: "Authorize tooling",
  Tooling: "Await first-off",
  "First-off": "Approve the sample",
  Production: "Await QC media",
  QC: "Review QC · release balance",
  Shipped: "Confirm delivery",
  Delivered: "Document · pursue repeat",
};

export const QC_CHECKS: [string, string][] = [
  ["caliber", "Caliber"],
  ["sample", "Vs sample"],
  ["center", "Centering"],
  ["align", "Hand align"],
  ["clean", "Cleanliness"],
  ["engrave", "Engraving"],
  ["sweep", "Sweep"],
];

export const ACCT_TYPES = ["Company", "Sports club", "Federation", "Military / LE", "Community", "Other"];
export const ACCT_STATUS = ["prospect", "active", "dormant", "lost"];
export const MARKETS = ["RO", "HU", "EU", "Other"];
export const SERVICE = ["Commission", "Private label"];
export const SUPP_STATUS = ["Primary", "Backup", "Warming", "Retired"];

/** Where leads come from — used for source attribution + channel analytics. */
export const LEAD_SOURCES = [
  "Instagram",
  "TikTok",
  "Referral",
  "Word of mouth",
  "Trade show",
  "Cold outreach",
  "Website",
  "Press",
  "Other",
];

/** Marketing content calendar vocabularies. */
export const CONTENT_CHANNELS = ["Instagram", "TikTok", "YouTube", "Email", "Outreach", "Website", "Press", "Other"];
export const CONTENT_STATUS = ["idea", "drafting", "scheduled", "posted"] as const;
