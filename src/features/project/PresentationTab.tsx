/**
 * The presentation editor: piece name, edition, the AI-written or hand-written
 * story, highlights, language, and image URLs — feeding the dossier and
 * certificate PDFs. The story generator obeys the Private-Label voice rule via
 * the domain prompt (Artymer unnamed in PL mode).
 */
import { useState } from "react";
import { I18N, LANGS, type Account, type Company, type Project } from "@/domain";
import { storyChoices, storySystemPrompt } from "@/domain/prompts";
import { generate } from "@/data/ai";
import { buildShareUrl, buildSharePayload } from "@/documents/shareLink";
import { Button, Field, Panel, SectionHead, SelectField, TextArea, Tag } from "@/ui/kit";
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
  const [busy, setBusy] = useState<null | "story" | "dossier" | "cert">(null);
  const [err, setErr] = useState("");
  const [shared, setShared] = useState(false);
  const pl = (p.servicePath || account?.servicePath) === "Private label";
  const accounts = account ? { [account.id]: account } : {};

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
        <SectionHead title="Export & share" kicker="client-facing" />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportDossier} disabled={!!busy}>
            {busy === "dossier" ? "Rendering…" : "↓ Dossier PDF"}
          </Button>
          <Button variant="ghost" onClick={exportCert} disabled={!!busy}>
            {busy === "cert" ? "Rendering…" : "↓ Certificate PDF"}
          </Button>
          <Button variant="ghost" onClick={copyShare}>
            {shared ? "Link copied ✓" : "⧉ Copy share link"}
          </Button>
          <Button variant="quiet" onClick={openShare}>
            Preview ↗
          </Button>
        </div>
        <p className="mt-2 font-mono text-[12px] text-faint">
          The PDF is dark cover → warm paper. The share link is a private web page of this dossier — send it to a
          client to view in their browser, no app or login needed.
        </p>
      </Panel>
    </div>
  );
}
