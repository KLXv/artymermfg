/**
 * Client-facing i18n for the dossier + certificate — ported verbatim.
 * EN / HU / RO, with language-aware strings. The AI story generator is fed the
 * matching language name (see ai/prompts). Artymer stays unnamed in PL mode at
 * the copy level; that override lives in the dossier/cert components.
 */
import type { Lang } from "./types";

export const LANGS: Lang[] = ["EN", "HU", "RO"];
export const LANG_NAME: Record<Lang, string> = {
  EN: "English",
  HU: "Hungarian",
  RO: "Romanian",
};

export interface I18nStrings {
  bespoke: string;
  forClient: (c: string) => string;
  maker: string;
  storyPlaceholder: string;
  elDial: string;
  elCase: string;
  elBack: string;
  piece: string;
  credit: string;
  certTitle: string;
  createdFor: (c: string) => string;
  issuedTo: (r: string) => string;
  movement: (cal: string, crys: string) => string;
  wr: (w: string) => string;
  guarantee: string;
}

export const I18N: Record<Lang, I18nStrings> = {
  EN: {
    bespoke: "Bespoke edition",
    forClient: (c) => "for " + c,
    maker: "Crafted by Artymer",
    storyPlaceholder:
      "The story of this piece will appear here — write it, or generate it with AI.",
    elDial: "The dial",
    elCase: "The case",
    elBack: "The caseback",
    piece: "The piece",
    credit: "Designed and directed by one person · Artymer",
    certTitle: "Certificate of Authenticity",
    createdFor: (c) => "Created for " + c,
    issuedTo: (r) => "Issued to " + r,
    movement: (cal, crys) => "Movement: " + cal + " · " + crys + " crystal",
    wr: (w) => "Water resistant " + w,
    guarantee: "Guaranteed 12 months against manufacturing defects",
  },
  HU: {
    bespoke: "Egyedi kiadás",
    forClient: (c) => c + " részére",
    maker: "Készítette az Artymer",
    storyPlaceholder: "A darab története ide kerül — írd meg, vagy generáltasd AI-jal.",
    elDial: "A számlap",
    elCase: "A tok",
    elBack: "A hátlap",
    piece: "A darab",
    credit: "Egyetlen ember tervezte és irányította · Artymer",
    certTitle: "Eredetiségi tanúsítvány",
    createdFor: (c) => "Készült " + c + " részére",
    issuedTo: (r) => r + " részére kiállítva",
    movement: (cal, crys) => "Szerkezet: " + cal + " · " + crys + " üveg",
    wr: (w) => "Vízállóság: " + w,
    guarantee: "12 hónap garancia gyártási hibákra",
  },
  RO: {
    bespoke: "Ediție bespoke",
    forClient: (c) => "pentru " + c,
    maker: "Realizat de Artymer",
    storyPlaceholder:
      "Povestea acestei piese va apărea aici — scrie-o sau generează-o cu AI.",
    elDial: "Cadranul",
    elCase: "Carcasa",
    elBack: "Capacul",
    piece: "Piesa",
    credit: "Proiectat și coordonat de o singură persoană · Artymer",
    certTitle: "Certificat de autenticitate",
    createdFor: (c) => "Creat pentru " + c,
    issuedTo: (r) => "Emis pentru " + r,
    movement: (cal, crys) => "Mecanism: " + cal + " · sticlă " + crys,
    wr: (w) => "Rezistent la apă " + w,
    guarantee: "Garanție 12 luni pentru defecte de fabricație",
  },
};
