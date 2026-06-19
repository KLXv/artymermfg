/**
 * Attachments — photos and technical files per project.
 *
 * Images (hero, dial, case, back, movement, client logo) are stored in
 * `project.images`; documents (movement spec PDF, engraving vector) live in
 * `project.files`. All assets are uploaded to the Supabase `attachments`
 * bucket and URLs written back via patch — so they appear in PDFs and the
 * share dossier immediately.
 *
 * Works without Supabase (local-only mode) by showing a graceful banner.
 * Requires:
 *   ALTER TABLE projects ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '{}';
 *   and a public `attachments` bucket in Supabase Storage.
 */
import { useRef, useState } from "react";
import { uploadAttachment, deleteAttachment } from "@/data/storage";
import { isSupabaseConfigured } from "@/data/supabase";
import { useAuth } from "@/state/useAuth";
import { Button, Label, Panel, SectionHead } from "@/ui/kit";
import { cx } from "@/ui/kit";
import type { Project, ProjectFiles, ProjectImages } from "@/domain";
import type { Patch } from "./bind";

type ImgKey = keyof ProjectImages;
type FileKey = keyof ProjectFiles;

const IMAGE_SLOTS: { key: ImgKey; label: string; hint: string }[] = [
  { key: "hero", label: "Full-watch hero", hint: "Clean white-bg or lifestyle shot" },
  { key: "dial", label: "Dial close-up", hint: "Macro, D65 light" },
  { key: "caseImg", label: "Case", hint: "Side / profile view" },
  { key: "back", label: "Caseback", hint: "Engraving or decoration" },
  { key: "movementImg", label: "Movement / caliber", hint: "Open caseback or catalogue scan" },
  { key: "clientLogo", label: "Client logo", hint: "PNG with transparency preferred" },
];

const FILE_SLOTS: { key: FileKey; label: string; accept: string; hint: string }[] = [
  { key: "movementSpec", label: "Movement spec", accept: ".pdf", hint: "Manufacturer datasheet PDF" },
  { key: "engravingVector", label: "Engraving vector", accept: ".svg,.ai,.pdf,.eps", hint: "SVG / AI / EPS · artwork file" },
];

/* ---------- helpers ---------- */

function filenameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url.slice(url.lastIndexOf("/") + 1);
  }
}

/* ---------- single upload zone ---------- */

function UploadSlot({
  slotKey,
  label,
  hint,
  accept,
  url,
  isImage,
  onUpload,
  onClear,
  uploading,
}: {
  slotKey: string;
  label: string;
  hint: string;
  accept: string;
  url: string;
  isImage: boolean;
  onUpload: (file: File, slot: string) => Promise<void>;
  onClear: (slot: string, url: string) => Promise<void>;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    await onUpload(files[0], slotKey);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    await handleFiles(e.dataTransfer.files);
  };

  const hasFile = !!url;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {hasFile ? (
        <div className="group relative overflow-hidden rounded-lg border border-line bg-inset">
          {isImage ? (
            <img
              src={url}
              alt={label}
              className="h-32 w-full object-contain p-2"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex h-20 items-center gap-3 px-4">
              <FileIcon />
              <div className="min-w-0">
                <div className="truncate font-mono text-[13px] text-ink">{filenameFromUrl(url)}</div>
                <div className="font-mono text-[11px] text-faint">{hint}</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded border border-line2/50 bg-black/60 px-2 py-1 font-mono text-[11px] text-ink hover:border-brass"
              disabled={uploading}
            >
              Replace
            </button>
            <button
              onClick={() => onClear(slotKey, url)}
              className="rounded border border-bad/40 bg-black/60 px-2 py-1 font-mono text-[11px] text-bad hover:border-bad"
              disabled={uploading}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cx(
            "flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line transition-colors",
            uploading ? "opacity-50" : "hover:border-brass/60 hover:bg-white/[.02]",
          )}
        >
          {uploading ? (
            <span className="font-mono text-[12px] text-faint">Uploading…</span>
          ) : (
            <>
              <UploadIcon />
              <span className="font-mono text-[12px] text-faint">Click or drop</span>
              <span className="font-mono text-[11px] text-faint/70">{hint}</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-faint">
      <path d="M9 12V4M9 4L6 7M9 4L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brass">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- main tab ---------- */

export function AttachmentsTab({ p, patch }: { p: Project; patch: Patch }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const ownerId = user?.id ?? "local";
  const configured = isSupabaseConfigured();

  const setUploadingSlot = (slot: string, active: boolean) =>
    setUploading((prev) => {
      const next = new Set(prev);
      active ? next.add(slot) : next.delete(slot);
      return next;
    });

  const handleUpload = async (file: File, slot: string) => {
    setError(null);
    setUploadingSlot(slot, true);
    try {
      const url = await uploadAttachment(file, ownerId, p.id, slot);
      if (IMAGE_SLOTS.some((s) => s.key === slot)) {
        patch({ images: { ...p.images, [slot]: url } });
      } else {
        patch({ files: { ...p.files, [slot]: url } });
      }
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setUploadingSlot(slot, false);
    }
  };

  const handleClear = async (slot: string, url: string) => {
    setError(null);
    setUploadingSlot(slot, true);
    try {
      await deleteAttachment(url);
    } finally {
      if (IMAGE_SLOTS.some((s) => s.key === slot)) {
        patch({ images: { ...p.images, [slot]: "" } });
      } else {
        patch({ files: { ...p.files, [slot]: "" } });
      }
      setUploadingSlot(slot, false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!configured && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 font-mono text-[13px] text-warn">
          Supabase is not configured — uploads are disabled. Connect Supabase to enable file storage.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 font-mono text-[13px] text-bad">
          {error}
        </div>
      )}

      <Panel className="p-4">
        <SectionHead title="Reference photos" kicker="used in dossier + certificate" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMAGE_SLOTS.map(({ key, label, hint }) => (
            <UploadSlot
              key={key}
              slotKey={key}
              label={label}
              hint={hint}
              accept="image/*"
              url={p.images[key] ?? ""}
              isImage
              onUpload={handleUpload}
              onClear={handleClear}
              uploading={uploading.has(key) || !configured}
            />
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionHead title="Technical files" kicker="movement spec · engraving artwork" />
        <div className="grid gap-4 sm:grid-cols-2">
          {FILE_SLOTS.map(({ key, label, accept, hint }) => (
            <UploadSlot
              key={key}
              slotKey={key}
              label={label}
              hint={hint}
              accept={accept}
              url={p.files?.[key] ?? ""}
              isImage={false}
              onUpload={handleUpload}
              onClear={handleClear}
              uploading={uploading.has(key) || !configured}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
