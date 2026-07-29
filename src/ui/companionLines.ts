/**
 * The workshop companion — Bence's quiet co-pilot.
 *
 * Pure logic for the personal greetings and the little mascot's lines: a
 * subtle, watch-flavoured voice that lives in the cockpit. Nothing here is
 * random in a way that breaks tests — callers pass a seed (or a Date) so the
 * choice is deterministic when it needs to be.
 *
 * Tone: personal but unsentimental, watch-shop dry wit, never implying Bence
 * hand-assembles the watches — he designs and directs the work.
 */

/** The operator this cockpit belongs to. */
export const OPERATOR = "Bence";

/** Time-of-day word, in the workshop's register. */
export function timeOfDay(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Still at the bench";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 22) return "Evening";
  return "Late shift";
}

/** The greeting that heads the deck — "Evening, Bence." */
export function deckGreeting(name: string = OPERATOR, d: Date = new Date()): string {
  return `${timeOfDay(d)}, ${name}`;
}

/**
 * The companion's repertoire — short lines it murmurs from its corner.
 * Watch-flavoured, occasionally a nudge, occasionally just company.
 */
export const COMPANION_LINES: readonly string[] = [
  "One beat at a time, Bence.",
  "A good movement keeps time even when no one is watching.",
  "Tolerances tight, vision wide.",
  "Every piece started as a sketch and a deadline.",
  "The dial is quiet. The work isn't.",
  "Precision is just patience, repeated.",
  "Measure twice, spec once.",
  "Wind the mainspring — the day will run itself.",
  "Your name is on the caseback, Bence. Make it count.",
  "Sapphire scratches less. So does a clear plan.",
  "Six o'clock or midnight, the craft doesn't check the time.",
  "Σ — one operator, one workshop.",
  "Slow is smooth, smooth is on time.",
  "A balance wheel only works because it swings back. So do you.",
  "Today's brief is tomorrow's reference.",
];

/** A line keyed to a seed (turn count, minute, etc.) so it rotates predictably. */
export function companionLine(seed: number): string {
  const i = ((seed % COMPANION_LINES.length) + COMPANION_LINES.length) % COMPANION_LINES.length;
  return COMPANION_LINES[i];
}

/** A context-aware line for the deck, given how much is on the plate. */
export function deckSubline(alerts: number, name: string = OPERATOR): string {
  if (alerts === 0) return `Board's clear, ${name}. Rare and good.`;
  if (alerts === 1) return `One thing wants you, ${name}.`;
  if (alerts <= 3) return `${alerts} on the bench today.`;
  return `${alerts} open — pick the loudest one first, ${name}.`;
}
