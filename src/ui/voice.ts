/**
 * Speech-synthesis helpers for the voice co-founder.
 *
 * Browser TTS quality varies wildly: most platforms ship one excellent neural
 * voice (Google/Microsoft Natural/Online, Apple Siri/enhanced) alongside several
 * robotic fallbacks — and often default to a robotic one. We rank the available
 * English voices so the best is chosen automatically, and split speech into
 * sentences (natural cadence + dodges Chrome's long-utterance cut-off).
 */

/** Higher = better. Neural/cloud voices first; penalize compact/eSpeak. */
const QUALITY = [/neural/i, /natural/i, /online/i, /wavenet/i, /premium/i, /enhanced/i, /siri/i, /google/i];
const POOR = /compact|espeak|e-speak|festival|pico|robosoft|microsoft (david|zira|mark)\b/i;

const scoreVoice = (v: SpeechSynthesisVoice): number => {
  let s = 0;
  QUALITY.forEach((re, i) => {
    if (re.test(v.name)) s += (QUALITY.length - i) * 12;
  });
  if (/en-GB/i.test(v.lang)) s += 6;
  else if (/en-AU|en-IE/i.test(v.lang)) s += 5;
  else if (/en-US/i.test(v.lang)) s += 4;
  if (v.localService === false) s += 4; // network voices are usually higher fidelity
  if (POOR.test(v.name)) s -= 80;
  return s;
};

/** English voices, best first. */
export function rankEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = voices.filter((v) => /^en[-_]?/i.test(v.lang));
  return (en.length ? en : voices).slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

/** A short, human label for a voice. */
export function voiceLabel(v: SpeechSynthesisVoice): string {
  const name = v.name.replace(/^(Microsoft|Google)\s+/i, "").replace(/\s*\(.*\)$/, "");
  const region = /en-GB/i.test(v.lang) ? "UK" : /en-US/i.test(v.lang) ? "US" : /en-AU/i.test(v.lang) ? "AU" : v.lang.replace(/^en[-_]?/i, "") || "EN";
  return `${name} · ${region}`;
}

/** Split into sentence-ish chunks for natural delivery and no truncation. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?。！？\n]+[.!?。！？]*/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}
