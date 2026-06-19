/**
 * The public, read-only dossier web page (route /share, no auth, no shell).
 * Decodes the payload from the URL hash and renders the piece as a ceremonial
 * object. Honors the Private-Label rule: in PL the client's brand leads and
 * Artymer is only the small maker's mark; in Commission the Σ leads.
 */
import { useMemo } from "react";
import { I18N } from "@/domain";
import { Sigma } from "@/ui/Sigma";
import { WatchDial } from "@/ui/WatchDial";
import { decodeShare } from "@/documents/shareLink";

export function ShareDossier() {
  const payload = useMemo(() => decodeShare(window.location.hash.replace(/^#/, "")), []);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground px-6 text-center">
        <div>
          <Sigma size={36} />
          <p className="mt-4 font-mono text-[13px] text-faint">This dossier link is invalid or incomplete.</p>
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
                texture: payload.specs.tex,
                engraving: piece,
                pieceName: piece,
              }}
            />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-brass">{t.bespoke}</div>
          {pl && client ? (
            <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">{client}</h1>
          ) : null}
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
          {payload.specs.caseMat && <span>{payload.specs.caseMat}{payload.specs.caseDia ? ` · ⌀ ${payload.specs.caseDia} mm` : ""}</span>}
        </div>
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
