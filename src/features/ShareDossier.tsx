/**
 * The public client portal (route /share, no auth, no shell).
 *
 * Two ways in: a backend token (?t=…) that loads a published dossier and lets
 * the client formally approve or request changes, or a legacy self-contained
 * link (#payload) that renders without a backend (no approval). Honors the
 * Private-Label rule: in PL the client's brand leads and Artymer is the small
 * maker's mark; in Commission the Σ leads.
 */
import { useEffect, useMemo, useState } from "react";
import { I18N } from "@/domain";
import { Sigma } from "@/ui/Sigma";
import { WatchDial } from "@/ui/WatchDial";
import { decodeShare, type SharePayload } from "@/documents/shareLink";
import { loadSharedDossier, submitShareApproval, type ShareApproval } from "@/data/shares";

type Status = "loading" | "ready" | "invalid";

export function ShareDossier() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("t") || "", []);
  const legacy = useMemo(() => (token ? null : decodeShare(window.location.hash.replace(/^#/, ""))), [token]);

  const [status, setStatus] = useState<Status>(token ? "loading" : legacy ? "ready" : "invalid");
  const [payload, setPayload] = useState<SharePayload | null>(legacy);
  const [approval, setApproval] = useState<ShareApproval | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await loadSharedDossier(token);
      if (cancelled) return;
      if (res?.payload) {
        setPayload(res.payload);
        setApproval(res.approval);
        setStatus("ready");
      } else {
        setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground">
        <Sigma size={32} />
      </div>
    );
  }
  if (status === "invalid" || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground px-6 text-center">
        <div>
          <Sigma size={36} />
          <p className="mt-4 font-mono text-[13px] text-faint">This dossier link is invalid, expired, or revoked.</p>
        </div>
      </div>
    );
  }

  const t = I18N[payload.lang] || I18N.EN;
  const { pl, client, piece } = payload;
  const highlights = payload.highlights.split("\n").map((h) => h.trim()).filter(Boolean);
  const firstColor = payload.colors.find((c) => c.ref || c.name);

  return (
    <div className="min-h-screen bg-ground text-ink">
      {/* Cover */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-glow-radial" aria-hidden />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <div className="mb-8">
            <WatchDial
              size={240}
              mode="preview"
              showConstruction
              showLogo={!pl}
              spec={{
                caseDia: payload.specs.caseDia,
                dialColor: firstColor?.ref || firstColor?.name,
                dialColors: payload.colors.map((c) => c.ref || c.name).filter(Boolean),
                texture: payload.specs.tex,
                engraving: piece,
                pieceName: piece,
              }}
            />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-brass">{t.bespoke}</div>
          {pl && client ? <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">{client}</h1> : null}
          <h2 className={pl ? "mt-1 font-serif text-2xl italic text-brass" : "mt-3 font-serif text-4xl font-semibold text-brass"}>
            {piece || "Untitled piece"}
          </h2>
          {!pl && client ? <p className="mt-2 font-serif text-lg italic text-dim">{t.forClient(client)}</p> : null}
          {payload.edition ? <p className="mt-3 font-mono text-[12px] uppercase tracking-wide text-faint">{payload.edition}</p> : null}
        </div>
      </header>

      {/* Hero image */}
      {payload.images.hero && (
        <div className="mx-auto max-w-3xl px-6 pt-10">
          <img src={payload.images.hero} alt={piece} className="w-full rounded-lg border border-line object-cover shadow-card" />
        </div>
      )}

      {/* Story */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        {(payload.story || t.storyPlaceholder).split(/\n{2,}/).map((para, i) => (
          <p key={i} className="mb-5 font-serif text-[17px] leading-[1.8] text-ink/90">
            {para.trim()}
          </p>
        ))}

        {highlights.length > 0 && (
          <ul className="mt-8 grid gap-2 border-t border-line pt-6">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] text-dim">
                <span className="mt-1 text-brass">—</span> {h}
              </li>
            ))}
          </ul>
        )}

        {/* Element images */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { src: payload.images.dial, label: t.elDial },
            { src: payload.images.caseImg, label: t.elCase },
            { src: payload.images.back, label: t.elBack },
          ]
            .filter((e) => e.src)
            .map((e, i) => (
              <figure key={i} className="overflow-hidden rounded-lg border border-line">
                <img src={e.src} alt={e.label} className="aspect-square w-full object-cover" />
                <figcaption className="px-3 py-2 font-mono text-[11px] uppercase tracking-label text-faint">{e.label}</figcaption>
              </figure>
            ))}
        </div>

        {/* Spec line */}
        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-line pt-6 font-mono text-[12px] text-dim">
          {payload.specs.cal && <span>{t.movement(payload.specs.cal, payload.specs.crys || "—")}</span>}
          {payload.specs.wr && <span>{t.wr(payload.specs.wr)}</span>}
          {payload.specs.caseMat && (
            <span>
              {payload.specs.caseMat}
              {payload.specs.caseDia ? ` · ⌀ ${payload.specs.caseDia} mm` : ""}
            </span>
          )}
        </div>

        {/* Approval — only on backend (token) shares */}
        {token && <ApprovalSection token={token} approval={approval} onApproved={setApproval} piece={piece} />}
      </main>

      {/* Maker's mark */}
      <footer className="border-t border-line py-10 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sigma size={18} />
          <span className="font-mono text-[12px] uppercase tracking-wide text-dim">{pl ? t.maker : t.credit}</span>
        </div>
      </footer>
    </div>
  );
}

function ApprovalSection({
  token,
  approval,
  onApproved,
  piece,
}: {
  token: string;
  approval: ShareApproval | null;
  onApproved: (a: ShareApproval) => void;
  piece: string;
}) {
  const [signer, setSigner] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "approved" | "changes">("");
  const [err, setErr] = useState("");

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return iso.slice(0, 10);
    }
  };

  if (approval) {
    const ok = approval.decision === "approved";
    return (
      <section className="mt-12 rounded-xl border border-line bg-panel-grad p-6 text-center shadow-card">
        <div
          className={
            "mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-2xl " +
            (ok ? "border-ok/40 bg-[#3DDC9714] text-ok" : "border-warn/40 bg-[#F5B44514] text-warn")
          }
        >
          {ok ? "✓" : "↺"}
        </div>
        <h3 className="mt-4 font-serif text-2xl text-ink">{ok ? "Design approved" : "Changes requested"}</h3>
        <p className="mt-1 font-mono text-[12px] uppercase tracking-label text-faint">
          {approval.signer || "Client"} · {fmtDate(approval.at)}
        </p>
        {approval.note && <p className="mx-auto mt-4 max-w-md font-serif text-[15px] italic leading-relaxed text-dim">"{approval.note}"</p>}
        <p className="mt-5 font-mono text-[12px] text-faint">Your watchmaker has been notified.</p>
      </section>
    );
  }

  const submit = async (decision: "approved" | "changes") => {
    setErr("");
    if (!signer.trim()) {
      setErr("Please enter your name first.");
      return;
    }
    setBusy(decision);
    try {
      const ok = await submitShareApproval(token, decision, signer.trim(), note.trim());
      if (ok) onApproved({ decision, signer: signer.trim(), note: note.trim(), at: new Date().toISOString() });
      else setErr("Could not record your response. Please try again.");
    } catch {
      setErr("Could not record your response. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="mt-12 rounded-xl border border-brass/30 bg-panel-grad p-6 shadow-card">
      <div className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-label text-brass">Your decision</div>
        <h3 className="mt-1 font-serif text-2xl text-ink">Approve {piece || "this design"}?</h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-dim">
          Confirm the design as shown, or let us know what you'd like changed. Your watchmaker is notified the moment you
          respond.
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-md">
        <input
          value={signer}
          onChange={(e) => setSigner(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-md border border-line bg-inset px-3 py-2.5 font-body text-[15px] text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Optional note (what to change, or a word of approval)…"
          className="mt-2 w-full resize-y rounded-md border border-line bg-inset px-3 py-2.5 font-body text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-brass focus:outline-none"
        />
        {err && <p className="mt-2 text-center font-mono text-[12px] text-bad">{err}</p>}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => submit("approved")}
            disabled={!!busy}
            className="flex-1 rounded-md border border-brass/50 bg-accent-grad px-4 py-2.5 font-mono text-[13px] uppercase tracking-label text-[#D6EBFF] transition-all hover:shadow-glow-sm disabled:opacity-50"
          >
            {busy === "approved" ? "Recording…" : "✓ Approve design"}
          </button>
          <button
            onClick={() => submit("changes")}
            disabled={!!busy}
            className="flex-1 rounded-md border border-line bg-white/[.02] px-4 py-2.5 font-mono text-[13px] uppercase tracking-label text-dim transition-colors hover:border-line2 hover:text-ink disabled:opacity-50"
          >
            {busy === "changes" ? "Recording…" : "Request changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
