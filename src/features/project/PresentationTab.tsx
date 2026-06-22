/**
 * The presentation editor: piece name, edition, the AI-written or hand-written
 * story, highlights, language, and image URLs — feeding the dossier and
 * certificate PDFs. The story generator obeys the Private-Label voice rule via
 * the domain prompt (Artymer unnamed in PL mode).
 */
import { useEffect, useState } from "react";
import { I18N, LANGS, type Account, type Company, type Project } from "@/domain";
import { storyChoices, storySystemPrompt } from "@/domain/prompts";
import { generate } from "@/data/ai";
import { buildShareUrl, buildSharePayload } from "@/documents/shareLink";
import {
  loadProjectShares,
  publishShare,
  revokeShare,
  shareUrlFor,
  sharesEnabled,
  type ShareRecord,
} from "@/data/shares";
import { featurePiece, loadFeatured, unfeaturePiece } from "@/data/collection";
import { useAuth } from "@/state/useAuth";
import { Button, Field, Panel, SectionHead, SelectField, TextArea, Tag, cx } from "@/ui/kit";
import { makeBind, type Patch } from "./bind";

const IMG_FIELDS: [keyof Project["images"], string][] = [
  ["hero", "Hero image URL"],
  ["dial", "Dial image URL"],
  ["caseImg", "Case image URL"],
  ["back", "Caseback image URL"],
  ["clientLogo", "Client logo URL"],
];

export function PresentationTab({
  p,
  patch,
  account,
  company,
}: {
  p: Project;
  patch: Patch;
  account?: Account;
  company: Company;
}) {
  const f = makeBind(p, patch);
  const { user } = useAuth();
  const [busy, setBusy] = useState<null | "story" | "dossier" | "cert">(null);
  const [err, setErr] = useState("");
  const [shared, setShared] = useState(false);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [featured, setFeatured] = useState(false);
  const [featuring, setFeaturing] = useState(false);
  const pl = (p.servicePath || account?.servicePath) === "Private label";
  const accounts = account ? { [account.id]: account } : {};
  const portalOn = sharesEnabled() && !!user;

  const refreshShares = async () => {
    if (portalOn) setShares(await loadProjectShares(p.id));
  };
  useEffect(() => {
    refreshShares();
    if (portalOn) loadFeatured().then((items) => setFeatured(items.some((i) => i.project_id === p.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id, user]);

  const toggleFeatured = async () => {
    if (!user) return;
    setFeaturing(true);
    try {
      if (featured) {
        await unfeaturePiece(p.id);
        setFeatured(false);
      } else {
        await featurePiece(p.id, user.id, buildSharePayload(p, account, company));
        setFeatured(true);
      }
    } finally {
      setFeaturing(false);
    }
  };

  const publish = async () => {
    if (!user) return;
    setPublishing(true);
    try {
      const token = await publishShare(p.id, user.id, buildSharePayload(p, account, company));
      await navigator.clipboard.writeText(shareUrlFor(token)).catch(() => {});
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 2000);
      await refreshShares();
    } finally {
      setPublishing(false);
    }
  };
  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(shareUrlFor(token)).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2000);
  };
  const revoke = async (token: string) => {
    await revokeShare(token);
    await refreshShares();
  };

  const shareUrl = () => {
    const payload = buildSharePayload(p, account, company);
    return buildShareUrl(payload);
  };
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  const openShare = () => window.open(shareUrl(), "_blank");

  const writeStory = async () => {
    setErr("");
    setBusy("story");
    try {
      const text = await generate(storySystemPrompt(p, accounts), [
        { role: "user", content: storyChoices(p, accounts) },
      ]);
      if (text) patch({ story: text });
      else setErr("No text returned.");
    } catch (e) {
      setErr("AI unavailable — configure the proxy + sign in, or write the story by hand.");
      void e;
    } finally {
      setBusy(null);
    }
  };

  const piece = p.pieceName || p.name || "piece";
  // The PDF renderer is heavy; load it (and the documents) on demand so it
  // stays out of the initial bundle.
  const exportDossier = async () => {
    setBusy("dossier");
    try {
      const [{ Dossier }, { docName, downloadPdf }] = await Promise.all([
        import("@/documents/Dossier"),
        import("@/documents/download"),
      ]);
      await downloadPdf(<Dossier project={p} account={account} company={company} />, docName(piece, "dossier"));
    } finally {
      setBusy(null);
    }
  };
  const exportCert = async () => {
    setBusy("cert");
    try {
      const [{ Certificate }, { docName, downloadPdf }] = await Promise.all([
        import("@/documents/Certificate"),
        import("@/documents/download"),
      ]);
      await downloadPdf(<Certificate project={p} account={account} company={company} />, docName(piece, "certificate"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-4">
        <SectionHead title="The object" right={pl ? <Tag tone="pl">Private label</Tag> : <Tag tone="brass">Commission</Tag>} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Piece name" {...f("pieceName")} />
          <Field label="Edition" {...f("edition")} />
          <SelectField
            label="Document language"
            value={p.lang}
            onChange={(v) => patch({ lang: v as Project["lang"] })}
            options={LANGS.map((l) => ({ value: l, label: I18N[l] ? l : l }))}
          />
        </div>
        <p className="mt-2 font-mono text-[12px] text-faint">
          {pl
            ? "PL: the client's brand leads; Artymer is the unnamed maker (small Σ mark only)."
            : "Commission: Σ leads; credited 'designed and directed by one person'."}
        </p>
      </Panel>

      <Panel className="p-4">
        <SectionHead
          title="The story"
          kicker={`for the dossier · ${p.lang}`}
          right={
            <Button variant="primary" onClick={writeStory} disabled={busy === "story"}>
              {busy === "story" ? "Writing…" : "✺ Write with AI"}
            </Button>
          }
        />
        <TextArea
          value={p.story}
          onChange={(v) => patch({ story: v })}
          rows={8}
          placeholder={I18N[p.lang]?.storyPlaceholder}
        />
        {err && <p className="mt-2 font-mono text-[13px] text-warn">{err}</p>}
        <TextArea
          label="Highlights (one per line)"
          value={p.highlights}
          onChange={(v) => patch({ highlights: v })}
          rows={4}
          className="mt-3"
        />
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Imagery" kicker="paste hosted image URLs" />
        <div className="grid gap-3 sm:grid-cols-2">
          {IMG_FIELDS.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={p.images[key]}
              onChange={(v) => patch({ images: { ...p.images, [key]: v } })}
            />
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Export" kicker="PDF" />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportDossier} disabled={!!busy}>
            {busy === "dossier" ? "Rendering…" : "↓ Dossier PDF"}
          </Button>
          <Button variant="ghost" onClick={exportCert} disabled={!!busy}>
            {busy === "cert" ? "Rendering…" : "↓ Certificate PDF"}
          </Button>
        </div>
        <p className="mt-2 font-mono text-[12px] text-faint">The PDF is dark cover → warm paper.</p>
      </Panel>

      <Panel className="p-4">
        <SectionHead
          title="Client portal"
          kicker="share · collect approval"
          right={
            portalOn ? (
              <Button variant="primary" onClick={publish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish link"}
              </Button>
            ) : undefined
          }
        />
        {portalOn ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-line pb-3">
              <button
                onClick={toggleFeatured}
                disabled={featuring}
                className={cx(
                  "rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors disabled:opacity-50",
                  featured ? "border-brass bg-brass-dim text-brass" : "border-line text-dim hover:border-brass hover:text-ink",
                )}
              >
                {featuring ? "…" : featured ? "★ In public Collection" : "☆ Add to public Collection"}
              </button>
              <a href="/collection" target="_blank" rel="noreferrer" className="font-mono text-[12px] text-faint hover:text-dim">
                View public collection ↗
              </a>
            </div>
            {shares.length === 0 ? (
            <p className="font-mono text-[13px] text-faint">
              Publish a private web page of this dossier. The client opens it in their browser — no login — reads the
              piece, and approves the design or requests changes. Their decision lands back here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {shares.map((s) => {
                const a = s.approval;
                const tone = s.revoked
                  ? "neutral"
                  : a?.decision === "approved"
                    ? "ok"
                    : a?.decision === "changes"
                      ? "warn"
                      : "neutral";
                const label = s.revoked
                  ? "Revoked"
                  : a?.decision === "approved"
                    ? "Approved"
                    : a?.decision === "changes"
                      ? "Changes requested"
                      : "Awaiting response";
                return (
                  <li key={s.id} className="flex flex-col gap-1.5 py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={tone}>{label}</Tag>
                      <span className="font-mono text-[12px] text-faint">{new Date(s.created_at).toLocaleDateString()}</span>
                      <span className="ml-auto flex gap-2">
                        <Button variant="ghost" onClick={() => copyLink(s.id)}>
                          {copiedToken === s.id ? "Copied ✓" : "⧉ Copy"}
                        </Button>
                        <Button variant="quiet" onClick={() => window.open(shareUrlFor(s.id), "_blank")}>
                          Preview ↗
                        </Button>
                        {!s.revoked && (
                          <Button variant="danger" onClick={() => revoke(s.id)}>
                            Revoke
                          </Button>
                        )}
                      </span>
                    </div>
                    {a && (
                      <p className="text-[13px] text-dim">
                        <span className="text-ink">{a.signer || "Client"}</span>
                        {a.note ? ` — "${a.note}"` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
          </>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={copyShare}>
                {shared ? "Link copied ✓" : "⧉ Copy instant link"}
              </Button>
              <Button variant="quiet" onClick={openShare}>
                Preview ↗
              </Button>
            </div>
            <p className="mt-2 font-mono text-[12px] text-faint">
              This instant link works with no backend, but can't collect approval. Sign in with cloud sync to publish a
              link that captures the client's sign-off.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
