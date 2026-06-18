/**
 * AI prompt builders — ported verbatim from ArtymerCockpit.jsx.
 *
 * These encode hard constraints: the brand voice, and the Private Label rule
 * that the story writer keeps Artymer unnamed (only the unnamed maker), while
 * Commission credits "designed and directed by one person". Kept pure so the
 * exact wording is reviewable and testable.
 */
import { LANG_NAME } from "./i18n";
import { acctName, svcOf } from "./finance";
import type { Account, Project } from "./types";

type AccountMap = Record<string, Account>;

export const storySystemPrompt = (p: Project, accounts: AccountMap): string => {
  const lang = LANG_NAME[p.lang] || "English";
  const pl = svcOf(p, accounts) === "Private label";
  return `You are the brand writer for ${
    pl ? acctName(p, accounts) + ", a brand whose watch was made by Artymer" : "Artymer, a bespoke watch house"
  }. Voice: direct, premium, no filler, confident, quietly ceremonial, never salesy or clichéd. You are writing for a client who is already warm but not yet signed — make the object feel real and worth it. ABSOLUTE RULES: never mention factories, OEM, China, suppliers, tolerances, part numbers, costs, or any production mechanics.${
    pl
      ? " The watch is presented under the client's own brand; Artymer is only the unnamed maker."
      : " Credit the maker as 'designed and directed by one person'."
  } Write 2–3 short paragraphs (~140 words) telling how this organisation's identity became this watch, grounded in the design choices given. No headings, no bullet points. Write entirely in ${lang}, native-quality prose — not a translation.`;
};

export const storyChoices = (p: Project, accounts: AccountMap): string =>
  `Brand: ${acctName(p, accounts)}. Identity to express: ${
    accounts[p.accountId]?.notes || ""
  }. Piece name: ${p.pieceName}. Edition: ${p.edition}. Dial texture: ${p.tex}. Colours: ${p.colors
    .map((c) => c.name)
    .filter(Boolean)
    .join(", ")}. Case: ${p.caseMat}, ${p.caseDia}mm. Movement function: ${p.calFn}. Engraving: ${
    p.engTxt
  } on ${p.engLoc}.`;

export interface AssistantSnapshot {
  activeProjects: number;
  outstanding: number;
  expected30: number;
  leads: number;
  outreachWk: number;
  outreachTarget: number;
  suppliers: number;
  openProject?: { name: string; client: string; stage: string; qty: string; deadline: string; service: string };
}

export const assistantSystemPrompt = (s: AssistantSnapshot): string => {
  const ctx = `Artymer snapshot — active projects: ${s.activeProjects}; receivables outstanding: €${Math.round(
    s.outstanding,
  )}; expected next 30 days: €${Math.round(s.expected30)}; leads: ${s.leads}; outreach this week: ${
    s.outreachWk
  }/${s.outreachTarget}; suppliers: ${s.suppliers}.${
    s.openProject
      ? ` Open project: ${s.openProject.name || "untitled"} for ${s.openProject.client}, stage ${
          s.openProject.stage
        }, qty ${s.openProject.qty}, deadline ${s.openProject.deadline || "—"}, service ${s.openProject.service}.`
      : ""
  }`;
  return `You are the Artymer Cockpit assistant for a solo B2B watch-design founder. He designs every watch and directs a Shenzhen OEM partner — he does NOT hand-assemble; never imply he does. Be direct, expert, concise, no filler. Ground advice in OEM economics, CEE B2B sales, and solo-operator constraints. ${ctx}`;
};
