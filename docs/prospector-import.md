# PROSPECTOR → Cockpit import contract

PROSPECTOR (the separate Python lead-gen pipeline) is the **data engine**: it
enumerates the bounded Hungarian-Romanian universe, enriches with real financial
filings, scores against the rubric, and writes briefs. Cockpit is the
**workspace**: review the ranked leads, approve the ones worth Illustrator hours,
promote to client, draft outreach, track status.

The bridge is a single file. PROSPECTOR emits **`cockpit.json`** alongside its
CSV/briefs; Cockpit's Outbound → Discovery screen imports it into the review
queue. Nothing enters the funnel without a human approval — same rule as before.

**Ownership boundary (do not violate):** Cockpit owns funnel state (status,
touches, drafts, promote-to-client). PROSPECTOR is stateless about the funnel —
it ranks and describes, it does not track what was done. On import, a lead that
already exists in Cockpit (matched by `org` name) is **skipped**, so contacted
leads never resurface as new. PROSPECTOR's own `status` field is for its local
CSV only and is ignored on import.

## File shape — `cockpit.json`

```json
{
  "source": "prospector",
  "version": 1,
  "generatedAt": "2026-07-22",
  "leads": [
    {
      "org": "Sportklub Csíkszereda",          // required
      "score": 87,                              // required, 0–100
      "path": "Commission",                     // "Commission" | "Private label" | ""
      "category": "Sports club",
      "county": "Harghita",
      "market": "RO",                            // RO | HU | EU | Other (default RO)
      "language": "Hungarian",                   // Hungarian | Bilingual | Romanian
      "revenueRon": 6200000,                     // number | null
      "employees": 40,                           // number | null
      "foundingYear": 1976,                      // number | null
      "anniversaryYears": 50,                    // number | null (2026 − foundingYear when a milestone)
      "trigger": "50th anniversary in 2026",     // the occasion to buy
      "triggerSourceUrl": "https://szekelyhon.ro/...",
      "cashTimingRisk": "LOW",                   // LOW | HIGH | UNKNOWN | ""
      "decisionStructure": "Small leadership team (2–4)",
      "identityScore": 5,                        // 0–5 | null
      "designHours": "LOW",                      // LOW | HIGH | ""
      "logoVectorAvailable": true,
      "logoSourceUrl": "https://...",
      "projectValueEur": 7500,                   // number | null
      "suggestedUnits": 50,                      // number | null
      "contactRoute": "office@... (VERIFY_MANUALLY)",
      "website": "https://...",
      "social": "https://facebook.com/...",
      "disqualified": false,                     // affordability hard-gate failed
      "breakdown": {                             // per-rubric points, for the score breakdown UI
        "affordability": 30, "cashflow": 15, "trigger": 25,
        "category": 15, "decision": 7, "language": 5, "identity": 5
      },
      "brief": "## Sportklub Csíkszereda\n\n..."  // full markdown brief; only the top ~10 carry one
    }
  ]
}
```

### Field notes

- **`org` and `score` are the only required fields.** Everything else may be
  `null`/`""`/omitted; the importer fills defaults. This keeps the contract
  robust if a collector degrades.
- **`brief`** is the artifact the operator works from — inline the top-10 briefs
  here as markdown strings. Leads outside the top 10 may omit it.
- Sort is by `score` — Cockpit re-sorts on its own, so array order is not
  load-bearing.
- `market` drives draft language on the Cockpit side; if you only know
  `language`, send `RO` for market and let Cockpit's `detectLang` refine it
  (Székelyföld cities → Hungarian), or send `HU` when the org is HU-primary.

## What Cockpit does with it

1. **Import** → each lead becomes a `DiscoveryCandidate` in the review queue,
   carrying the full `prospector` blob (score, financials, brief, breakdown).
2. Operator reviews ranked-by-score, reads the brief, **approves** the ones worth
   pursuing (his ≤10/week ceiling is the point) → each approved candidate becomes
   a `Prospect`, blob and brief intact.
3. From there: promote to client, draft Touch 1–5, track status — all existing.

## Later: direct push (Phase 2 of the bridge)

When the file round-trip gets tedious, PROSPECTOR gains a `push` command that
writes the same lead objects straight into the Supabase `discovery_candidates`
table (same columns Cockpit's mapper reads), so leads appear live with no import
step. The JSON contract above is the same payload — only the transport changes.
