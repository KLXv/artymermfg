/**
 * The internal/production documents: the production specification, the trade-
 * assurance contract terms, and the QC sign-off — generated verbatim by the
 * domain layer. Copy to clipboard or download as text.
 */
import { useState } from "react";
import {
  qcSignoff,
  qcSignoffZh,
  specText,
  specTextZh,
  termsText,
  termsTextZh,
  type Account,
  type Company,
  type Project,
} from "@/domain";
import { Button, Panel, SectionHead, cx } from "@/ui/kit";
import { useStore } from "@/state/store";
import { docName } from "@/documents/name";

function DocBlock({
  title,
  kicker,
  text,
  file,
  onPdf,
}: {
  title: string;
  kicker: string;
  text: string;
  file: string;
  onPdf?: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const pdf = async () => {
    if (!onPdf) return;
    setPdfBusy(true);
    try {
      await onPdf();
    } finally {
      setPdfBusy(false);
    }
  };
  return (
    <Panel className="p-4">
      <SectionHead
        title={title}
        kicker={kicker}
        right={
          <span className="flex gap-2">
            <Button variant="ghost" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" onClick={download}>
              ↓ .txt
            </Button>
            {onPdf && (
              <Button variant="primary" onClick={pdf} disabled={pdfBusy}>
                {pdfBusy ? "Rendering…" : "↓ PDF"}
              </Button>
            )}
          </span>
        }
      />
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-line bg-inset p-3 font-mono text-[13px] leading-relaxed text-dim">
        {text}
      </pre>
    </Panel>
  );
}

export function DocumentsTab({ p, account, company }: { p: Project; account?: Account; company: Company }) {
  const suppliers = useStore((s) => s.suppliers);
  const accounts = account ? { [account.id]: account } : {};
  const piece = p.pieceName || p.name || "piece";
  const [lang, setLang] = useState<"EN" | "ZH">("EN");
  const zh = lang === "ZH";
  const suffix = zh ? "-zh" : "";

  const client = account?.name || "—";
  const today = new Date().toISOString().slice(0, 10);
  // Component reference photos embedded in the spec PDF.
  const specPhotos = [
    { label: "Full watch", src: p.images.hero },
    { label: "Dial", src: p.images.dial },
    { label: "Case", src: p.images.caseImg },
    { label: "Caseback", src: p.images.back },
    { label: "Movement", src: p.images.movementImg },
  ];

  // The branded PDF is rendered from the English (source-of-record) text. The
  // renderer is heavy, so it's loaded on demand only when a PDF is exported.
  const makePdf = (kind: "spec" | "terms" | "qc") => async () => {
    const [{ FactoryDoc }, { docName, downloadPdf }] = await Promise.all([
      import("@/documents/FactoryDoc"),
      import("@/documents/download"),
    ]);
    const common = { company } as const;
    if (kind === "spec") {
      await downloadPdf(
        <FactoryDoc
          {...common}
          kind="spec"
          docTag="Production specification"
          title={piece}
          meta={[`Client: ${client}   ·   Qty: ${p.qty || "—"} pc   ·   Rev: ${p.rev || "—"}`, `Manufacturer: ${suppliers[p.supplierId]?.name || p.maker || "—"}   ·   ${today}`]}
          body={specText(p, accounts, suppliers)}
          photos={specPhotos}
        />,
        docName(piece, "spec"),
      );
    } else if (kind === "terms") {
      await downloadPdf(
        <FactoryDoc
          {...common}
          kind="terms"
          docTag="Trade-assurance terms"
          title="Contract terms"
          meta={[`Order: ${piece} / ${client}   ·   Qty: ${p.qty || "—"} pc   ·   Rev: ${p.rev || "—"}`]}
          body={termsText(p, accounts, company)}
        />,
        docName(piece, "terms"),
      );
    } else {
      await downloadPdf(
        <FactoryDoc
          {...common}
          kind="qc"
          docTag="QC sign-off"
          title="Quality sign-off"
          meta={[`Order: ${piece} / ${client}   ·   Rev: ${p.rev || "—"}   ·   ${today}`]}
          body={qcSignoff(p, accounts, company)}
        />,
        docName(piece, "qc-signoff"),
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel className="flex items-center gap-3 p-3">
        <span className="font-mono text-[12px] uppercase tracking-label text-faint">Factory language</span>
        <div className="flex gap-1">
          {(["EN", "ZH"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cx(
                "rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors",
                lang === l ? "border-brass bg-brass-dim text-brass" : "border-line text-dim hover:border-line2 hover:text-ink",
              )}
            >
              {l === "EN" ? "English" : "简体中文"}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[11px] text-faint">
          {zh ? "供应商版本 · 与英文同源 · PDF 仅英文" : "source of record · branded PDF"}
        </span>
      </Panel>
      <DocBlock
        title="Production specification"
        kicker={`Rev ${p.rev || "—"}`}
        text={zh ? specTextZh(p, accounts, suppliers) : specText(p, accounts, suppliers)}
        file={docName(piece, "spec") + suffix}
        onPdf={zh ? undefined : makePdf("spec")}
      />
      <DocBlock
        title="Trade-assurance contract terms"
        kicker="Alibaba channel"
        text={zh ? termsTextZh(p, accounts, company) : termsText(p, accounts, company)}
        file={docName(piece, "terms") + suffix}
        onPdf={zh ? undefined : makePdf("terms")}
      />
      <DocBlock
        title="QC sign-off"
        kicker="Watchmaker & Founder"
        text={zh ? qcSignoffZh(p, accounts, company) : qcSignoff(p, accounts, company)}
        file={docName(piece, "qc-signoff") + suffix}
        onPdf={zh ? undefined : makePdf("qc")}
      />
      {zh && (
        <p className="px-1 font-mono text-[12px] text-faint">
          The branded PDF is English-only for now (Chinese needs an embedded CJK font). The 简体中文 spec, terms and
          sign-off export cleanly via <span className="text-dim">Copy</span> or <span className="text-dim">↓ .txt</span>.
        </p>
      )}
    </div>
  );
}
