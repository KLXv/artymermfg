/**
 * Shareable dossier links — no backend required.
 *
 * The dossier's presentation payload is serialized, compressed into a URL-safe
 * base64 string, and carried in the link's hash (so it never touches a server).
 * The public /share page decodes it and renders the dossier in the browser.
 * Honors the Private-Label rule via the `pl` flag baked into the payload.
 */
import type { Account, Company, Lang, Project, ProjectImages } from "@/domain";

export interface SharePayload {
  v: 1;
  pl: boolean;
  client: string;
  piece: string;
  edition: string;
  story: string;
  highlights: string;
  lang: Lang;
  images: ProjectImages;
  colors: { name: string; ref: string }[];
  specs: { caseMat: string; caseDia: string; cal: string; crys: string; wr: string; tex: string };
}

export const buildSharePayload = (p: Project, account: Account | undefined, _company: Company): SharePayload => {
  const pl = (p.servicePath || account?.servicePath) === "Private label";
  return {
    v: 1,
    pl,
    client: account?.name || "",
    piece: p.pieceName || p.name || "",
    edition: p.edition,
    story: p.story,
    highlights: p.highlights,
    lang: p.lang,
    images: p.images,
    colors: p.colors.filter((c) => c.name || c.ref),
    specs: { caseMat: p.caseMat, caseDia: p.caseDia, cal: p.cal, crys: p.crysMat, wr: p.wr, tex: p.tex },
  };
};

// Unicode-safe base64 (handles é, ő, ț, … in the story).
const b64encode = (s: string) => btoa(unescape(encodeURIComponent(s)));
const b64decode = (s: string) => decodeURIComponent(escape(atob(s)));

export const encodeShare = (payload: SharePayload): string => b64encode(JSON.stringify(payload));

export const decodeShare = (raw: string): SharePayload | null => {
  try {
    const obj = JSON.parse(b64decode(raw)) as SharePayload;
    return obj && obj.v === 1 ? obj : null;
  } catch {
    return null;
  }
};

export const buildShareUrl = (payload: SharePayload): string =>
  `${window.location.origin}/share#${encodeShare(payload)}`;
