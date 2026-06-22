/**
 * The public brand Collection (route /collection, no auth, no shell).
 *
 * A portfolio of featured pieces with an inquiry form that drops a source-tagged
 * lead into the operator's inbox (via the submit_inquiry RPC). Mirrors the
 * dossier's ceremonial look.
 */
import { useEffect, useMemo, useState } from "react";
import { I18N } from "@/domain";
import { Sigma } from "@/ui/Sigma";
import { WatchDial } from "@/ui/WatchDial";
import { BRAND_WORDMARK } from "@/ui/brand";
import { loadPublicCollection, submitInquiry, type PublicCollection } from "@/data/collection";
import type { SharePayload } from "@/documents/shareLink";

function PieceCard({ p }: { p: SharePayload }) {
  const firstColor = p.colors.find((c) => c.ref || c.name);
  const excerpt = (p.story || "").split(/\n{2,}/)[0]?.slice(0, 220) || "";
  return (
    <article className="glass overflow-hidden rounded-lg">
      <div className="flex items-center justify-center border-b border-line bg-inset p-4">
        {p.images.hero ? (
          <img src={p.images.hero} alt={p.piece} className="h-56 w-full rounded object-cover" />
        ) : (
          <WatchDial
            size={180}
            mode="preview"
            showConstruction
            showLogo
            spec={{
              caseDia: p.specs.caseDia,
              dialColor: firstColor?.ref || firstColor?.name,
              dialColors: p.colors.map((c) => c.ref || c.name).filter(Boolean),
              texture: p.specs.tex,
              pieceName: p.piece,
            }}
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-2xl text-brass">{p.piece || "Untitled piece"}</h3>
        {p.edition && <div className="mt-1 font-mono text-[11px] uppercase tracking-label text-faint">{p.edition}</div>}
        {excerpt && <p className="mt-3 font-serif text-[15px] leading-relaxed text-dim">{excerpt}…</p>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[12px] text-faint">
          {p.specs.cal && <span>{p.specs.cal}</span>}
          {p.specs.caseMat && <span>{p.specs.caseMat}{p.specs.caseDia ? ` · ⌀ ${p.specs.caseDia} mm` : ""}</span>}
          {p.specs.wr && <span>{p.specs.wr}</span>}
        </div>
      </div>
    </article>
  );
}

function InquiryForm({ owner }: { owner: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setErr("");
    if (!name.trim() || !message.trim()) {
      setErr("Please add your name and a message.");
      return;
    }
    setBusy(true);
    try {
      const ok = await submitInquiry(owner, name.trim(), email.trim(), message.trim(), "Website");
      if (ok) setDone(true);
      else setErr("Could not send — please try again.");
    } catch {
      setErr("Could not send — please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-ok/40 bg-[#3DDC9714] text-2xl text-ok">✓</div>
        <h3 className="mt-4 font-serif text-2xl text-ink">Message received</h3>
        <p className="mt-1 text-[14px] text-dim">Thank you — you'll hear back personally, soon.</p>
      </div>
    );

  const input = "w-full rounded-md border border-line bg-inset px-3 py-2.5 font-body text-[15px] text-ink placeholder:text-faint focus:border-brass focus:outline-none";
  return (
    <div className="glass rounded-xl p-6">
      <div className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-label text-brass">Commission a piece</div>
        <h3 className="mt-1 font-serif text-2xl text-ink">Start a conversation</h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-dim">
          Tell me what you have in mind — a club, a milestone, a private commission. I read every message myself.
        </p>
      </div>
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (so I can reply)" className={input} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="What would you like to create?" className={input + " resize-y leading-relaxed"} />
        {err && <p className="text-center font-mono text-[12px] text-bad">{err}</p>}
        <button
          onClick={send}
          disabled={busy}
          className="mt-1 rounded-md border border-brass/50 bg-accent-grad px-4 py-2.5 font-mono text-[13px] uppercase tracking-label text-[#CFF8EC] shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send inquiry"}
        </button>
      </div>
    </div>
  );
}

export function Collection() {
  const [data, setData] = useState<PublicCollection | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadPublicCollection();
      if (cancelled) return;
      if (res) {
        setData(res);
        setStatus("ready");
      } else setStatus("error");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = I18N.EN;
  const brand = data?.brand || "Artymer";
  const items = useMemo(() => data?.items ?? [], [data]);

  if (status === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground">
        <Sigma size={32} />
      </div>
    );

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-glow-radial" aria-hidden />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          {data?.logo ? (
            <img src={data.logo} alt={brand} className="h-16 object-contain" />
          ) : (
            <img src={BRAND_WORDMARK} alt={brand} className="w-[280px] max-w-[70vw] object-contain" />
          )}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-label text-brass">{t.bespoke} · the collection</p>
          <p className="mt-3 max-w-xl font-serif text-[17px] leading-relaxed text-dim">
            Bespoke timepieces, designed and quality-directed by one watchmaker. A few of the pieces brought into being.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {items.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((p, i) => (
              <PieceCard key={i} p={p} />
            ))}
          </div>
        )}

        <div className="mx-auto mt-14 max-w-xl">{data && <InquiryForm owner={data.owner_id} />}</div>
      </main>

      <footer className="border-t border-line py-10 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sigma size={18} />
          <span className="font-mono text-[12px] uppercase tracking-wide text-dim">{t.credit}</span>
        </div>
      </footer>
    </div>
  );
}
