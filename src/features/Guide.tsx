/**
 * The field manual — how to run the cockpit end to end.
 *
 * A self-contained reference (no domain dependencies): the operating
 * philosophy, a quick start, the deal→delivery stage map, a tour of every
 * sidebar section, a deep look at the project workbench tabs, and power tips.
 * Reachable from the sidebar so help is one click from anywhere.
 */
import { Panel, SectionHead, Tag } from "@/ui/kit";
import { PageHeader } from "./PageHeader";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-line bg-inset px-1.5 py-0.5 font-mono text-[12px] text-dim">{children}</span>
  );
}

/** A numbered step in the quick-start ladder. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass-dim font-mono text-[13px] text-brass">
        {n}
      </span>
      <div className="pt-0.5">
        <div className="font-disp text-[14px] font-semibold text-ink">{title}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-dim">{children}</p>
      </div>
    </div>
  );
}

/** A sidebar-section reference row. */
function Area({ glyph, name, children }: { glyph: string; name: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line/60 py-3 last:border-0">
      <span className="w-5 shrink-0 text-center text-sm text-brass" aria-hidden>
        {glyph}
      </span>
      <div>
        <div className="font-mono text-[13px] uppercase tracking-label text-ink">{name}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-dim">{children}</p>
      </div>
    </div>
  );
}

/** A project-workbench tab reference. */
function TabDoc({ name, kicker, children }: { name: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-inset p-3.5">
      <div className="flex items-baseline gap-2">
        <span className="font-disp text-[14px] font-semibold text-ink">{name}</span>
        <span className="font-mono text-[11px] uppercase tracking-label text-faint">{kicker}</span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-dim">{children}</p>
    </div>
  );
}

/** A stage chip in the deal→delivery rail. */
function Stage({ label, tone }: { label: string; tone?: "brass" | "ok" }) {
  return <Tag tone={tone ?? "neutral"}>{label}</Tag>;
}

export function Guide() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Field manual" kicker="how to run the cockpit" />

      {/* Philosophy */}
      <Panel className="p-5">
        <SectionHead title="What this is" kicker="one operator · full control" />
        <p className="text-[14px] leading-relaxed text-dim">
          The cockpit runs your watch business end to end: it turns a cold prospect into a delivered, paid commission
          without anything falling through the cracks. You hold{" "}
          <span className="text-brass">design + quality authority</span> — artwork, tolerances, the approved sample and
          QC sign-off. The factory builds to your spec. Everything here exists to make that relationship precise and
          enforceable, and to make the finished piece look the part for the client.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          It's <span className="text-ink">local-first</span>: your data lives in the browser and syncs to the cloud when
          you're signed in, so it's safe and available on every device. Work offline; it catches up.
        </p>
      </Panel>

      {/* Quick start */}
      <Panel className="p-5">
        <SectionHead title="Quick start" kicker="five minutes to your first spec" />
        <div className="flex flex-col gap-4">
          <Step n={1} title="Load the demo (optional)">
            <span className="text-faint">Settings → Load demo data</span> drops in a complete example commission so you
            can see every screen populated before entering your own. Safe to clear later.
          </Step>
          <Step n={2} title="Add a client">
            <span className="text-faint">Clients → New</span>. Capture who they are, the market, and the next action +
            date — that date is what surfaces on the Deck so you never forget a follow-up.
          </Step>
          <Step n={3} title="Open a project">
            <span className="text-faint">Projects → New</span>, attach it to the client, and pick the service path
            (Commission or Private label). The project is the workbench where the watch is designed, costed, inspected
            and documented.
          </Step>
          <Step n={4} title="Design the build">
            On the <span className="text-faint">Build</span> tab, fill the case / movement / crystal / dial spec. The
            live dial redraws as you type. Add colours, choose a finish (solid / fumé / gradient), and write a free-text
            note to the factory under any component.
          </Step>
          <Step n={5} title="Generate the paperwork">
            The <span className="text-faint">Documents</span> tab produces the production spec, trade-assurance terms and
            QC sign-off — in English or 简体中文 for the factory. Copy or download, send through the Alibaba channel, and
            you're protected.
          </Step>
        </div>
      </Panel>

      {/* Stage map */}
      <Panel className="p-5">
        <SectionHead title="The deal → delivery map" kicker="advance, don't skip" />
        <p className="mb-3 text-[13px] leading-relaxed text-dim">
          Every project moves through a fixed set of stages. The <span className="text-ink">Advance →</span> button on a
          project walks it forward and tells you the single next action. The first three are the sales funnel; the rest
          are production.
        </p>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-label text-faint">Sales</div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Stage label="Proposal" tone="brass" />
          <Stage label="Negotiating" tone="brass" />
          <Stage label="Won" tone="brass" />
        </div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-label text-faint">Production</div>
        <div className="flex flex-wrap gap-1.5">
          <Stage label="Brief" />
          <Stage label="Design" />
          <Stage label="CAD" />
          <Stage label="Deposit" />
          <Stage label="Tooling" />
          <Stage label="First-off" />
          <Stage label="Production" />
          <Stage label="QC" />
          <Stage label="Shipped" />
          <Stage label="Delivered" tone="ok" />
        </div>
      </Panel>

      {/* Sidebar tour */}
      <Panel className="p-5">
        <SectionHead title="Every section, in one line" kicker="the left rail" />
        <div>
          <Area glyph="◎" name="Deck">
            Your start-of-day screen. The action queue: overdue follow-ups, deposits to chase, QC to review, deadlines
            closing in — ranked by urgency. Clear the Deck and the business is on track. The badge counts open items.
          </Area>
          <Area glyph="⇶" name="Pipeline">
            Every live deal as a board across the stages. See where momentum is stalling and what's about to close.
          </Area>
          <Area glyph="❖" name="Projects">
            The list of all watches. Click one to open its workbench (six tabs — see below). The repeat-order button
            clones a delivered project for a re-run in one click.
          </Area>
          <Area glyph="✦" name="Clients">
            Your accounts. Contacts, market, history, testimonials, and the next-action date that feeds the Deck.
          </Area>
          <Area glyph="⛭" name="Suppliers">
            Your factories. Lead time, MOQ, golden-sample count, status (primary / backup / warming), and notes — so you
            always know who can build what, and how fast.
          </Area>
          <Area glyph="✓" name="Tasks">
            A flat to-do list, optionally linked to a project or client. Things that don't fit the stage flow live here.
          </Area>
          <Area glyph="€" name="Money">
            The cash picture: revenue booked, deposits in, balances owed, aging, and a forward forecast from your live
            deals. The per-project numbers come from the Commercial tab.
          </Area>
          <Area glyph="✺" name="Assistant">
            The AI operator. Ask it about your workspace; it can propose concrete actions (draft outreach, suggest next
            steps) that you review and apply. Requires an API key in Settings.
          </Area>
          <Area glyph="⚙" name="Settings">
            Brand + default commercial terms (deposit %, lot-fail threshold, rework cap, review window), FX rates, JSON
            backup / restore, and the demo-data button.
          </Area>
        </div>
      </Panel>

      {/* Workbench */}
      <Panel className="p-5">
        <SectionHead title="The project workbench" kicker="six tabs per watch" />
        <p className="mb-4 text-[13px] leading-relaxed text-dim">
          Open any project to reach these. Edits save instantly.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TabDoc name="Build" kicker="the spec + live dial">
            The full technical specification — case, movement, crystal, dial, engraving, finished-watch tolerances. The
            dial preview redraws live. Set the colour-rendering mode (solid / fumé / gradient), add dial colours, and
            leave free-text notes for the factory under each component.
          </TabDoc>
          <TabDoc name="Commercial" kicker="the money">
            Quantity, unit price, and the full cost build-up (movement, case, dial, assembly, freight, duty, channel
            fee). It computes per-unit profit, margin, break-even and a what-if — so you price with eyes open.
          </TabDoc>
          <TabDoc name="QC" kicker="sample → inspect → sign-off">
            Approve the first-off sample (from the factory's video/photos) before the run — that gate shows on your Deck.
            Then the per-unit checklist: each unit passes only when every check passes; the lot is rejected above your
            fail threshold. Final sign-off unlocks the balance step and is gated on an ACCEPT.
          </TabDoc>
          <TabDoc name="Presentation" kicker="the client story">
            The dossier + certificate copy: piece name, edition, the story (write it or generate with AI), highlights,
            and the client-facing language (EN / HU / RO).
          </TabDoc>
          <TabDoc name="Documents" kicker="factory paperwork">
            The production spec, trade-assurance contract terms (with the responsibility &amp; authority clause), and the
            QC sign-off — generated from your data, toggleable between English and 简体中文 for the OEM.
          </TabDoc>
          <TabDoc name="Attachments" kicker="photos + files">
            Upload reference photos (hero, dial, case, back, movement, logo) and technical files (movement-spec PDF,
            engraving vector). They flow straight into the PDF dossier and the shareable client link.
          </TabDoc>
        </div>
      </Panel>

      {/* Power tips */}
      <Panel className="p-5">
        <SectionHead title="Power moves" kicker="work faster" />
        <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-dim">
          <li>
            <Kbd>⌘K</Kbd> <span className="ml-1">opens the command palette — jump to any screen or run an action from the keyboard.</span>
          </li>
          <li>
            <span className="text-ink">Talk to your co-founder</span> — the mic button (bottom-right) is a voice partner
            that knows your live numbers. Ask "what should I do today?", "how's the money?", or "catch me up." Free to
            use; it gets even smarter if you ever add an AI key.
          </li>
          <li>
            <span className="text-ink">See money in your currency</span> — the Money screen has an EUR / RON / USD
            toggle. Set your exchange rates in Settings; lei is computed from them.
          </li>
          <li>
            <span className="text-ink">Share a client dossier</span> — the Presentation tab produces a public, read-only
            link (no login) you can send a client. It carries the hero render, story and key specs.
          </li>
          <li>
            <span className="text-ink">Bilingual factory docs</span> — switch the Documents tab to 简体中文 to hand the
            exact same governing spec to a mainland-China OEM. The English version stays the source of record.
          </li>
          <li>
            <span className="text-ink">Back up regularly</span> — Settings exports a full JSON snapshot. Even with cloud
            sync on, a periodic export is cheap insurance.
          </li>
          <li>
            <span className="text-ink">Let the Deck drive your day</span> — if you only open one screen, open the Deck.
            It already knows what's most urgent.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
