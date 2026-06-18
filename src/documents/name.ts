/** Filename helpers — no PDF dependency, safe to import anywhere. */
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "artymer";

export const docName = (piece: string, kind: string) => `${slug(piece)}-${kind}`;
