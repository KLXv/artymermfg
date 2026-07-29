import { describe, expect, it } from "vitest";
import { blankProspect } from "./factories";
import {
  CASE_STUDIES,
  detectLang,
  isTouchDue,
  linkedinSearchUrl,
  outboundMetrics,
  parseCockpitExport,
  parseDiscovery,
  parseDrafts,
  promoteFields,
} from "./outreach";
import type { OutboundDraft, Prospect } from "./types";

const REF = "2026-07-14";

const prospect = (over: Partial<Prospect> = {}): Prospect => ({ ...blankProspect(), ...over });
const draft = (over: Partial<OutboundDraft> = {}): OutboundDraft => ({
  touch: 1,
  channel: "Email",
  subject: "s",
  body: "b",
  lang: "EN",
  status: "draft",
  approvedDate: "",
  sentDate: "",
  ...over,
});

/* ---- proof points ----------------------------------------------------- */

describe("CASE_STUDIES", () => {
  it("cites LóFő", () => {
    expect(CASE_STUDIES.map((c) => c.name)).toContain("LóFő");
  });

  // Hard rule: HFN hasn't shipped, and cold outreach is public-facing.
  it("does NOT cite HFN anywhere", () => {
    const blob = JSON.stringify(CASE_STUDIES).toLowerCase();
    expect(blob).not.toContain("hfn");
    expect(blob).not.toContain("harghita");
  });
});

/* ---- language detection ------------------------------------------------ */

describe("detectLang", () => {
  it("maps the HU market to Hungarian", () => {
    expect(detectLang("HU", "Budapest")).toBe("HU");
  });

  it("treats Székelyföld cities in Romania as Hungarian-speaking", () => {
    expect(detectLang("RO", "Miercurea Ciuc")).toBe("HU");
    expect(detectLang("RO", "Odorheiu Secuiesc")).toBe("HU");
    expect(detectLang("RO", "Sfântu Gheorghe")).toBe("HU");
  });

  it("is case- and whitespace-insensitive on the city", () => {
    expect(detectLang("RO", "  miercurea ciuc  ")).toBe("HU");
  });

  it("defaults the rest of Romania to Romanian", () => {
    expect(detectLang("RO", "Cluj-Napoca")).toBe("RO");
    expect(detectLang("RO", "")).toBe("RO");
  });

  it("falls back to English outside RO/HU", () => {
    expect(detectLang("EU", "Vienna")).toBe("EN");
    expect(detectLang("Other", "Tokyo")).toBe("EN");
  });
});

/* ---- LinkedIn (manual only) -------------------------------------------- */

describe("linkedinSearchUrl", () => {
  it("builds a people-search URL from org + role, URL-encoded", () => {
    const url = linkedinSearchUrl(prospect({ org: "Lófő SE", role: "HR Director" }));
    expect(url.startsWith("https://www.linkedin.com/search/results/people/?keywords=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Lófő SE HR Director"));
  });

  it("falls back to the contact name when org and role are blank", () => {
    expect(linkedinSearchUrl(prospect({ org: "", role: "", name: "Anna" }))).toContain("Anna");
  });
});

/* ---- promote to client -------------------------------------------------- */

describe("promoteFields", () => {
  it("carries the org, contact and market onto the account", () => {
    const f = promoteFields(
      prospect({ org: "Acme Kft", name: "Anna", role: "HR", email: "a@acme.hu", phone: "+36", market: "HU" }),
    );
    expect(f.name).toBe("Acme Kft");
    expect(f.contactName).toBe("Anna");
    expect(f.contactRole).toBe("HR");
    expect(f.email).toBe("a@acme.hu");
    expect(f.market).toBe("HU");
    expect(f.status).toBe("prospect");
    expect(f.source).toBe("Cold outreach");
  });

  it("routes a Private Label segment to the private-label offer", () => {
    expect(promoteFields(prospect({ segment: "Private Label" })).servicePath).toBe("Private label");
    expect(promoteFields(prospect({ segment: "Sports Club" })).servicePath).toBe("Commission");
  });

  it("keeps the signal and source URL in the notes, and stamps last contact from the newest touch", () => {
    const f = promoteFields(
      prospect({
        signal: "125th anniversary in 2026",
        sourceUrl: "https://example.org/about",
        touches: ["2026-07-01", "2026-07-08", "", "", ""],
      }),
    );
    expect(f.notes).toContain("125th anniversary in 2026");
    expect(f.notes).toContain("https://example.org/about");
    expect(f.lastContact).toBe("2026-07-08");
  });

  it("falls back to the contact name when the org is blank", () => {
    expect(promoteFields(prospect({ org: "", name: "Anna" })).name).toBe("Anna");
  });
});

/* ---- cadence ------------------------------------------------------------ */

describe("isTouchDue", () => {
  it("is due when never contacted", () => {
    expect(isTouchDue(prospect({ status: "Not Contacted" }), REF)).toBe(true);
  });

  it("is not due inside the gap, and due once the gap elapses", () => {
    // Touch 1 → Touch 2 gap is 3 days.
    const recent = prospect({ status: "Contacted", touches: ["2026-07-12", "", "", "", ""] });
    expect(isTouchDue(recent, REF)).toBe(false); // 2 days ago
    const older = prospect({ status: "Contacted", touches: ["2026-07-11", "", "", "", ""] });
    expect(isTouchDue(older, REF)).toBe(true); // 3 days ago
  });

  it("never chases a resolved prospect", () => {
    const closed = prospect({ status: "Closed Won", touches: ["2026-01-01", "", "", "", ""] });
    expect(isTouchDue(closed, REF)).toBe(false);
    expect(isTouchDue({ ...closed, status: "Closed Lost" }, REF)).toBe(false);
    expect(isTouchDue({ ...closed, status: "Nurture" }, REF)).toBe(false);
  });

  it("stops once the 5-touch cadence is exhausted", () => {
    const done = prospect({
      status: "Contacted",
      touches: ["2026-01-01", "2026-01-04", "2026-01-08", "2026-01-15", "2026-01-29"],
    });
    expect(isTouchDue(done, REF)).toBe(false);
  });
});

/* ---- metrics ------------------------------------------------------------ */

describe("outboundMetrics", () => {
  it("counts only touches logged in the last 7 days as sent this week", () => {
    const list = [
      prospect({ touches: ["2026-07-13", "", "", "", ""] }), // 1 day ago  ✓
      prospect({ touches: ["2026-07-08", "", "", "", ""] }), // 6 days ago ✓
      prospect({ touches: ["2026-07-07", "", "", "", ""] }), // 7 days ago ✗
      prospect({ touches: ["2026-08-01", "", "", "", ""] }), // future     ✗
    ];
    expect(outboundMetrics(list, 15, REF).sentThisWeek).toBe(2);
  });

  it("counts approved-but-unsent drafts as the ready-to-send backlog", () => {
    const list = [
      prospect({ drafts: [draft({ status: "approved" }), draft({ touch: 2, status: "sent" }), draft({ touch: 3 })] }),
      prospect({ drafts: [draft({ status: "approved" })] }),
    ];
    expect(outboundMetrics(list, 15, REF).approvedPending).toBe(2);
  });

  it("reports every status in canonical order, and counts only open ones as open", () => {
    const list = [
      prospect({ status: "Not Contacted" }),
      prospect({ status: "Contacted" }),
      prospect({ status: "Contacted" }),
      prospect({ status: "Closed Won" }),
      prospect({ status: "Nurture" }),
    ];
    const m = outboundMetrics(list, 15, REF);
    expect(m.byStatus.map((s) => s.status)).toEqual([
      "Not Contacted",
      "Contacted",
      "Responded",
      "Concept Sent",
      "Negotiating",
      "Closed Won",
      "Closed Lost",
      "Nurture",
    ]);
    expect(m.byStatus.find((s) => s.status === "Contacted")?.count).toBe(2);
    expect(m.openCount).toBe(3); // Closed Won + Nurture are not open
  });

  it("passes the target through and counts the cadence backlog", () => {
    const m = outboundMetrics([prospect({ status: "Not Contacted" })], 15, REF);
    expect(m.target).toBe(15);
    expect(m.dueCount).toBe(1);
  });
});

/* ---- Discovery parsing --------------------------------------------------- */

describe("parseDiscovery", () => {
  const block = (json: string) => `Here is what I found.\n\n\`\`\`artymer-candidates\n${json}\n\`\`\``;

  it("extracts and normalizes candidates from the fenced block", () => {
    const out = parseDiscovery(
      block(
        JSON.stringify({
          candidates: [
            {
              org: "Lófő SE",
              segment: "Sports Club",
              city: "Miercurea Ciuc",
              market: "RO",
              signal: "Promoted to Liga I in 2026",
              signalType: "championship",
              sourceUrl: "https://example.org/news",
              contactHint: "club president",
              rationale: "Milestone worth commemorating",
            },
          ],
        }),
      ),
    );
    expect(out).toHaveLength(1);
    expect(out[0].org).toBe("Lófő SE");
    expect(out[0].sourceUrl).toBe("https://example.org/news");
    expect(out[0].status).toBe("pending"); // always lands in the review queue
    expect(out[0].id).toBeTruthy();
  });

  it("drops candidates missing an org or a signal", () => {
    const out = parseDiscovery(
      block(JSON.stringify({ candidates: [{ org: "", signal: "x" }, { org: "Y", signal: "" }, { org: "Z", signal: "real" }] })),
    );
    expect(out.map((c) => c.org)).toEqual(["Z"]);
  });

  it("defaults an unknown market and signal type", () => {
    const out = parseDiscovery(block(JSON.stringify({ candidates: [{ org: "A", signal: "s", market: "XX" }] })));
    expect(out[0].market).toBe("RO");
    expect(out[0].signalType).toBe("other");
  });

  it("returns nothing for prose, malformed JSON, or an unrelated fence", () => {
    expect(parseDiscovery("no fence at all")).toEqual([]);
    expect(parseDiscovery(block("{not json"))).toEqual([]);
    expect(parseDiscovery("```json\n{\"other\":[1]}\n```")).toEqual([]);
  });
});

/* ---- Drafting parsing ---------------------------------------------------- */

describe("parseDrafts", () => {
  const block = (json: string) => `\`\`\`artymer-drafts\n${json}\n\`\`\``;

  it("extracts the sequence and stamps language, channel and draft status", () => {
    const out = parseDrafts(
      block(JSON.stringify({ drafts: [{ touch: 1, subject: "S1", body: "B1" }, { touch: 2, subject: "S2", body: "B2" }] })),
      "HU",
      "Email",
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ touch: 1, subject: "S1", body: "B1", lang: "HU", channel: "Email", status: "draft" });
    expect(out[0].sentDate).toBe(""); // nothing is sent at parse time
  });

  it("drops drafts with no body and caps the sequence at five", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ touch: i + 1, subject: "s", body: "b" }));
    expect(parseDrafts(block(JSON.stringify({ drafts: many })), "EN", "Email")).toHaveLength(5);
    expect(parseDrafts(block(JSON.stringify({ drafts: [{ touch: 1, body: "" }] })), "EN", "Email")).toEqual([]);
  });

  it("returns nothing when the model produced no usable block", () => {
    expect(parseDrafts("sorry, I could not", "EN", "Email")).toEqual([]);
  });
});

/* ---- PROSPECTOR import ---------------------------------------------------- */

describe("parseCockpitExport", () => {
  const lead = (over: Record<string, unknown> = {}) => ({
    org: "Sportklub Csíkszereda",
    score: 87,
    path: "Commission",
    category: "Sports club",
    county: "Harghita",
    revenueRon: 6200000,
    employees: 40,
    foundingYear: 1976,
    anniversaryYears: 50,
    trigger: "50th anniversary in 2026",
    triggerSourceUrl: "https://szekelyhon.ro/x",
    cashTimingRisk: "LOW",
    decisionStructure: "Small leadership team (2–4)",
    language: "Hungarian",
    projectValueEur: 7500,
    suggestedUnits: 50,
    website: "https://club.ro",
    brief: "## Sportklub\n\nfull brief here",
    ...over,
  });
  const doc = (leads: unknown[]) => JSON.stringify({ source: "prospector", version: 1, leads });

  it("maps a lead into a scored candidate carrying the full prospector blob", () => {
    const [c] = parseCockpitExport(doc([lead()]));
    expect(c.org).toBe("Sportklub Csíkszereda");
    expect(c.score).toBe(87);
    expect(c.source).toBe("prospector");
    expect(c.status).toBe("pending"); // still lands in the review queue
    expect(c.signal).toBe("50th anniversary in 2026");
    expect(c.sourceUrl).toBe("https://szekelyhon.ro/x");
    expect(c.signalType).toBe("anniversary"); // inferred from anniversaryYears
    expect(c.prospector?.revenueRon).toBe(6200000);
    expect(c.prospector?.path).toBe("Commission");
    expect(c.prospector?.brief).toContain("full brief here");
  });

  it("infers the HU market from a Hungarian language label when market is absent", () => {
    expect(parseCockpitExport(doc([lead()]))[0].market).toBe("HU");
    expect(parseCockpitExport(doc([lead({ language: "Romanian" })]))[0].market).toBe("RO");
    expect(parseCockpitExport(doc([lead({ market: "EU" })]))[0].market).toBe("EU"); // explicit wins
  });

  it("normalizes path, cash-risk and design-hours to known values", () => {
    const [c] = parseCockpitExport(doc([lead({ path: "Private Label", cashTimingRisk: "HIGH", designHours: "HIGH" })]));
    expect(c.prospector?.path).toBe("Private label");
    expect(c.prospector?.cashTimingRisk).toBe("HIGH");
    expect(c.prospector?.designHours).toBe("HIGH");
  });

  it("flags a disqualified lead in the rationale", () => {
    const [c] = parseCockpitExport(doc([lead({ disqualified: true })]));
    expect(c.prospector?.disqualified).toBe(true);
    expect(c.rationale).toMatch(/disqualified/i);
  });

  it("requires org + numeric score, and defaults the rest", () => {
    const out = parseCockpitExport(
      doc([{ org: "", score: 50 }, { org: "NoScore" }, { org: "Minimal", score: 40 }]),
    );
    expect(out.map((c) => c.org)).toEqual(["Minimal"]);
    expect(out[0].prospector?.revenueRon).toBeNull();
    expect(out[0].prospector?.brief).toBe("");
  });

  it("returns [] for malformed JSON, a non-array leads field, or a wrong shape", () => {
    expect(parseCockpitExport("{bad")).toEqual([]);
    expect(parseCockpitExport(JSON.stringify({ leads: "nope" }))).toEqual([]);
    expect(parseCockpitExport(JSON.stringify({ other: [1] }))).toEqual([]);
  });

  it("accepts an already-parsed object too", () => {
    expect(parseCockpitExport({ leads: [lead()] })).toHaveLength(1);
  });
});
