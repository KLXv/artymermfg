import { describe, expect, it } from "vitest";
import {
  COMPANION_LINES,
  companionLine,
  deckGreeting,
  deckSubline,
  timeOfDay,
} from "./companion";

const at = (h: number) => new Date(2026, 5, 19, h, 0, 0);

describe("companion greetings", () => {
  it("picks the time-of-day register by hour", () => {
    expect(timeOfDay(at(2))).toBe("Still at the bench");
    expect(timeOfDay(at(9))).toBe("Morning");
    expect(timeOfDay(at(14))).toBe("Afternoon");
    expect(timeOfDay(at(20))).toBe("Evening");
    expect(timeOfDay(at(23))).toBe("Late shift");
  });

  it("addresses the operator by name", () => {
    expect(deckGreeting("Bence", at(9))).toBe("Morning, Bence");
  });

  it("rotates lines deterministically and stays in range", () => {
    expect(companionLine(0)).toBe(COMPANION_LINES[0]);
    expect(companionLine(COMPANION_LINES.length)).toBe(COMPANION_LINES[0]);
    expect(companionLine(-1)).toBe(COMPANION_LINES[COMPANION_LINES.length - 1]);
  });

  it("scales the deck subline to the workload", () => {
    expect(deckSubline(0)).toContain("clear");
    expect(deckSubline(1)).toContain("One thing");
    expect(deckSubline(2)).toContain("2 on the bench");
    expect(deckSubline(9, "Bence")).toContain("Bence");
  });
});
