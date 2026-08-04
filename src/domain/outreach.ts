/**
 * Outbound Engine — the pure logic layer for cold prospecting.
 *
 * Framework-free and testable, like every other `src/domain/*` module. Covers:
 * ICP → Discovery Agent prompting + parsing, per-prospect Drafting Agent
 * prompting + parsing, language detection, the touch cadence, promote-to-client,
 * the LinkedIn *manual* search URL (never automation), and dashboard metrics.
 *
 * Safety model mirrors `operator.ts`: the agents only ever emit fenced JSON that
 * this module parses and validates. Nothing here mutates state or sends anything
 * — Discovery output lands in a review queue, Drafts land in an approval queue.
 */
import { today } from "./factories";
import { parseD } from "./format";
import { LANG_NAME } from "./i18n";
import { PROSPECT_OPEN, PROSPECT_STATUS } from "./constants";
import type {
  Account,
  DiscoveryCandidate,
  IcpConfig,
  Lang,
  Market,
  OutboundDraft,
  Prospect,
  ProspectStatus,
  ProspectorData,
  ServicePath,
} from "./types";

/* ---- Proof points ---------------------------------------------------- */

/**
 * The ONLY case study cleared for public-facing outreach copy.
 *
 * HFN (Harghita Fight Night) is deliberately EXCLUDED: the project hasn't
 * shipped, and presenting it publicly is a factual/trust violation (confirmed
 * with Bence, 2026-07). Cold outreach is public-facing, so no HFN here. When
 * HFN actually ships, add it below.
 */
export const CASE_STUDIES: { name: string; proof: string }[] = [
  { name: "LóFő", proof: "15 bespoke pieces designed, produced and delivered — full spec + QC on every unit." },
];

/* ---- Cadence --------------------------------------------------------- */

/** Days after Touch 1 that each subsequent touch is due (fixed schedule). */
export const TOUCH_INTERVALS = [0, 3, 7, 14, 28] as const;

/**
 * Whole days from `date` to `ref` (negative if `date` is in the future). The
 * reference day is injectable so cadence logic is deterministic under test —
 * same convention as `planAdvance(p, tasks, today)`.
 */
const daysSince = (date: string, ref: string): number | null => {
  const d = parseD(date);
  const r = parseD(ref);
  if (!d || !r) return null;
  return Math.round((r.getTime() - d.getTime()) / 86400000);
};

/** Cities in Romania that are Hungarian-speaking (Székelyföld) → draft in HU. */
const HU_SPEAKING_RO_CITIES = [
  "miercurea ciuc",
  "csíkszereda",
  "odorheiu secuiesc",
  "székelyudvarhely",
  "sfântu gheorghe",
  "sepsiszentgyörgy",
  "târgu secuiesc",
  "gheorgheni",
  "toplița",
  "cristuru secuiesc",
];

/**
 * Detect the draft language from market + city. RO market defaults to Romanian,
 * except the Székelyföld cities which are Hungarian-speaking; HU → Hungarian;
 * everything else → English. Always operator-overridable on the prospect.
 */
export const detectLang = (market: Market, city: string): Lang => {
  if (market === "HU") return "HU";
  if (market === "RO") {
    return HU_SPEAKING_RO_CITIES.includes(city.trim().toLowerCase()) ? "HU" : "RO";
  }
  return "EN";
};

/** A pre-filled LinkedIn people-search URL for the operator to open MANUALLY. */
export const linkedinSearchUrl = (p: Prospect): string => {
  const terms = [p.org, p.role].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(terms || p.name)}`;
};

/* ---- Promote to client ----------------------------------------------- */

/**
 * Fields to graft onto a fresh `blankAccount()` when a prospect engages. The
 * caller supplies the account id (from blankAccount) and merges these over it,
 * then stamps `prospect.accountId` back. Keeps the funnels linked but distinct.
 */
export const promoteFields = (p: Prospect): Partial<Account> => {
  const seg = p.segment.toLowerCase();
  const servicePath = seg.includes("private") || seg.includes("label") ? "Private label" : "Commission";
  return {
    name: p.org || p.name,
    servicePath,
    status: "prospect",
    market: p.market,
    contactName: p.name,
    contactRole: p.role,
    email: p.email,
    phone: p.phone,
    source: "Cold outreach",
    // The outreach history comes with them. Losing what was said — and what
    // came back — at the moment a prospect becomes a client is exactly when it
    // starts mattering most.
    notes: [
      p.signal && `Signal: ${p.signal}`,
      p.sourceUrl,
      p.notes,
      ...(p.log ?? []).map((t) =>
        [`${t.date} · ${t.channel}${t.note ? ` — ${t.note}` : ""}`, t.reply && `  ↳ reply: ${t.reply}`]
          .filter(Boolean)
          .join("\n"),
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    lastContact: (p.log ?? []).map((t) => t.date).filter(Boolean).sort().slice(-1)[0] || p.touches.filter(Boolean).slice(-1)[0] || "",
  };
};

/* ---- Metrics --------------------------------------------------------- */

export interface OutboundMetrics {
  /** Touches logged as sent in the last 7 days — the weekly-target numerator. */
  sentThisWeek: number;
  target: number;
  /** Drafts approved but not yet marked sent (the ready-to-send backlog). */
  approvedPending: number;
  /** Count of prospects in each funnel status, in canonical order. */
  byStatus: { status: ProspectStatus; count: number }[];
  /** Open prospects whose next touch is due today or overdue. */
  dueCount: number;
  openCount: number;
}

/** True when a prospect's next touch (per the fixed cadence) is due/overdue. */
export const isTouchDue = (p: Prospect, ref: string = today()): boolean => {
  if (!PROSPECT_OPEN.includes(p.status)) return false;
  const done = p.touches.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  const lastIdx = done.length ? done[done.length - 1] : -1;
  if (lastIdx < 0) return true; // never contacted → due now
  if (lastIdx >= TOUCH_INTERVALS.length - 1) return false; // cadence exhausted
  const lastDate = p.touches[lastIdx];
  const gap = TOUCH_INTERVALS[lastIdx + 1] - TOUCH_INTERVALS[lastIdx];
  const since = daysSince(lastDate, ref);
  return since != null && since >= gap;
};

export const outboundMetrics = (
  prospects: Prospect[],
  target: number,
  ref: string = today(),
): OutboundMetrics => {
  let sentThisWeek = 0;
  let approvedPending = 0;
  let dueCount = 0;
  let openCount = 0;

  for (const p of prospects) {
    for (const t of p.touches) {
      const since = daysSince(t, ref);
      if (since != null && since >= 0 && since < 7) sentThisWeek += 1;
    }
    for (const d of p.drafts) if (d.status === "approved") approvedPending += 1;
    if (PROSPECT_OPEN.includes(p.status)) {
      openCount += 1;
      if (isTouchDue(p, ref)) dueCount += 1;
    }
  }

  const byStatus = PROSPECT_STATUS.map((status) => ({
    status,
    count: prospects.filter((p) => p.status === status).length,
  }));

  return { sentThisWeek, target, approvedPending, byStatus, dueCount, openCount };
};

/* ---- Discovery Agent ------------------------------------------------- */

/** Build the Discovery system prompt from the ICP config. */
export const discoverySystemPrompt = (icp: IcpConfig, existingOrgs: string[]): string => {
  const segs = icp.segments
    .filter((s) => s.enabled)
    .map((s) => `- ${s.name} (${s.servicePath}): signals to hunt — ${s.signals}. Qualifies: ${s.notes}`)
    .join("\n");
  const cities = icp.cities.length ? icp.cities.join(", ") : "any city in Romania or Hungary";
  const bands = icp.sizeBands.length ? icp.sizeBands.join(", ") : "any size";
  const exclude = existingOrgs.length ? existingOrgs.slice(0, 200).join("; ") : "(none yet)";

  return `You are the Discovery Agent for Artymer, a bespoke B2B watch design house. You find real organisations that have a SPECIFIC, TIME-SENSITIVE reason to commission commemorative watches right now, using web search to verify every signal.

Artymer's Ideal Customer Profile — segments:
${segs}

Target cities: ${cities}
Target org size bands: ${bands}

HARD RULES:
- Use web search. Every candidate MUST have a real, checkable signal with a real source URL — no guessing, no fabricated anniversaries. If you cannot find a source URL, do not include the candidate.
- The signal must be specific and dated (e.g. "founded 1901 → 125th anniversary in 2026", "won Liga Zimbrilor 2026", not "established company").
- Prefer signals landing in the next 3–12 months.
- Do NOT propose any organisation already in this exclude list (already known): ${exclude}
- Suggest WHO to approach only as a role/description (e.g. "HR Director", "club president") — never scrape or link individual LinkedIn profiles.
- Match each candidate to exactly one ICP segment by name.

Return your findings as ONE fenced block at the end (nothing after it):
\`\`\`artymer-candidates
{"candidates":[
  {"org":"...","segment":"<one of the segment names above>","city":"...","market":"RO|HU|EU|Other","signal":"the specific dated signal","signalType":"anniversary|championship|founding|expansion|award|other","sourceUrl":"https://...","contactHint":"role to approach","rationale":"one line: why now, why Artymer"}
]}
\`\`\`
Aim for quality over volume — 3 to 8 well-sourced candidates. If you find nothing verifiable, return an empty array.`;
};

const isMarket = (x: unknown): x is Market => x === "RO" || x === "HU" || x === "EU" || x === "Other";

/** Extract + validate Discovery candidates from the model's fenced reply. */
export const parseDiscovery = (text: string): DiscoveryCandidate[] => {
  const fence = /```(?:[\w-]+)?\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text))) {
    try {
      const obj = JSON.parse(m[1].trim()) as { candidates?: unknown };
      if (obj && Array.isArray(obj.candidates)) {
        return obj.candidates
          .map((c): DiscoveryCandidate | null => {
            if (!c || typeof c !== "object") return null;
            const o = c as Record<string, unknown>;
            const s = (k: string): string => (typeof o[k] === "string" ? (o[k] as string) : "");
            if (!s("org") || !s("signal")) return null;
            return {
              id: "dc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
              org: s("org"),
              segment: s("segment"),
              city: s("city"),
              market: isMarket(o.market) ? o.market : "RO",
              signal: s("signal"),
              signalType: s("signalType") || "other",
              sourceUrl: s("sourceUrl"),
              contactHint: s("contactHint"),
              rationale: s("rationale"),
              status: "pending",
              createdAt: today(),
              source: "discovery",
              score: null,
            };
          })
          .filter((x): x is DiscoveryCandidate => x !== null)
          .slice(0, 20);
      }
    } catch {
      /* not the candidates block */
    }
  }
  return [];
};

/* ---- PROSPECTOR import ------------------------------------------------ */

const cid = (): string => "dc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Map PROSPECTOR's language label to the cockpit market when market is absent. */
const marketFromLanguage = (lang: string): Market =>
  /hun|magyar/i.test(lang) ? "HU" : /rom/i.test(lang) ? "RO" : "RO";

/**
 * Parse a PROSPECTOR `cockpit.json` export (see docs/prospector-import.md) into
 * review-queue candidates. Each lead carries its full scoring blob + brief. Only
 * `org` and a numeric `score` are required; everything else defaults, so a lead
 * from a partially-degraded pipeline still imports. Returns [] on any structural
 * problem — the caller surfaces "nothing imported".
 */
export const parseCockpitExport = (raw: string | unknown): DiscoveryCandidate[] => {
  let doc: unknown;
  try {
    doc = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
  const leads = (doc as { leads?: unknown })?.leads;
  if (!Array.isArray(leads)) return [];

  return leads
    .map((l): DiscoveryCandidate | null => {
      if (!l || typeof l !== "object") return null;
      const o = l as Record<string, unknown>;
      const str = (k: string): string => (typeof o[k] === "string" ? (o[k] as string) : "");
      const numOrNull = (k: string): number | null => (typeof o[k] === "number" ? (o[k] as number) : null);
      const org = str("org");
      const score = typeof o.score === "number" ? o.score : NaN;
      if (!org || Number.isNaN(score)) return null;

      const path: ServicePath | "" = /private/i.test(str("path")) ? "Private label" : str("path") ? "Commission" : "";
      const market: Market = isMarket(o.market) ? o.market : marketFromLanguage(str("language"));

      const prospector: ProspectorData = {
        score,
        path,
        category: str("category"),
        county: str("county"),
        language: str("language"),
        revenueRon: numOrNull("revenueRon"),
        employees: numOrNull("employees"),
        foundingYear: numOrNull("foundingYear"),
        anniversaryYears: numOrNull("anniversaryYears"),
        cashTimingRisk: ["LOW", "HIGH", "UNKNOWN"].includes(str("cashTimingRisk")) ? (str("cashTimingRisk") as ProspectorData["cashTimingRisk"]) : "",
        decisionStructure: str("decisionStructure"),
        identityScore: numOrNull("identityScore"),
        designHours: ["LOW", "HIGH"].includes(str("designHours")) ? (str("designHours") as ProspectorData["designHours"]) : "",
        logoVectorAvailable: o.logoVectorAvailable === true,
        logoSourceUrl: str("logoSourceUrl"),
        projectValueEur: numOrNull("projectValueEur"),
        suggestedUnits: numOrNull("suggestedUnits"),
        contactRoute: str("contactRoute"),
        website: str("website"),
        social: str("social"),
        disqualified: o.disqualified === true,
        breakdown: o.breakdown && typeof o.breakdown === "object" ? (o.breakdown as Record<string, number>) : {},
        brief: str("brief"),
      };

      return {
        id: cid(),
        org,
        segment: prospector.category,
        city: prospector.county,
        market,
        signal: str("trigger"),
        signalType: prospector.anniversaryYears ? "anniversary" : "other",
        sourceUrl: str("triggerSourceUrl"),
        contactHint: prospector.decisionStructure || prospector.contactRoute,
        rationale: prospector.disqualified ? "DISQUALIFIED by affordability gate" : `Score ${score}/100 · ${prospector.category || "lead"}`,
        status: "pending",
        createdAt: today(),
        source: "prospector",
        score,
        prospector,
      };
    })
    .filter((x): x is DiscoveryCandidate => x !== null);
};

/* ---- Drafting Agent -------------------------------------------------- */

/** Build the Drafting system prompt for a single prospect (Touch 1–5). */
export const draftingSystemPrompt = (p: Prospect): string => {
  const langName = LANG_NAME[p.lang] || "English";
  const proof = CASE_STUDIES.map((c) => `- ${c.name}: ${c.proof}`).join("\n");
  const seg = p.segment.toLowerCase();
  const pl = seg.includes("private") || seg.includes("label");

  return `You are Artymer's outbound copywriter, writing a 5-touch cold email sequence to ONE prospect. Artymer is a bespoke B2B watch design house: one founder designs every watch and directs an OEM partner (never say "factory", "China", "handmade", or "hand-assembled").

Prospect:
- Organisation: ${p.org}
- Segment: ${p.segment}${pl ? " (Private Label — they'd sell watches under their OWN brand)" : ""}
- Contact: ${p.name || "unknown"} ${p.role ? `(${p.role})` : ""}
- City / market: ${p.city} · ${p.market}
- The signal (the reason to reach out NOW): ${p.signal || "(none given — keep it about the segment)"}

Proof points you MAY cite (and ONLY these — do not invent case studies):
${proof}

Voice: direct, premium, quietly confident, no filler, no luxury clichés, short sentences. Each touch references the specific signal above, adds one new angle, and never repeats the previous touch's opening. Touch 1 is the opener; 2–4 are follow-ups adding value/proof; 5 is a short, graceful break-up. Keep each body under ~120 words. Include a subject line per touch.

Write ENTIRELY in ${langName}, native-quality — not a translation.

Return ONE fenced block, nothing after it:
\`\`\`artymer-drafts
{"drafts":[
  {"touch":1,"subject":"...","body":"..."},
  {"touch":2,"subject":"...","body":"..."},
  {"touch":3,"subject":"...","body":"..."},
  {"touch":4,"subject":"...","body":"..."},
  {"touch":5,"subject":"...","body":"..."}
]}
\`\`\``;
};

/** Extract + validate the 5 drafts from the model's fenced reply. */
export const parseDrafts = (text: string, lang: Lang, channel: string): OutboundDraft[] => {
  const fence = /```(?:[\w-]+)?\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text))) {
    try {
      const obj = JSON.parse(m[1].trim()) as { drafts?: unknown };
      if (obj && Array.isArray(obj.drafts)) {
        return obj.drafts
          .map((d): OutboundDraft | null => {
            if (!d || typeof d !== "object") return null;
            const o = d as Record<string, unknown>;
            const body = typeof o.body === "string" ? o.body : "";
            if (!body) return null;
            const touch = typeof o.touch === "number" ? o.touch : 0;
            return {
              touch: touch >= 1 && touch <= 5 ? touch : 0,
              channel,
              subject: typeof o.subject === "string" ? o.subject : "",
              body,
              lang,
              status: "draft",
              approvedDate: "",
              sentDate: "",
            };
          })
          .filter((x): x is OutboundDraft => x !== null)
          .slice(0, 5);
      }
    } catch {
      /* not the drafts block */
    }
  }
  return [];
};
