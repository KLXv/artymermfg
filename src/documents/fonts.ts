/**
 * Register the client-facing document fonts once.
 *
 * The dossier and certificate are the only place the serif (Newsreader) and the
 * full type system appear — they are the outward "object," distinct from the
 * inward instrument. Fonts load from the Fontsource CDN (stable, versioned).
 * If a browser is offline the render falls back to the PDF base-14 fonts.
 */
import { Font } from "@react-pdf/renderer";

let registered = false;
let cjkRegistered = false;

const CDN = "https://cdn.jsdelivr.net/fontsource/fonts";
// A full Simplified-Chinese face (Source Han Sans) for the supplier-language
// PDFs. ~16 MB, fetched by the browser on first ZH export, then cached.
const CJK_SRC = "https://cdn.jsdelivr.net/gh/StellarCN/scp_zh/fonts/SourceHanSansSC-Regular.otf";

/** Register the CJK face on demand (only when a Chinese PDF is exported). */
export function registerCjkFont() {
  if (cjkRegistered) return;
  cjkRegistered = true;
  try {
    Font.register({ family: "HanSans", fonts: [{ src: CJK_SRC, fontWeight: 400 }] });
  } catch {
    cjkRegistered = false;
  }
}

export function registerDocumentFonts() {
  if (registered) return;
  registered = true;
  try {
    Font.register({
      family: "Newsreader",
      fonts: [
        { src: `${CDN}/newsreader@latest/latin-400-normal.ttf`, fontWeight: 400 },
        { src: `${CDN}/newsreader@latest/latin-400-italic.ttf`, fontWeight: 400, fontStyle: "italic" },
        { src: `${CDN}/newsreader@latest/latin-600-normal.ttf`, fontWeight: 600 },
      ],
    });
    Font.register({
      family: "Inter",
      fonts: [
        { src: `${CDN}/inter@latest/latin-400-normal.ttf`, fontWeight: 400 },
        { src: `${CDN}/inter@latest/latin-600-normal.ttf`, fontWeight: 600 },
      ],
    });
    Font.register({
      family: "IBMPlexMono",
      fonts: [{ src: `${CDN}/ibm-plex-mono@latest/latin-400-normal.ttf`, fontWeight: 400 }],
    });
    // Don't hyphenate measured values / brand words.
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    registered = false;
  }
}
