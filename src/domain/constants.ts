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

/* ---- Outbound Engine ------------------------------------------------- */

/** The cold-outbound funnel, in order. Drives the pipeline board + dashboard. */
export const PROSPECT_STATUS = [
  "Not Contacted",
  "Contacted",
  "Responded",
  "Concept Sent",
  "Negotiating",
  "Closed Won",
  "Closed Lost",
  "Nurture",
] as const;

/** Statuses that count as an active/open prospect (not yet resolved). */
export const PROSPECT_OPEN: readonly string[] = [
  "Not Contacted",
  "Contacted",
  "Responded",
  "Concept Sent",
  "Negotiating",
];

/** Where a prospect is reached. LinkedIn is manual-only (no automation, ever). */
export const OUTBOUND_CHANNELS = ["Email", "LinkedIn", "Phone", "Instagram", "Other"];

/** The trigger signals the Discovery Agent hunts for. */
export const SIGNAL_TYPES = ["anniversary", "championship", "founding", "expansion", "award", "other"];

/** Default org size bands (editable in ICP config). */
export const DEFAULT_SIZE_BANDS = ["1–10", "10–50", "50–200", "200+"];

/** The four seed ICP segments — editable data, not hardcoded behaviour. */
export const DEFAULT_ICP_SEGMENTS: {
  name: string;
  servicePath: "Commission" | "Private label";
  signals: string;
  notes: string;
}[] = [
  {
    name: "Company/HR",
    servicePath: "Commission",
    signals: "Company anniversary (round year), IPO/funding, major award, HQ move",
    notes: "Firms marking a milestone who want a meaningful staff/leadership gift.",
  },
  {
    name: "Sports Club",
    servicePath: "Commission",
    signals: "Championship win, promotion, club founding anniversary, cup final",
    notes: "Clubs/federations commemorating a title or milestone for players & staff.",
  },
  {
    name: "Institution",
    servicePath: "Commission",
    signals: "Founding anniversary, jubilee, notable appointment, centenary",
    notes: "Universities, guilds, municipalities, professional bodies marking a jubilee.",
  },
  {
    name: "Private Label",
    servicePath: "Private label",
    signals: "New brand launch, product-line expansion, retail rollout",
    notes: "Brands wanting their own-branded watch line produced under their name.",
  },
];
