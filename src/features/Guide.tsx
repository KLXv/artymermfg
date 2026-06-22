/**
 * The field manual — how to run the cockpit end to end, and why it works.
 *
 * A self-contained reference (no domain dependencies): an educational backstory
 * that gives you the mental model, the operating philosophy, a quick start and
 * setup checklist, the deal→delivery stage map, a tour of every sidebar section,
 * a deep look at the project workbench tabs, deep dives on money / marketing /
 * strategy, power tips, and a data-&-safety section. Reachable from the sidebar
 * so the whole story is one click from anywhere.
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

/** One of the seven pillars — a numbered, glyphed card with a guiding question. */
function Pillar({ n, glyph, name, q, children }: { n: number; glyph: string; name: string; q: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-lg border border-line bg-inset p-4">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[11px] text-faint">{String(n).padStart(2, "0")}</span>
        <span className="text-brass" aria-hidden>
          {glyph}
        </span>
        <span className="font-disp text-[14px] font-semibold text-ink">{name}</span>
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-label text-faint">{q}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-dim">{children}</p>
    </div>
  );
}

/** A node in the growth-loop ribbon. */
function Loop({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="rounded-full border border-brass/40 bg-brass-dim px-3 py-1 text-[12px] text-brass">{label}</span>
      {sub && <span className="mt-1 max-w-[9rem] text-center font-mono text-[10px] uppercase tracking-label text-faint">{sub}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <span className="select-none px-1 text-brass/50" aria-hidden>
      →
    </span>
  );
}

/** A setup-checklist item with a hollow tick. */
function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-line/50 py-2.5 last:border-0">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-brass/50 text-[10px] text-brass" aria-hidden>
        ✓
      </span>
      <span className="text-[13px] leading-relaxed text-dim">{children}</span>
    </li>
  );
}

export function Guide() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Field manual" kicker="the system, end to end" />

      {/* ── THE BACKSTORY — the mental model ───────────────────────────── */}
      <Panel className="relative overflow-hidden p-6">
        <div className="dial-rings pointer-events-none absolute -right-24 -top-24 h-72 w-72 opacity-[0.5]" aria-hidden />
        <div className="relative">
          <div className="font-mono text-[11px] uppercase tracking-label text-brass">The backstory</div>
          <h2 className="mt-1 font-disp text-[22px] font-semibold leading-tight tracking-tight text-ink">
            One person, a whole watch house.
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-dim">
            Picture the job honestly. You don't own a factory. You own something more valuable: the{" "}
            <span className="text-brass">design and the standard</span>. A client wants a watch that means something.
            A factory in China can build almost anything to spec. You sit in the middle and turn a vague wish into a
            precise, manufacturable, <span className="text-ink">enforceable</span> object — then make sure what arrives
            is exactly what was promised, gets paid for, and brings the next client behind it.
          </p>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-dim">
            That middle seat is where money is made and where it's lost. Lost to a tolerance nobody wrote down, a
            deposit nobody chased, a sample nobody signed off, a client nobody followed up. This cockpit exists to make
            sure none of that slips — so a single operator can run the work of a whole studio without a team, a CRM, a
            spreadsheet graveyard, and four disconnected apps.
          </p>
        </div>
      </Panel>

      {/* How the data lives */}
      <Panel className="p-5">
        <SectionHead title="How your data actually lives" kicker="local-first, cloud-synced" />
        <p className="text-[14px] leading-relaxed text-dim">
          Everything you type lives <span className="text-ink">in your browser first</span>. The screen never waits on a
          server, so it's instant, and it keeps working with no signal — on a plane, in a factory basement, anywhere.
          When you're signed in, the cockpit quietly syncs the <span className="text-brass">changes</span> (not the whole
          database — just what moved) up to the cloud, so the same workspace appears on your laptop, your phone, the next
          device you open.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          Two consequences worth internalising. First, <span className="text-ink">your data is yours</span> — you can
          export the entire workspace to a single JSON file any time, and restore from it. Second, your private business
          lives behind your login and is visible only to you; the few <span className="text-ink">public</span> things
          (your Collection page, a client's approval link) are served through narrow, read-only doors that can't reach
          the rest. More on that in <span className="text-faint">Data &amp; safety</span> below.
        </p>
      </Panel>

      {/* The seven pillars */}
      <Panel className="p-5">
        <SectionHead title="The seven pillars" kicker="what a real business needs" />
        <p className="mb-4 text-[13px] leading-relaxed text-dim">
          A business that lasts does seven things on repeat. Each pillar is a section in the left rail. Read them in
          order — it's the path a single watch takes from a stranger's curiosity to a repeat customer.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Pillar n={1} glyph="◈" name="Find demand" q="who wants this?">
            Show the work, capture interest. Content goes out, a public Collection brings strangers in, inquiries land in
            your inbox. This is <span className="text-dim">Marketing</span>.
          </Pillar>
          <Pillar n={2} glyph="⇶" name="Win the deal" q="turn interest into yes">
            Move a prospect through Proposal → Negotiating → Won. This is <span className="text-dim">Pipeline</span>,
            backed by <span className="text-dim">Clients</span>.
          </Pillar>
          <Pillar n={3} glyph="❖" name="Deliver the watch" q="build it right, prove it">
            Design the spec, govern the factory with documents, gate the run on a signed sample and per-unit QC. This is
            the <span className="text-dim">Project</span> workbench and <span className="text-dim">Suppliers</span>.
          </Pillar>
          <Pillar n={4} glyph="€" name="Get paid" q="cash, not promises">
            Track deposits and balances, issue an official factură, watch profit accumulate. This is{" "}
            <span className="text-dim">Money</span> + <span className="text-dim">Invoices</span>.
          </Pillar>
          <Pillar n={5} glyph="✧" name="Keep the client" q="one sale, many orders">
            Honour warranties, log service, and track who refers whom. A delivered client is the cheapest next sale. This
            is <span className="text-dim">Strategy</span>.
          </Pillar>
          <Pillar n={6} glyph="◎" name="Run the operation" q="never drop a ball">
            The Deck reads the whole board every morning and tells you the few things that actually matter today. This is{" "}
            <span className="text-dim">Deck</span> + <span className="text-dim">Tasks</span>.
          </Pillar>
          <Pillar n={7} glyph="✺" name="Build the brand" q="look like the real thing">
            Branded PDFs, a client portal, bilingual factory docs, a voice co-founder, your logo everywhere. Credibility
            is a feature. This runs <span className="text-dim">through everything</span>.
          </Pillar>
        </div>
      </Panel>

      {/* The growth loop */}
      <Panel className="p-5">
        <SectionHead title="The loop that feeds itself" kicker="why it compounds" />
        <p className="mb-5 text-[13px] leading-relaxed text-dim">
          The pillars aren't a straight line — they're a circle. Each delivered watch produces the raw material for the
          next two sales: a story to post, and a happy client to refer you. Run the loop and it gets cheaper to find work
          every turn.
        </p>
        <div className="flex flex-wrap items-start justify-center gap-y-3 rounded-lg border border-line bg-inset p-4">
          <Loop label="Content" sub="post the work" />
          <Arrow />
          <Loop label="Collection" sub="public portfolio" />
          <Arrow />
          <Loop label="Inquiry" sub="stranger reaches out" />
          <Arrow />
          <Loop label="Lead" sub="tagged by source" />
          <Arrow />
          <Loop label="Won" sub="pipeline closes" />
          <Arrow />
          <Loop label="Delivered" sub="built + signed off" />
          <Arrow />
          <Loop label="Referral / repeat" sub="feeds the top" />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-dim">
          Every arrow is a real handoff in the app: featuring a project pushes it to the Collection; an inquiry converts
          to a source-tagged lead in one tap; a delivered project becomes a warranty record and a referral credit. You're
          not managing seven tools — you're turning one crank.
        </p>
      </Panel>

      {/* The authority model */}
      <Panel className="p-5">
        <SectionHead title="Why the documents have teeth" kicker="design + QC authority" />
        <p className="text-[14px] leading-relaxed text-dim">
          The single idea that protects you: <span className="text-brass">you hold design and quality authority</span>.
          The factory is a contractor building to your spec, not a partner with opinions. The cockpit makes that
          relationship precise and enforceable in three linked artefacts, all generated from the same project data:
        </p>
        <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-relaxed text-dim">
          <li>
            <span className="text-ink">The production spec</span> writes down every tolerance, finish and material — so
            "wrong" is a measurable fact, not an argument.
          </li>
          <li>
            <span className="text-ink">The trade-assurance terms</span> carry the responsibility &amp; authority clause:
            the factory builds to the approved sample, and you sign off. Money is staged behind it.
          </li>
          <li>
            <span className="text-ink">The QC sign-off</span> gates the run. No approved first-off sample, no production.
            Too many failed units, the lot is rejected. The balance unlocks only on your ACCEPT.
          </li>
        </ul>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          Hand the exact same governing spec to a mainland OEM in 简体中文 and the standard travels with it. The English
          version stays the source of record.
        </p>
      </Panel>

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

      {/* Setup checklist */}
      <Panel className="p-5">
        <SectionHead title="Set up your system" kicker="do these once" />
        <p className="mb-3 text-[13px] leading-relaxed text-dim">
          A handful of one-time settings make every later screen correct. Walk this list before real work.
        </p>
        <ul className="flex flex-col">
          <Check>
            <span className="text-ink">Brand</span> — set your studio name and upload your logo in Settings. It appears in
            the sidebar, the intro, and on every PDF.
          </Check>
          <Check>
            <span className="text-ink">Base currency</span> — yours is <span className="text-brass">lei (RON)</span>.
            Confirm it in Settings and set your EUR / USD exchange rates, so the Money screen and invoices total in your
            real currency.
          </Check>
          <Check>
            <span className="text-ink">Fiscal identity</span> — CUI/CIF, Reg. Com., IBAN, VAT status and invoice series.
            Set once; every issued factură freezes a copy of it.
          </Check>
          <Check>
            <span className="text-ink">Default commercial terms</span> — deposit %, lot-fail threshold, rework cap and
            review window. New projects inherit these so your pricing and QC gates are consistent.
          </Check>
          <Check>
            <span className="text-ink">Goals</span> — monthly revenue, outreach and margin targets. The Strategy screen
            scores your actuals against them.
          </Check>
          <Check>
            <span className="text-ink">AI key (optional)</span> — paste an API key to unlock the Assistant's drafting and
            the smartest version of the voice co-founder. Everything else works without it.
          </Check>
        </ul>
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
        <p className="mt-4 text-[13px] leading-relaxed text-dim">
          Reaching <span className="text-ink">Delivered</span> isn't the end — it stamps the warranty start date and opens
          the after-sales record automatically. That's the handoff from the build pillar to the keep pillar.
        </p>
      </Panel>

      {/* Sidebar tour */}
      <Panel className="p-5">
        <SectionHead title="Every section, in one line" kicker="the left rail" />
        <div>
          <Area glyph="◎" name="Deck">
            Your start-of-day screen. A one-line "Today" summary reads the whole board at a glance, with a quick-add task
            box. Below it, the action queue: overdue follow-ups, deposits to chase, samples + QC to review, deadlines
            closing in — ranked by urgency. Clear the Deck and the business is on track.
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
            Your factories. Lead time, MOQ, golden samples, status, and 1–5 ratings for quality, communication and
            value, plus capability tags. The ranking panel then scores them and tells you who's best overall, best
            quality, fastest, best value, lowest MOQ — and you can filter "best for" a capability like engraving.
          </Area>
          <Area glyph="✓" name="Tasks">
            A flat to-do list, optionally linked to a project or client. Things that don't fit the stage flow live here.
          </Area>
          <Area glyph="€" name="Money">
            The cash picture: revenue booked, deposits in, balances owed, aging, and a forward forecast from your live
            deals. The per-project numbers come from the Commercial tab.
          </Area>
          <Area glyph="▦" name="Invoices">
            Official fiscal documents: set your identity once (Settings → Fiscal: CUI/CIF, Reg. Com., IBAN, VAT status,
            series), then create invoices with buyer details and line items — issue assigns the next sequential number
            and freezes the parties; mark paid; export a branded PDF (factură) with net / TVA / total.
          </Area>
          <Area glyph="◈" name="Marketing">
            The demand side: a value-aware funnel, lead-source attribution, a cadence/agenda and a kanban content board.
            Feature pieces to your public <span className="text-dim">Collection</span> (a portfolio page at /collection
            with an inquiry form); inquiries land in the Marketing inbox to convert into source-tagged leads in one tap.
          </Area>
          <Area glyph="✧" name="Strategy">
            Goals vs actuals (revenue, outreach, margin, pipeline coverage against your Settings targets), a warranty /
            after-sales register over delivered pieces — with a service log and expiry tracking — and referral
            attribution (set "Referred by" on a client to see who sends you business and the revenue it brings).
          </Area>
          <Area glyph="✺" name="Assistant">
            The AI operator. Ask it about your workspace; it can propose concrete actions (draft outreach, suggest next
            steps) that you review and apply. Requires an API key in Settings.
          </Area>
          <Area glyph="⚙" name="Settings">
            Brand + default commercial terms (deposit %, lot-fail threshold, rework cap, review window), fiscal identity,
            goals, FX rates, JSON backup / restore, and the demo-data button.
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

      {/* Money & invoicing deep dive */}
      <Panel className="p-5">
        <SectionHead title="Money &amp; invoicing, end to end" kicker="quote → deposit → balance → paid" />
        <p className="text-[14px] leading-relaxed text-dim">
          The numbers start on a project's <span className="text-ink">Commercial</span> tab: quantity, unit price and the
          cost build-up give you revenue, per-unit margin and break-even before you commit. Mark the deposit and balance
          as they arrive — the <span className="text-ink">Money</span> screen then aggregates the whole book: revenue
          booked, cash in, what's still owed, how old each balance is, and a forward forecast from your live pipeline.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          When a deal is real, turn it into an official document on the <span className="text-ink">Invoices</span> screen.
          Issuing freezes a snapshot of both parties and assigns the next sequential number from your series — so the
          record can never drift even if you edit details later. Mark it paid, export the branded factură (net / TVA /
          total), and watch <span className="text-brass">profit over time</span> accumulate on the P&amp;L timeline.
        </p>
      </Panel>

      {/* Marketing loop deep dive */}
      <Panel className="p-5">
        <SectionHead title="The marketing loop, in practice" kicker="from a post to a lead" />
        <p className="text-[14px] leading-relaxed text-dim">
          Plan posts on the <span className="text-ink">content board</span> (idea → drafting → scheduled → posted),
          linking each to the project it shows off. Mark a finished project as a <span className="text-ink">feature</span>{" "}
          and it appears on your public <span className="text-ink">Collection</span> page — a portfolio a stranger can
          browse and submit an inquiry from.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          Those inquiries land in the Marketing <span className="text-ink">inbox</span>. One tap converts an inquiry into
          a client and a project, tagged with the source it came from — so the <span className="text-ink">funnel</span>{" "}
          and <span className="text-ink">lead-source attribution</span> tell you, in money, which channels actually pay.
          That's how you stop guessing where to spend your effort.
        </p>
      </Panel>

      {/* Strategy deep dive */}
      <Panel className="p-5">
        <SectionHead title="Strategy &amp; retention" kicker="keep what you win" />
        <p className="text-[14px] leading-relaxed text-dim">
          The first sale is the expensive one. <span className="text-ink">Strategy</span> protects the cheap ones. Goals
          vs actuals shows whether you're on pace against your Settings targets (revenue, outreach, margin, pipeline
          coverage). The <span className="text-ink">warranty register</span> lists every delivered piece with its expiry
          status and a service log, so after-sales becomes a reason to stay in touch rather than a surprise.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-dim">
          And <span className="text-ink">referrals</span>: set "Referred by" on a client and the leaderboard shows who
          sends you business and the revenue it brings — telling you exactly which past clients to nurture, because they
          are your cheapest, warmest source of the next deal.
        </p>
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
            <span className="text-ink">Publish a client portal</span> — the Presentation tab publishes a private web
            page (no login) with the hero render, story and specs, where the client can <span className="text-ink">approve
            the design or request changes</span>. Their decision lands right back on the project — approvals, signer and
            note included.
          </li>
          <li>
            <span className="text-ink">Bilingual factory docs</span> — switch the Documents tab to 简体中文 to hand the
            exact same governing spec to a mainland-China OEM. The English version stays the source of record.
          </li>
          <li>
            <span className="text-ink">Repeat an order in one click</span> — the clone button on a delivered project
            spins up a fresh run with the spec intact and the warranty/QC reset, so re-orders take seconds.
          </li>
          <li>
            <span className="text-ink">Let the Deck drive your day</span> — if you only open one screen, open the Deck.
            It already knows what's most urgent.
          </li>
        </ul>
      </Panel>

      {/* Data & safety */}
      <Panel className="p-5">
        <SectionHead title="Data &amp; safety" kicker="own it, protect it" />
        <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-dim">
          <li>
            <span className="text-ink">It's yours.</span> The whole workspace exports to one JSON file from Settings, and
            restores from it. Even with cloud sync on, a periodic export is cheap insurance — keep one off-device.
          </li>
          <li>
            <span className="text-ink">Private by default.</span> Your clients, projects, money and suppliers live behind
            your login and are visible only to you. Sync moves just the changes, encrypted in transit.
          </li>
          <li>
            <span className="text-ink">Narrow public doors.</span> The Collection page and client approval links are the
            only things a stranger can reach, and they're served through read-only, purpose-built endpoints — they can
            show a featured piece or accept an inquiry, and nothing else. No one can browse or enumerate your data
            through them.
          </li>
          <li>
            <span className="text-ink">Offline-safe.</span> Because the app is local-first, a dropped connection never
            loses work — changes queue and sync when you're back online.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
